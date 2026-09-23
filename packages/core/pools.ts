/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address, Pool } from "./types";
import { parseAbi } from "viem";
import { client, robinhoodChain, V4_STATE_VIEW } from "./chain";
import { fetchRegistry } from "./registry";


const cache = new Map<string, { pool: Pool | null; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins for discovered pools
const NO_POOL_CACHE_TTL = 5 * 60 * 1000; // 5 mins for confirmed empty lookups
const INDEXER_ATTEMPTS = 3;
const GECKO_NETWORK = "robinhood";
const GECKO_ACCEPT = "application/json;version=20230203";

type IndexedPool = Pool & {
  baseSymbol?: string;
  quoteSymbol?: string;
  vol24hUsd?: number;
};

let directoryCache: { pools: IndexedPool[]; timestamp: number } | null = null;

export class PoolLookupUnavailableError extends Error {
  constructor(message = "Pool indexers did not respond after retries.") {
    super(message);
    this.name = "PoolLookupUnavailableError";
  }
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(
  url: string,
  init?: RequestInit,
): Promise<any | null> {
  let lastError: unknown;
  let retryAfterMs: number | null = null;

  for (let attempt = 0; attempt < INDEXER_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.status === 404) return null;
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Indexer returned HTTP 429.");
        }
        const retryAfter = Number(response.headers.get("retry-after"));
        retryAfterMs = Number.isFinite(retryAfter)
          ? Math.min(5_000, Math.max(250, retryAfter * 1_000))
          : null;
        throw new Error(`Indexer returned HTTP ${response.status}.`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.includes("429")) {
        break;
      }
      if (attempt < INDEXER_ATTEMPTS - 1) {
        await sleep(retryAfterMs ?? 500 * 2 ** attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Indexer request failed after retries.");
}

function normalizeGeckoPool(
  record: any,
  stockAddresses: Set<string>,
): IndexedPool | null {
  const attributes = record?.attributes;
  const relationships = record?.relationships;
  const dexId = relationships?.dex?.data?.id;
  const baseAddress = relationships?.base_token?.data?.id
    ?.split("_")
    .pop()
    ?.toLowerCase();
  const quoteAddress = relationships?.quote_token?.data?.id
    ?.split("_")
    .pop()
    ?.toLowerCase();
  const address = attributes?.address?.toLowerCase();
  const isV4Pool =
    dexId === "uniswap-v4-robinhood" || dexId === "bankr-robinhood";

  if (
    !isV4Pool ||
    typeof address !== "string" ||
    address.length !== 66 ||
    typeof baseAddress !== "string" ||
    typeof quoteAddress !== "string" ||
    (!stockAddresses.has(baseAddress) && !stockAddresses.has(quoteAddress))
  ) {
    return null;
  }

  const createdAt = typeof attributes.pool_created_at === "string"
    ? Date.parse(attributes.pool_created_at)
    : NaN;

  return {
    address: address as Address,
    token0: baseAddress as Address,
    token1: quoteAddress as Address,
    stockSide: stockAddresses.has(baseAddress) ? 0 : 1,
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
    liquidityUsd: finiteNumber(attributes.reserve_in_usd) ?? 0,
    liquidityBase: null,
    liquidityQuote: null,
    vol24hUsd: finiteNumber(attributes.volume_usd?.h24) ?? 0,
    lpBurned: true,
    venue: "Uniswap v4",
  };
}

async function fetchGeckoPools(registry: Array<{ address: Address }>): Promise<IndexedPool[]> {
  // GeckoTerminal's public endpoint returns 20 pools per page. Five pages
  // gives the directory a bounded top-100 view. Individual page failures are
  // tolerated, but an all-page failure is surfaced to the caller. Keep these
  // requests sequential: firing all five at once causes avoidable 429s on the
  // public endpoint and can starve the token-scoped fallback below.
  const successfulPages: any[][] = [];
  let lastError: unknown;
  for (const page of [1, 2, 3, 4, 5]) {
    try {
      const body = await fetchJsonWithRetry(
        `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/pools?page=${page}`,
        { headers: { Accept: GECKO_ACCEPT } },
      );
      successfulPages.push(body?.data ?? []);
    } catch (error) {
      lastError = error;
      console.warn(`GeckoTerminal directory page ${page} failed`, error);
      if (error instanceof Error && error.message.includes("429")) {
        break;
      }
    }
  }
  if (successfulPages.length === 0) {
    throw new PoolLookupUnavailableError(
      lastError instanceof Error
        ? `GeckoTerminal directory unavailable after retries: ${lastError.message}`
        : "GeckoTerminal directory unavailable after retries.",
    );
  }

  const stockAddresses = new Set(registry.map((token) => token.address.toLowerCase()));
  return successfulPages
    .flatMap((page) => page)
    .map((record) => normalizeGeckoPool(record, stockAddresses))
    .filter((pool): pool is IndexedPool => pool !== null);
}

async function fetchGeckoPoolsForToken(
  tokenAddress: Address,
  registry: Array<{ address: Address }>,
): Promise<IndexedPool[]> {
  const body = await fetchJsonWithRetry(
    `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}/tokens/${tokenAddress}/pools`,
    { headers: { Accept: GECKO_ACCEPT } },
  );
  if (body === null) return [];

  const stockAddresses = new Set(registry.map((token) => token.address.toLowerCase()));
  return (body.data ?? [])
    .map((record: any) => normalizeGeckoPool(record, stockAddresses))
    .filter((pool: IndexedPool | null): pool is IndexedPool => pool !== null)
    .filter((pool: IndexedPool) =>
      pool.token0.toLowerCase() === tokenAddress.toLowerCase() ||
      pool.token1.toLowerCase() === tokenAddress.toLowerCase(),
    );
}

export async function getPoolForToken(
  tokenOrPoolAddress: Address,
): Promise<Pool | null> {
  const lowerCa = tokenOrPoolAddress.toLowerCase();
  const now = Date.now();

  if (cache.has(lowerCa)) {
    const cached = cache.get(lowerCa)!;
    const cacheTtl = cached.pool ? CACHE_TTL : NO_POOL_CACHE_TTL;
    if (now - cached.timestamp < cacheTtl) {
      return cached.pool;
    }
  }

  let successfulSources = 0;
  let targetedSourceSucceeded = false;

  // 1. Check DexScreener direct lookup first (fastest, most reliable, sub-200ms)
  try {
    const url =
      lowerCa.length === 66
        ? `https://api.dexscreener.com/latest/dex/pairs/robinhood/${lowerCa}`
        : `https://api.dexscreener.com/latest/dex/tokens/${lowerCa}`;

    const data = await fetchJsonWithRetry(url);
    successfulSources += 1;
    targetedSourceSucceeded = true;
    const pairs = data?.pairs || (data?.pair ? [data.pair] : []);

    if (pairs && pairs.length > 0) {
      // Find the largest pool on Robinhood Chain (V4 only)
      const rhPools = pairs.filter(
        (p: any) =>
          p.chainId === "robinhood" &&
          p.dexId === "uniswap" &&
          p.pairAddress?.length === 66,
      );
      if (rhPools.length > 0) {
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

        if (slot0[0] !== BigInt(0)) {
          const token0 = bestPool.baseToken.address.toLowerCase() as Address;
          const token1 = bestPool.quoteToken.address.toLowerCase() as Address;
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
        }
      }
    }
  } catch (e) {
    // Continue to next source
  }

  // 2. Check the combined directory
  try {
    const allPools = await getRobinhoodPools(100);
    successfulSources += 1;
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

  // 3. Fallback to targeted GeckoTerminal lookup if needed
  if (lowerCa.length === 42) {
    try {
      const registry = await fetchRegistry();
      if (registry.length > 0) {
        const geckoPools = await fetchGeckoPoolsForToken(tokenOrPoolAddress, registry);
        targetedSourceSucceeded = true;
        successfulSources += 1;
        const matched = geckoPools.sort(
          (a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0),
        )[0];
        if (matched) {
          cache.set(lowerCa, { pool: matched, timestamp: now });
          return matched;
        }
      }
    } catch (e) {
      // GeckoTerminal rate-limited or error
    }
  }

  if (lowerCa.length === 42 && !targetedSourceSucceeded) {
    throw new PoolLookupUnavailableError(
      "Token-scoped pool lookup did not respond after retries.",
    );
  }

  if (successfulSources === 0) {
    throw new PoolLookupUnavailableError();
  }

  // Cache only a confirmed empty lookup for a short period. Availability
  // failures above throw instead, so they are never cached as no_pool.
  cache.set(lowerCa, { pool: null, timestamp: now });
  return null;
}

export async function getRobinhoodPools(limit: number = 50) {
  const now = Date.now();
  if (directoryCache && now - directoryCache.timestamp < CACHE_TTL) {
    return directoryCache.pools.slice(0, limit);
  }

  const registry = await fetchRegistry();
  if (registry.length === 0) {
    throw new PoolLookupUnavailableError(
      "Stock-token registry unavailable during pool directory lookup.",
    );
  }
  const addrs = registry.map((t) => t.address);

  let allPairs: any[] = [];
  let dexSucceeded = false;

  // DexScreener supports up to 30 addresses per request. Retry each chunk so
  // one transient 429/5xx does not erase the entire board directory.
  for (let i = 0; i < addrs.length; i += 30) {
    const chunk = addrs.slice(i, i + 30).join(",");
    try {
      const data = await fetchJsonWithRetry(
        `https://api.dexscreener.com/latest/dex/tokens/${chunk}`,
      );
      dexSucceeded = true;
      if (data?.pairs) {
        allPairs = allPairs.concat(data.pairs);
      }
    } catch (error) {
      console.warn(`DexScreener pool chunk ${i / 30 + 1} failed`, error);
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

  let geckoSucceeded = false;
  try {
    const geckoPools = await fetchGeckoPools(registry);
    geckoSucceeded = true;
    for (const pool of geckoPools) {
      // Prefer DexScreener's richer reserve fields when both sources know the
      // same pool. GeckoTerminal still fills gaps for pools DexScreener misses.
      if (!normalizedByAddress.has(pool.address.toLowerCase())) {
        normalizedByAddress.set(pool.address.toLowerCase(), pool);
      }
    }
  } catch (error) {
    console.warn("GeckoTerminal pool directory failed", error);
  }

  if (!dexSucceeded && !geckoSucceeded) {
    throw new PoolLookupUnavailableError();
  }

  const normalized = Array.from(normalizedByAddress.values());
  normalized.sort((a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0));
  directoryCache = { pools: normalized, timestamp: now };
  return normalized.slice(0, limit);
}
