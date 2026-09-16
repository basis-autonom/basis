/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, SplitResponse, Window } from "./types";
import { createPublicClient, http, parseAbi, erc20Abi } from "viem";
import { robinhoodChain, V4_STATE_VIEW } from "./chain";
import { getStockTokenByAddress } from "./registry";
import { getPoolForToken } from "./pools";
import { getBlockByTimestamp } from "./blocks";
import { getPrices } from "./prices";
import { getFloatGrip } from "./float";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const windowToMs: Record<Window, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function computeSplit(
  tokenAddress: Address,
  window: Window,
): Promise<SplitResponse> {
  // 1. Fetch Pool
  const pool = await getPoolForToken(tokenAddress);
  if (!pool) {
    return { kind: "no_pool" };
  }

  // 2. Fetch Stock Token
  const stockTokenAddr = (
    pool.stockSide === 0 ? pool.token0 : pool.token1
  ).toLowerCase() as Address;
  const memeTokenAddr = (
    pool.stockSide === 0 ? pool.token1 : pool.token0
  ).toLowerCase() as Address;

  const stockToken = await getStockTokenByAddress(stockTokenAddr);
  if (!stockToken) {
    return { kind: "unknown_token" };
  }

  if (!stockToken.feed) {
    return { kind: "no_feed" };
  }

  // Read metadata for tokens (name, symbol, decimals)
  const metaCalls = [
    { address: memeTokenAddr, abi: erc20Abi, functionName: "name" as const },
    { address: memeTokenAddr, abi: erc20Abi, functionName: "symbol" as const },
    {
      address: memeTokenAddr,
      abi: erc20Abi,
      functionName: "decimals" as const,
    },
    {
      address: stockTokenAddr,
      abi: erc20Abi,
      functionName: "decimals" as const,
    },
  ];

  let coinName = shortAddr(memeTokenAddr);
  let coinSymbol = shortAddr(memeTokenAddr);
  let memeDecimals = 18;
  let stockDecimals = 18;

  try {
    const metaResults = await client.multicall({ contracts: metaCalls });
    if (metaResults[0]?.status === "success" && metaResults[0].result) {
      coinName = String(metaResults[0].result).trim() || coinName;
    }
    if (metaResults[1]?.status === "success" && metaResults[1].result) {
      coinSymbol = String(metaResults[1].result).trim() || coinSymbol;
    }
    if (
      metaResults[2]?.status === "success" &&
      typeof metaResults[2].result === "number"
    ) {
      memeDecimals = metaResults[2].result;
    }
    if (
      metaResults[3]?.status === "success" &&
      typeof metaResults[3].result === "number"
    ) {
      stockDecimals = metaResults[3].result;
    }
  } catch (e) {
    console.error("Error reading token metadata:", e);
  }

  // 3. Time windows
  const now = Date.now();
  const windowMs = windowToMs[window];
  const targetTs = now - windowMs;
  const oldBlock = await getBlockByTimestamp(targetTs);

  // 4. Get Pool Ratio via StateView
  const stateViewAbi = parseAbi([
    "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  ]);

  let slot0Now: any = null;
  let slot0Old: any = null;

  try {
    slot0Now = await client.readContract({
      address: V4_STATE_VIEW as Address,
      abi: stateViewAbi,
      functionName: "getSlot0",
      args: [pool.address],
    });
  } catch (e) {
    console.error("Error fetching slot0Now:", e);
  }

  try {
    slot0Old = await client.readContract({
      address: V4_STATE_VIEW as Address,
      abi: stateViewAbi,
      functionName: "getSlot0",
      args: [pool.address],
      blockNumber: oldBlock,
    });
  } catch (e) {
    console.error("Error fetching slot0Old:", e);
  }

  // Uniswap v4 invariant currency ordering: currency0 < currency1
  const t0 = pool.token0.toLowerCase();
  const t1 = pool.token1.toLowerCase();
  const [c0, c1] = t0 < t1 ? [t0, t1] : [t1, t0];
  const dec0 = c0 === stockTokenAddr ? stockDecimals : memeDecimals;
  const dec1 = c1 === stockTokenAddr ? stockDecimals : memeDecimals;

  const getRatio = (sqrtPrice: bigint | undefined): number | null => {
    if (!sqrtPrice || sqrtPrice === BigInt(0)) return null;
    const raw = (Number(sqrtPrice) / 2 ** 96) ** 2;
    const real_c1_per_c0 = raw * Math.pow(10, dec0 - dec1);
    if (!isFinite(real_c1_per_c0) || real_c1_per_c0 <= 0) return null;
    return stockTokenAddr === c1 ? real_c1_per_c0 : 1 / real_c1_per_c0;
  };

  const poolRatioNow = slot0Now ? getRatio(slot0Now[0]) : null;
  const poolRatioOld = slot0Old ? getRatio(slot0Old[0]) : null;

  let memeComponent: number | null = null;
  if (poolRatioNow != null && poolRatioOld != null && poolRatioOld > 0) {
    memeComponent = poolRatioNow / poolRatioOld - 1;
  }

  // 5. Get Chainlink prices (getPrices returns values already divided by 1e8)
  const { latestPrice, oldPrice } = await getPrices(stockToken.feed, targetTs);

  // Rule: If stock price is 0 or unreadable, stockComponent must be null, not 0 or negative
  let stockComponent: number | null = null;
  const validStockNow =
    latestPrice > 0 && isFinite(latestPrice) ? latestPrice : null;
  const validStockOld = oldPrice > 0 && isFinite(oldPrice) ? oldPrice : null;

  if (validStockNow !== null && validStockOld !== null) {
    stockComponent = validStockNow / validStockOld - 1;
  }

  // 6. Total Attribution
  let total: number | null = null;
  if (memeComponent !== null && stockComponent !== null) {
    total = (1 + memeComponent) * (1 + stockComponent) - 1;
  }

  // 7. Float Grip
  const grip = await getFloatGrip(stockToken, pool.address);

  // 8. Price in USD
  const priceUsd =
    validStockNow !== null && poolRatioNow !== null && poolRatioNow > 0
      ? poolRatioNow * validStockNow
      : null;

  return {
    kind: "success",
    data: {
      coinSymbol,
      coinName,
      stock: stockToken,
      pool,
      window,
      priceUsd,
      prices: {
        stockNow: validStockNow,
        stockOld: validStockOld,
        poolRatioNow,
        poolRatioOld,
      },
      attribution: {
        stockComponent,
        memeComponent,
        total,
      },
      grip,
    },
  };
}
