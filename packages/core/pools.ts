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
      createdAt: bestPool.pairCreatedAt || Date.now(),
      liquidityUsd: bestPool.liquidity?.usd || 0,
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
    let rhPools = allPairs.filter(
      (p: any) =>
        p.chainId === "robinhood" &&
        p.dexId === "uniswap" &&
        // V4 pools use bytes32 poolIds (66 chars): 0x + 64 hex chars
        // V3 pairs use contract addresses (42 chars) — not usable with StateView
        p.pairAddress?.length === 66,
    );

    // We only want the top pool per stock to avoid clutter, or just top overall?
    // The user wants top 50 pools overall based on liquidity.
    rhPools.sort(
      (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
    );
    rhPools = rhPools.slice(0, limit);

    return rhPools.map((bestPool: any) => {
      const poolId = bestPool.pairAddress.toLowerCase() as Address;
      const token0 = bestPool.baseToken.address.toLowerCase() as Address;
      const token1 = bestPool.quoteToken.address.toLowerCase() as Address;

      const stockSide: 0 | 1 = registry.some((t) => t.address === token0) ? 0 : 1;

      return {
        address: poolId,
        token0,
        token1,
        stockSide,
        createdAt: bestPool.pairCreatedAt || Date.now(),
        liquidityUsd: bestPool.liquidity?.usd || 0,
        vol24hUsd: bestPool.volume?.h24 || 0,
        lpBurned: true,
        venue: bestPool.labels?.includes("v4") ? "Uniswap v4" : "Uniswap v4",
        baseSymbol: bestPool.baseToken.symbol,
        quoteSymbol: bestPool.quoteToken.symbol,
      };
    });
  } catch (e) {
    console.error(`Failed to fetch pools`, e);
    return [];
  }
}
