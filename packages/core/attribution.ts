/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, SplitResponse, Window } from "./types";
import { createPublicClient, http, parseAbi, erc20Abi } from "viem";
import { unstable_cache } from "next/cache";
import { robinhoodChain, V4_STATE_VIEW } from "./chain";
import { getStockTokenByAddress } from "./registry";
import { getPoolForToken } from "./pools";
import { getBoardData } from "./board";
import { getBlockByTimestamp } from "./blocks";
import { getPrices } from "./prices";
import { getReportSnapshot, makeFloatGrip, type ReportSnapshot } from "./float";

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

const CASH_QUOTE_SYMBOLS = new Set([
  "USDG",
  "USDC",
  "USDT",
  "DAI",
  "USDS",
  "PYUSD",
  "BUSD",
  "TUSD",
  "FRAX",
  "FDUSD",
  "EURC",
  "EURT",
  "ETH",
  "WETH",
]);

const CASH_QUOTE_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168", // USDG
]);

async function readQuoteSymbol(address: Address) {
  try {
    const symbol = await client.readContract({
      address,
      abi: erc20Abi,
      functionName: "symbol",
    });
    return typeof symbol === "string" && symbol.trim()
      ? symbol.trim().toUpperCase()
      : shortAddr(address);
  } catch {
    return shortAddr(address);
  }
}

async function getStockPairSuggestions() {
  try {
    const rows = await getBoardData(3);
    return rows
      .filter(
        (row) =>
          typeof row.ca === "string" &&
          typeof row.coin === "string" &&
          typeof row.quote === "string",
      )
      .slice(0, 3)
      .map((row) => ({
        tokenAddress: row.ca as Address,
        coinSymbol: row.coin as string,
        stockPair: row.quote as string,
      }));
  } catch (error) {
    console.error("Error reading stock-paired suggestions:", error);
    return [];
  }
}

async function computeSplitUncached(
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
    const quoteAddress = stockTokenAddr;
    const quoteSymbol = await readQuoteSymbol(quoteAddress);
    const isCashQuote =
      CASH_QUOTE_ADDRESSES.has(quoteAddress) ||
      CASH_QUOTE_SYMBOLS.has(quoteSymbol);

    if (isCashQuote) {
      return {
        kind: "no_stock_leg",
        quoteSymbol,
        suggestions: await getStockPairSuggestions(),
      };
    }

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
  const requestedTargetTs = now - windowMs;
  const poolCreatedAt = pool.createdAt;
  const clamped =
    poolCreatedAt != null &&
    poolCreatedAt > requestedTargetTs &&
    poolCreatedAt <= now;
  const targetTs = clamped && poolCreatedAt != null ? poolCreatedAt : requestedTargetTs;
  const windowLabel = clamped
    ? `since launch, ${Math.max(0, Math.floor((now - targetTs) / 86400000))}d`
    : window;
  const oldBlock = await getBlockByTimestamp(targetTs);

  // 4. Read the current report state in one multicall. The historical reads
  // below are necessarily separate because they use a prior block/round.
  const stateViewAbi = parseAbi([
    "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  ]);

  const emptySnapshot: ReportSnapshot = {
    lockedRaw: null,
    totalRaw: null,
    multiplierRaw: null,
    latestRoundData: null,
    slot0: null,
  };
  let reportSnapshot = emptySnapshot;
  try {
    reportSnapshot = await getReportSnapshot(stockToken, pool.address);
  } catch (e) {
    console.error("Error fetching current report snapshot:", e);
  }

  const slot0Now = reportSnapshot.slot0;
  let slot0Old: any = null;

  try {
    const [oldSlotResult] = await client.multicall({
      contracts: [{
        address: V4_STATE_VIEW as Address,
        abi: stateViewAbi,
        functionName: "getSlot0" as const,
        args: [pool.address],
      }],
      blockNumber: oldBlock,
    });
    if (oldSlotResult?.status === "success") slot0Old = oldSlotResult.result;
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

  // 5. Get Chainlink prices (getPrices returns values already divided by 1e8).
  // The latest round came from the report multicall, so this only looks up history.
  const { latestPrice, oldPrice } = await getPrices(
    stockToken.feed,
    targetTs,
    reportSnapshot.latestRoundData ?? undefined,
  );

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

  let beta: number | null = null;
  if (total !== null && total !== 0 && stockComponent !== null) {
    beta = stockComponent / total;
  }

  // 7. Float grip and current corporate-action multiplier come from the same
  // report snapshot. A failed read remains null; it is never converted to 0.
  const reportMultiplier =
    reportSnapshot.multiplierRaw === null
      ? stockToken.multiplier
      : Number(reportSnapshot.multiplierRaw) / 1e18;
  const reportStock = { ...stockToken, multiplier: reportMultiplier };
  const grip = makeFloatGrip(
    reportStock,
    pool.address,
    reportSnapshot.lockedRaw,
    reportSnapshot.totalRaw,
  );

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
      stock: reportStock,
      pool,
      window,
      clamped,
      windowLabel,
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
        beta,
      },
      grip,
    },
  };
}

export const computeSplit = unstable_cache(
  async (tokenAddress: Address, window: Window) =>
    computeSplitUncached(tokenAddress, window),
  ["report-split-v2"],
  { revalidate: 60 },
);
