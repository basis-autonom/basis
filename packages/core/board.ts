/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address } from "./types";
import { parseAbi } from "viem";
import { client, robinhoodChain, V4_STATE_VIEW } from "./chain";
import { fetchRegistry } from "./registry";
import { getRobinhoodPools } from "./pools";
import { getBlockByTimestamp } from "./blocks";
import { getPrices } from "./prices";
import { getFloatGrip } from "./float";


const windowToMs = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const stateViewAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
]);

/** Shorten an address to "0x1234…abcd" display form */
function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export type BoardResult = { kind: "success"; data: any[] } | { kind: "error"; reason: "rpc_unavailable" | "pool_lookup_failed" };

export async function getBoardData(limit = 25): Promise<BoardResult> {
  let allPools, registry;
  try {
    [allPools, registry] = await Promise.all([
      getRobinhoodPools(100),
      fetchRegistry(),
    ]);
  } catch (error) {
    return { kind: "error", reason: "pool_lookup_failed" };
  }

  const stockMap = new Map(registry.map((s) => [s.address.toLowerCase(), s]));
  const now = Date.now();
  const windowMs7d = windowToMs["7d"];
  const windowMs24h = windowToMs["24h"];
  const targetTs24h = now - windowMs24h;
  const targetTs7d = now - windowMs7d;

const EXCLUDED_SYMBOLS = new Set([
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
  "BTC",
  "WBTC",
  "GLD",
]);

const EXCLUDED_ADDRS = new Set([
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168", // USDG
  "0x0000000000000000000000000000000000000000", // ETH
]);

  // ── 1. Dedup: keep only the deepest pool per MEME token (§5.6) ───────────
  const deepestByMeme = new Map<
    string,
    { pool: (typeof allPools)[0]; stockAddr: string; memeAddr: string }
  >();

  for (const p of allPools) {
    const t0 = p.token0.toLowerCase();
    const t1 = p.token1.toLowerCase();
    const stockAddr = stockMap.has(t0) ? t0 : stockMap.has(t1) ? t1 : null;
    if (!stockAddr) continue;
    const memeAddr = stockAddr === t0 ? t1 : t0;

    // Filter out if memeAddr is in stockMap (i.e. stock-stock pool like SPY/SLV, GLD/SLV)
    if (stockMap.has(memeAddr)) continue;
    if (EXCLUDED_ADDRS.has(memeAddr)) continue;

    const memeSym = (stockAddr === t0 ? p.quoteSymbol : p.baseSymbol)?.toUpperCase()?.trim();
    if (memeSym && EXCLUDED_SYMBOLS.has(memeSym)) continue;
    if (registry.some((s) => s.symbol.toUpperCase() === memeSym)) continue;

    const existing = deepestByMeme.get(memeAddr);
    if (!existing || (p.liquidityUsd || 0) > (existing.pool.liquidityUsd || 0)) {
      deepestByMeme.set(memeAddr, { pool: p, stockAddr, memeAddr });
    }
  }

  // Sort by liquidity USD descending
  const selected = Array.from(deepestByMeme.values())
    .sort((a, b) => (b.pool.liquidityUsd || 0) - (a.pool.liquidityUsd || 0))
    .slice(0, limit);

  if (selected.length === 0) return [];

  // ── 2. Block numbers for time windows ────────────────────────────────────
  let block24h: bigint | undefined;
  let block7d: bigint | undefined;
  try {
    [block24h, block7d] = await Promise.all([
      getBlockByTimestamp(targetTs24h),
      getBlockByTimestamp(targetTs7d),
    ]);
  } catch {
    // ignore
  }

  // ── 3. Current slot0 for all selected pools via multicall ────────────────
  const poolCalls = selected.map((s) => ({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: "getSlot0" as const,
    args: [s.pool.address as `0x${string}`],
  }));

  const resNow = await client.multicall({ contracts: poolCalls });

  // Historical slot0 calls with try/catch to handle public RPC limitations
  let res24h: any[] = [];
  if (block24h) {
    try {
      res24h = await client.multicall({
        contracts: poolCalls,
        blockNumber: block24h,
      });
    } catch {
      res24h = selected.map(() => ({ status: "failure" }));
    }
  } else {
    res24h = selected.map(() => ({ status: "failure" }));
  }

  let res7d: any[] = [];
  if (block7d) {
    try {
      res7d = await client.multicall({
        contracts: poolCalls,
        blockNumber: block7d,
      });
    } catch {
      res7d = selected.map(() => ({ status: "failure" }));
    }
  } else {
    res7d = selected.map(() => ({ status: "failure" }));
  }

  // ── 4. Token metadata (name, symbol, decimals) via multicall ─────────────
  const uniqueTokenAddrs = Array.from(
    new Set(
      selected.flatMap((s) => [
        s.pool.token0.toLowerCase(),
        s.pool.token1.toLowerCase(),
      ])
    )
  );

  const nonZeroTokens = uniqueTokenAddrs.filter(
    (addr) => addr !== "0x0000000000000000000000000000000000000000"
  );

  const metaCalls = nonZeroTokens.flatMap((addr) => [
    { address: addr as Address, abi: erc20Abi, functionName: "name" as const },
    { address: addr as Address, abi: erc20Abi, functionName: "symbol" as const },
    { address: addr as Address, abi: erc20Abi, functionName: "decimals" as const },
  ]);

  const metaRes = await client.multicall({ contracts: metaCalls });

  const tokenMeta = new Map<
    string,
    { name: string; symbol: string; decimals: number }
  >();

  // Native ETH constant
  tokenMeta.set("0x0000000000000000000000000000000000000000", {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  });

  for (let i = 0; i < nonZeroTokens.length; i++) {
    const addr = nonZeroTokens[i];
    const base = i * 3;
    const rawName =
      metaRes[base].status === "success" ? (metaRes[base].result as string) : null;
    const rawSymbol =
      metaRes[base + 1].status === "success"
        ? (metaRes[base + 1].result as string)
        : null;
    const decimals =
      metaRes[base + 2].status === "success"
        ? Number(metaRes[base + 2].result as unknown as number)
        : 18;

    const symbol = rawSymbol?.trim() || shortAddr(addr);
    const name = rawName?.trim() || symbol;

    tokenMeta.set(addr, { name, symbol, decimals });
  }

  // ── 5. Stock prices from Chainlink ───────────────────────────────────────
  const uniqueStockAddrs = Array.from(new Set(selected.map((s) => s.stockAddr)));
  const stockPrices = new Map<string, any>();

  for (const addr of uniqueStockAddrs) {
    const stock = stockMap.get(addr);
    if (stock?.feed) {
      try {
        const [p24h, p7d] = await Promise.all([
          getPrices(stock.feed, targetTs24h),
          getPrices(stock.feed, targetTs7d),
        ]);
        stockPrices.set(addr, {
          latest: p24h.latestPrice,
          latestUpdatedAt: p24h.latestUpdatedAt,
          old24h: p24h.oldPrice,
          old7d: p7d.oldPrice,
          stock,
        });
      } catch {
        // Feed failed or rate limit
      }
    }
  }

  // ── 6. Build rows ─────────────────────────────────────────────────────────
  const rows: any[] = [];

  for (let i = 0; i < selected.length; i++) {
    const { pool, stockAddr, memeAddr } = selected[i];
    const stock = stockMap.get(stockAddr);
    const memeMeta = tokenMeta.get(memeAddr);
    const stockMeta = tokenMeta.get(stockAddr);

    const coinSymbol = memeMeta?.symbol || shortAddr(memeAddr);
    const coinName = memeMeta?.name || coinSymbol;
    const quoteSymbol = stockMeta?.symbol || stock?.symbol || shortAddr(stockAddr);

    // Slot0 check
    if (resNow[i].status !== "success") continue;
    const slot0Now = resNow[i].result as any;
    if (!slot0Now || !slot0Now[0] || slot0Now[0] === BigInt(0)) continue;

    // Uniswap v4 invariant currency ordering: currency0 < currency1
    const t0 = pool.token0.toLowerCase();
    const t1 = pool.token1.toLowerCase();
    const [c0, c1] = t0 < t1 ? [t0, t1] : [t1, t0];
    const dec0 = tokenMeta.get(c0)?.decimals ?? 18;
    const dec1 = tokenMeta.get(c1)?.decimals ?? 18;

    // Helper: compute pool_ratio (stock units per 1 meme unit)
    const getRatio = (sqrtPrice: bigint): number | null => {
      if (!sqrtPrice || sqrtPrice === BigInt(0)) return null;
      const raw = (Number(sqrtPrice) / 2 ** 96) ** 2;
      const real_c1_per_c0 = raw * Math.pow(10, dec0 - dec1);
      if (!isFinite(real_c1_per_c0) || real_c1_per_c0 <= 0) return null;
      // If stock is currency1, real_c1_per_c0 is stock per meme
      // If stock is currency0, real_c1_per_c0 is meme per stock, so 1 / real_c1_per_c0 is stock per meme
      return stockAddr === c1 ? real_c1_per_c0 : 1 / real_c1_per_c0;
    };

    const ratioNow = getRatio(slot0Now[0]);
    if (ratioNow == null) continue;

    // Prices from Chainlink
    const prices = stockPrices.get(stockAddr);
    const priceUsd = prices && ratioNow > 0 ? ratioNow * prices.latest : null;

    // ── 24h change ──
    let chg24h: number | null = null;
    let meme24h: number | null = null;
    let stock24h: number | null = null;
    if (prices && res24h[i]?.status === "success") {
      const slot024h = res24h[i].result as any;
      if (slot024h && slot024h[0] && slot024h[0] !== BigInt(0)) {
        const ratio24h = getRatio(slot024h[0]);
        if (ratio24h != null && ratio24h > 0) {
          meme24h = ratioNow / ratio24h - 1;
          stock24h = prices.latest / prices.old24h - 1;
          chg24h = ((1 + meme24h) * (1 + stock24h) - 1) * 100;
        }
      }
    }

    // ── 7d components — check pool age and clamping ──
    let meme7d: number | null = null;
    let stock7d: number | null = null;
    let memeRatioPct: number | null = null;

    const poolCreatedAt = pool.createdAt || 0;
    const poolAgeMs = now - poolCreatedAt;
    const clamped = poolAgeMs < windowMs7d;
    const windowLabel = clamped
      ? `since launch, ${Math.max(0, Math.floor(poolAgeMs / 86400000))}d`
      : "7d";

    let slotHist: any = null;
    if (clamped && poolCreatedAt > 0) {
      try {
        const blockLaunch = await getBlockByTimestamp(poolCreatedAt + 60_000);
        const resLaunch = await client.readContract({
          address: V4_STATE_VIEW as Address,
          abi: stateViewAbi,
          functionName: "getSlot0",
          args: [pool.address as `0x${string}`],
          blockNumber: blockLaunch,
        });
        slotHist = resLaunch;
      } catch {
        // Launch block state not available
      }
    } else if (res7d[i]?.status === "success") {
      slotHist = res7d[i].result;
    }

    if (slotHist && slotHist[0] && slotHist[0] !== BigInt(0)) {
      const ratioHist = getRatio(slotHist[0]);
      if (ratioHist != null && ratioHist > 0) {
        meme7d = (ratioNow / ratioHist - 1) * 100;

        if (prices && prices.old7d > 0) {
          stock7d = (prices.latest / prices.old7d - 1) * 100;
          const absMeme = Math.abs(meme7d);
          const absStock = Math.abs(stock7d);
          const absTotal = absMeme + absStock;
          memeRatioPct = absTotal === 0 ? 50 : (absMeme / absTotal) * 100;
        }
      }
    }
    // If slotHist is missing or 0, meme7d remains null (no -100%)

    // ── Float grip ──
    let grip: number | null = null;
    if (stock) {
      try {
        const gripData = await getFloatGrip(stock, pool.address as Address);
        grip = gripData.gripPct;
      } catch {
        // ignore
      }
    }

    rows.push({
      ca: memeAddr as Address, // Memecoin token contract address for /c/[ca]
      poolId: pool.address,
      coin: coinSymbol,
      coinName,
      quote: quoteSymbol,
      poolRatio: ratioNow,
      stockPrice: prices?.latest ?? null,
      stockPrice7d: prices?.old7d ?? null,
      stockFeedUpdatedAt: prices?.latestUpdatedAt ?? null,
      priceUsd,
      chg24h,
      meme24h: meme24h == null ? null : meme24h * 100,
      stock24h: stock24h == null ? null : stock24h * 100,
      memeRatioPct,
      meme7d,
      stock7d,
      clamped,
      windowLabel,
      grip,
      liquidity: pool.liquidityUsd ?? null,
      vol24h: pool.vol24hUsd ?? null,
      lpBurned: pool.lpBurned,
    });
  }

  if (selected.length > 0 && rows.length === 0) {
    return { kind: "error", reason: "rpc_unavailable" };
  }
  return { kind: "success", data: rows };
}
