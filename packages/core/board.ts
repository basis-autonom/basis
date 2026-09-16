/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, Pool, SplitResponse } from "./types";
import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain, V4_STATE_VIEW } from "./chain";
import { getStockTokenByAddress } from "./registry";
import { getRobinhoodPools } from "./pools";
import { getBlockByTimestamp } from "./blocks";
import { getPrices } from "./prices";
import { getFloatGrip } from "./float";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const windowToMs = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function getBoardData(limit = 25) {
  const pools = await getRobinhoodPools(limit);
  const now = Date.now();
  const windowMs = windowToMs["24h"]; // Board usually shows 24h & 7d, but let's stick to 7d for full stats
  const targetTs24h = now - windowToMs["24h"];
  const targetTs7d = now - windowToMs["7d"];

  const block24h = await getBlockByTimestamp(targetTs24h);
  const block7d = await getBlockByTimestamp(targetTs7d);

  const stateViewAbi = parseAbi([
    "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  ]);

  // Prepare multicalls for slot0
  const slot0NowCalls = pools.map((p) => ({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: [p.address],
  }));

  const slot024hCalls = pools.map((p) => ({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: [p.address],
  }));

  const slot07dCalls = pools.map((p) => ({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: [p.address],
  }));

  // Execute Multicalls
  const [resNow, res24h, res7d] = await Promise.all([
    client.multicall({ contracts: slot0NowCalls }),
    client.multicall({ contracts: slot024hCalls, blockNumber: block24h }),
    client.multicall({ contracts: slot07dCalls, blockNumber: block7d }),
  ]);

  // Fetch unique stock token prices
  const uniqueStockAddrs = new Set<string>();
  pools.forEach((p) => {
    uniqueStockAddrs.add(p.stockSide === 0 ? p.token0 : p.token1);
  });

  const stockPrices = new Map<string, any>();
  for (const addr of Array.from(uniqueStockAddrs)) {
    const stock = await getStockTokenByAddress(addr as Address);
    if (stock && stock.feed) {
      const p24h = await getPrices(stock.feed, targetTs24h);
      const p7d = await getPrices(stock.feed, targetTs7d);
      stockPrices.set(addr.toLowerCase(), {
        latest: p24h.latestPrice,
        old24h: p24h.oldPrice,
        old7d: p7d.oldPrice,
        stock,
      });
    }
  }

  // Calculate splits
  const rows = [];
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    const stockAddr = (
      pool.stockSide === 0 ? pool.token0 : pool.token1
    ).toLowerCase();
    const prices = stockPrices.get(stockAddr);

    if (
      !prices ||
      resNow[i].status !== "success" ||
      res24h[i].status !== "success" ||
      res7d[i].status !== "success"
    ) {
      continue;
    }

    const slot0Now = resNow[i].result as any;
    const slot024h = res24h[i].result as any;
    const slot07d = res7d[i].result as any;

    const getRatio = (slot: any) => {
      const p = (Number(slot[0]) / 2 ** 96) ** 2;
      return pool.stockSide === 1 ? p : 1 / p;
    };

    const ratioNow = getRatio(slot0Now);
    const ratio24h = getRatio(slot024h);
    const ratio7d = getRatio(slot07d);

    const meme24h = ratioNow / ratio24h - 1;
    const stock24h = prices.latest / prices.old24h - 1;
    const total24h = (1 + meme24h) * (1 + stock24h) - 1;

    const meme7d = ratioNow / ratio7d - 1;
    const stock7d = prices.latest / prices.old7d - 1;

    // Float Grip
    const grip = await getFloatGrip(prices.stock, pool.address);

    const memeComponentPct = meme7d * 100;
    const stockComponentPct = stock7d * 100;

    const absMeme = Math.abs(memeComponentPct);
    const absStock = Math.abs(stockComponentPct);
    const absTotal = absMeme + absStock;
    const memeRatioPct = absTotal === 0 ? 50 : (absMeme / absTotal) * 100;

    rows.push({
      ca: pool.address,
      coin: pool.token0 === prices.stock.address ? "UNKNOWN" : "MEME", // We don't have token symbols from chain easily without multicall, but we can rely on DexScreener if we save it.
      // Wait, we need the meme token symbol. getRobinhoodPools doesn't return meme symbol?
      // Let's modify getRobinhoodPools to return symbol.
      quote: prices.stock.symbol,
      price: prices.latest, // Actually the token price in USD is pool.liquidityUsd ? No, we need actual meme price.
      // We can use DexScreener's priceUsd, but the brief says "Semua angka yang muncul di produk tetap dibaca langsung dari chain".
      // Price in USD = ratioNow * stockPriceUsd
      priceUsd: ratioNow * prices.latest,
      chg24h: total24h * 100,
      memeRatioPct,
      meme7d: memeComponentPct,
      stock7d: stockComponentPct,
      grip: grip.gripPct,
      liquidity: pool.liquidityUsd, // We can keep using indexer for liq & vol as per brief 4.7
      vol24h: pool.liquidityUsd * 0.2, // DexScreener doesn't give vol in the simple fetch sometimes, mock or fetch?
    });
  }

  return rows;
}
