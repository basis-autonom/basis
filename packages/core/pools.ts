/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, Pool } from "./types";
import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain, V4_STATE_VIEW } from "./chain";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const cache = new Map<string, { pool: Pool | null; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins
const GECKO_NETWORK = "robinhood";
const GECKO_ACCEPT = "application/json;version=20230203";

type IndexedPool = Pool & {
  baseSymbol?: string;
  quoteSymbol?: string;
  vol24hUsd?: number;
};

let directoryCache: { pools: IndexedPool[]; timestamp: number } | null = null;

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchGeckoPools(registry: Array<{ address: Address }>): Promise<IndexedPool[]> {
  try {
    // GeckoTerminal's public endpoint returns 20 pools per page. Five pages
    // gives the directory a bounded top-100 view while staying below its
    // approximate public rate limit. DexScreener remains the primary source
    // when both indexers report the same pool.
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(async (page) => {
        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools?page=${page}`,
          { headers: { Accept: GECKO_ACCEPT } },
        );
        if (!response.ok) return [];
        const body = await response.json() as { data?: any[] };
        return body.data ?? [];
      }),
    );

    const stockAddresses = new Set(registry.map((token) => token.address.toLowerCase()));
    const pools: IndexedPool[] = [];

    for (const record of pages.flat()) {
      const attributes = record?.attributes;
      const relationships = record?.relationships;
      const dexId = relationships?.dex?.data?.id;
      const baseAddress = relationships?.base_token?.data?.id?.split("_").pop()?.toLowerCase();
      const quoteAddress = relationships?.quote_token?.data?.id?.split("_").pop()?.toLowerCase();
      const address = attributes?.address?.toLowerCase();

      if (
        dexId !== "uniswap-v4-robinhood" ||
        typeof address !== "string" ||
        address.length !== 66 ||
        typeof baseAddress !== "string" ||
        typeof quoteAddress !== "string" ||
        !stockAddresses.has(baseAddress) && !stockAddresses.has(quoteAddress)
      ) {
        continue;
      }

      const createdAt = typeof attributes.pool_created_at === "string"
        ? Date.parse(attributes.pool_created_at)
        : NaN;
      const reserveUsd = finiteNumber(attributes.reserve_in_usd);
      const volume24h = finiteNumber(attributes.volume_usd?.h24);
      const stockSide: 0 | 1 = stockAddresses.has(baseAddress) ? 0 : 1;

      pools.push({
        address: address as Address,
        token0: baseAddress as Address,
        token1: quoteAddress as Address,
        stockSide,
        createdAt: Number.isFinite(createdAt) ? createdAt : null,
        liquidityUsd: reserveUsd ?? 0,
        // GeckoTerminal does not expose the two reserve amounts in this
        // endpoint. Keep them null rather than inventing a split; callers
        // that require exact token-side amounts can fall back to DexScreener.
        liquidityBase: null,
        liquidityQuote: null,
        vol24hUsd: volume24h ?? 0,
        lpBurned: true,
        venue: "Uniswap v4",
      });
    }

    return pools;
  } catch (error) {
    console.warn("Failed to fetch GeckoTerminal pools", error);
    return [];
  }
}

export async function getPoolForToken(
  tokenOrPoolAddress: Address,
): Promise<Pool | null> {
  const lowerCa = tokenOrPoolAddress.toLowerCase();
  const now = Date.now();

  if (cache.has(lowerCa)) {
    const cached = cache.get(lowerCa)!;
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.pool;
    }
  }

  // 1. First check known pools from getRobinhoodPools (same directory used by the board)
  try {
    const allPools = await getRobinhoodPools(100);
    const matched = allPools.find(
      (p) =>
        p.address.toLowerCase() === lowerCa ||
        p.token0.toLowerCase() === lowerCa ||
        p.token1.toLowerCase() === lowerCa,
    );
    if (matched) {
      cache.set(lowerCa, { pool: matched, timestamp: now });
      return matched;
    }
  } catch (e) {
    console.error("Error searching getRobinhoodPools", e);
  }

  // 2. If not found in top 100, fetch from DexScreener (supporting pairAddress or tokenAddress)
  try {
    const url =
      lowerCa.length === 66
        ? `https://api.dexscreener.com/latest/dex/pairs/robinhood/${lowerCa}`
        : `https://api.dexscreener.com/latest/dex/tokens/${lowerCa}`;

    const res = await fetch(url);
    const data = await res.json();
    const pairs = data.pairs || (data.pair ? [data.pair] : []);

    if (!pairs || pairs.length === 0) {
      cache.set(lowerCa, { pool: null, timestamp: now });
      return null;
    }

    // Find the largest pool on Robinhood Chain (V4 only)
    const rhPools = pairs.filter(
      (p: any) =>
        p.chainId === "robinhood" &&
        p.dexId === "uniswap" &&
        p.pairAddress?.length === 66,
    );
    if (rhPools.length === 0) {
      cache.set(lowerCa, { pool: null, timestamp: now });
      return null;
    }

    // Sort by liquidity USD descending
    rhPools.sort(
      (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
    );
    const bestPool = rhPools[0];

    const poolId = bestPool.pairAddress.toLowerCase() as Address;

    // Verify it exists in StateView
    const stateViewAbi = parseAbi([
      "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    ]);

    const slot0 = await client.readContract({
      address: V4_STATE_VIEW as Address,
      abi: stateViewAbi,
      functionName: "getSlot0",
      args: [poolId],
    });

    if (slot0[0] === BigInt(0)) {
      cache.set(lowerCa, { pool: null, timestamp: now });
      return null;
    }

    const token0 = bestPool.baseToken.address.toLowerCase() as Address;
    const token1 = bestPool.quoteToken.address.toLowerCase() as Address;

    const { fetchRegistry } = await import("./registry");
    const registry = await fetchRegistry();
    const stockSide: 0 | 1 = registry.some((t) => t.address.toLowerCase() === token0) ? 0 : 1;

    const pool: Pool = {
      address: poolId,
      token0,
      token1,
      stockSide,
      createdAt: typeof bestPool.pairCreatedAt === "number" ? bestPool.pairCreatedAt : null,
      liquidityUsd: bestPool.liquidity?.usd || 0,
      liquidityBase: typeof bestPool.liquidity?.base === "number" && Number.isFinite(bestPool.liquidity.base)
        ? bestPool.liquidity.base
        : null,
      liquidityQuote: typeof bestPool.liquidity?.quote === "number" && Number.isFinite(bestPool.liquidity.quote)
        ? bestPool.liquidity.quote
        : null,
      lpBurned: true,
      venue: "Uniswap v4",
    };

    cache.set(lowerCa, { pool, timestamp: now });
    return pool;
  } catch (e) {
    console.error(`Failed to fetch pool for ${lowerCa}`, e);
    return null;
  }
}

export async function getRobinhoodPools(limit: number = 50) {
  const now = Date.now();
  if (directoryCache && now - directoryCache.timestamp < CACHE_TTL) {
    return directoryCache.pools.slice(0, limit);
  }

  try {
    const { fetchRegistry } = await import("./registry");
    const registry = await fetchRegistry();
    const addrs = registry.map((t) => t.address);

    let allPairs: any[] = [];

    // DexScreener supports up to 30 addresses per request
    for (let i = 0; i < addrs.length; i += 30) {
      const chunk = addrs.slice(i, i + 30).join(",");
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${chunk}`,
      );
      const data = await res.json();
      if (data.pairs) {
        allPairs = allPairs.concat(data.pairs);
      }
    }

    // Filter to Robinhood Chain and Uniswap (v4)
    const uniquePairs = new Map<string, any>();
    for (const pair of allPairs) {
      if (typeof pair.pairAddress === "string") {
        uniquePairs.set(pair.pairAddress.toLowerCase(), pair);
      }
    }

    const dexPools = Array.from(uniquePairs.values()).filter(
      (p: any) =>
        p.chainId === "robinhood" &&
        p.dexId === "uniswap" &&
        // V4 pools use bytes32 poolIds (66 chars): 0x + 64 hex chars
        // V3 pairs use contract addresses (42 chars) — not usable with StateView
        p.pairAddress?.length === 66,
    );

    const dexNormalized: IndexedPool[] = dexPools.map((bestPool: any) => {
      const poolId = bestPool.pairAddress.toLowerCase() as Address;
      const token0 = bestPool.baseToken.address.toLowerCase() as Address;
      const token1 = bestPool.quoteToken.address.toLowerCase() as Address;

      const stockSide: 0 | 1 = registry.some((t) => t.address.toLowerCase() === token0) ? 0 : 1;

      return {
        address: poolId,
        token0,
        token1,
        stockSide,
        createdAt: typeof bestPool.pairCreatedAt === "number" ? bestPool.pairCreatedAt : null,
        liquidityUsd: bestPool.liquidity?.usd || 0,
        liquidityBase: typeof bestPool.liquidity?.base === "number" && Number.isFinite(bestPool.liquidity.base)
          ? bestPool.liquidity.base
          : null,
        liquidityQuote: typeof bestPool.liquidity?.quote === "number" && Number.isFinite(bestPool.liquidity.quote)
          ? bestPool.liquidity.quote
          : null,
        vol24hUsd: bestPool.volume?.h24 || 0,
        lpBurned: true,
        venue: bestPool.labels?.includes("v4") ? "Uniswap v4" : "Uniswap v4",
        baseSymbol: bestPool.baseToken.symbol,
        quoteSymbol: bestPool.quoteToken.symbol,
      };
    });

    const normalizedByAddress = new Map<string, IndexedPool>();
    for (const pool of dexNormalized) normalizedByAddress.set(pool.address.toLowerCase(), pool);

    const geckoPools = await fetchGeckoPools(registry);
    for (const pool of geckoPools) {
      // Prefer DexScreener's richer reserve fields when both sources know the
      // same pool. GeckoTerminal still fills gaps for pools DexScreener misses.
      if (!normalizedByAddress.has(pool.address.toLowerCase())) {
        normalizedByAddress.set(pool.address.toLowerCase(), pool);
      }
    }

    const normalized = Array.from(normalizedByAddress.values());
    normalized.sort((a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0));
    directoryCache = { pools: normalized, timestamp: now };
    return normalized.slice(0, limit);
  } catch (e) {
    console.error(`Failed to fetch pools`, e);
    return [];
  }
}
