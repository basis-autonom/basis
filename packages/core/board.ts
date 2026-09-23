/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address } from "./types";
import { parseAbi } from "viem";
import { client, V4_STATE_VIEW, V4_POOL_MANAGER } from "./chain";
import { fetchRegistry } from "./registry";
import { getRobinhoodPools } from "./pools";
import { getPrices } from "./prices";
import { getBaselineSnapshots, getEarliestSnapshots } from "../db/snapshots";

// Max drift for board historical snapshots
const DRIFT_24H_MS = 2 * 60 * 60 * 1000;  // 2 hours
const DRIFT_7D_MS  = 4 * 60 * 60 * 1000;  // 4 hours


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

const gripAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
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

  if (selected.length === 0) return { kind: "success", data: [] };

  // ── 2. DB snapshot baselines for 24h and 7d (bulk fetch, single round-trip each) ──
  const allPoolAddresses = selected.map((s) => s.pool.address);

  let snapshots24hMap = new Map<string, any>();
  let snapshots7dMap = new Map<string, any>();
  try {
    const rows24h = await getBaselineSnapshots(
      allPoolAddresses,
      new Date(targetTs24h),
      DRIFT_24H_MS,
    );
    for (const row of rows24h) {
      snapshots24hMap.set(row.pool_address.toLowerCase(), row);
    }
  } catch {
    // Stays empty; chg24h will be null for all rows
  }
  try {
    const rows7d = await getBaselineSnapshots(
      allPoolAddresses,
      new Date(targetTs7d),
      DRIFT_7D_MS,
    );
    for (const row of rows7d) {
      snapshots7dMap.set(row.pool_address.toLowerCase(), row);
    }
  } catch {
    // Stays empty; meme7d will be null for all rows
  }

  // ── 3. Current slot0 for all selected pools via multicall ────────────────
  const poolCalls = selected.map((s) => ({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: "getSlot0" as const,
    args: [s.pool.address as `0x${string}`],
  }));

  const resNow = await client.multicall({ contracts: poolCalls });

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

  await Promise.all(
    uniqueStockAddrs.map(async (addr) => {
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
    })
  );

  // ── 6. Float grip for all unique stock tokens in ONE multicall ───────────
  const gripCalls = uniqueStockAddrs.flatMap((addr) => [
    {
      address: addr as Address,
      abi: gripAbi,
      functionName: "balanceOf" as const,
      args: [V4_POOL_MANAGER as Address],
    },
    {
      address: addr as Address,
      abi: gripAbi,
      functionName: "totalSupply" as const,
    },
  ]);

  const gripRes = await client.multicall({ contracts: gripCalls });
  const stockGripMap = new Map<string, number | null>();
  for (let i = 0; i < uniqueStockAddrs.length; i++) {
    const addr = uniqueStockAddrs[i];
    const locked =
      gripRes[i * 2]?.status === "success"
        ? (gripRes[i * 2].result as bigint)
        : null;
    const total =
      gripRes[i * 2 + 1]?.status === "success"
        ? (gripRes[i * 2 + 1].result as bigint)
        : null;
    const gripPct =
      locked !== null && total !== null && total > BigInt(0)
        ? (Number(locked) / Number(total)) * 100
        : null;
    stockGripMap.set(addr, gripPct);
  }

  // ── 7. Bulk fetch earliest snapshots for clamped pools in ONE query ─────
  const clampedPoolAddrs = selected
    .filter(
      (s) =>
        now - (s.pool.createdAt || 0) < windowMs7d &&
        (s.pool.createdAt || 0) > 0,
    )
    .map((s) => s.pool.address);

  const earliestSnapshotsMap = new Map<string, any>();
  if (clampedPoolAddrs.length > 0) {
    try {
      const earliestRows = await getEarliestSnapshots(clampedPoolAddrs);
      for (const row of earliestRows) {
        earliestSnapshotsMap.set(row.pool_address.toLowerCase(), row);
      }
    } catch {
      // ignore
    }
  }

  // ── 8. Build rows (100% in-memory computation) ─────────────────────────
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

    // ── 24h change (from DB snapshot map) ──
    let chg24h: number | null = null;
    let meme24h: number | null = null;
    let stock24h: number | null = null;
    const snap24h = snapshots24hMap.get(pool.address.toLowerCase());
    if (prices && snap24h) {
      const sqrtPrice24h = BigInt(snap24h.sqrt_price_x96);
      if (sqrtPrice24h && sqrtPrice24h !== BigInt(0)) {
        const ratio24h = getRatio(sqrtPrice24h);
        if (ratio24h != null && ratio24h > 0 && prices.old24h > 0) {
          meme24h = ratioNow / ratio24h - 1;
          stock24h = prices.latest / prices.old24h - 1;
          chg24h = ((1 + meme24h) * (1 + stock24h) - 1) * 100;
        }
      }
    }

    // ── 7d components (from DB snapshot map) ──
    let meme7d: number | null = null;
    let stock7d: number | null = null;
    let memeRatioPct: number | null = null;

    const poolCreatedAt = pool.createdAt || 0;
    const poolAgeMs = now - poolCreatedAt;
    const clamped = poolAgeMs < windowMs7d;
    const windowLabel = clamped
      ? `since launch, ${Math.max(0, Math.floor(poolAgeMs / 86400000))}d`
      : "7d";

    // For clamped pools (< 7d old), use the earliest snapshot ever recorded
    // as the launch baseline. For older pools, use the 7d snapshot map.
    let slotHistSqrt: bigint | null = null;
    if (clamped && poolCreatedAt > 0) {
      const earliest = earliestSnapshotsMap.get(pool.address.toLowerCase());
      if (earliest) slotHistSqrt = BigInt(earliest.sqrt_price_x96);
    } else {
      const snap7d = snapshots7dMap.get(pool.address.toLowerCase());
      if (snap7d) slotHistSqrt = BigInt(snap7d.sqrt_price_x96);
    }

    if (slotHistSqrt && slotHistSqrt !== BigInt(0)) {
      const ratioHist = getRatio(slotHistSqrt);
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
    // If slotHistSqrt is null, meme7d remains null (displayed as —)

    // ── Float grip ──
    const grip = stockGripMap.get(stockAddr) ?? null;

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
