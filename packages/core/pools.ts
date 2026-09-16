import { Address, Pool } from './types';
import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain, V4_STATE_VIEW } from './chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const cache = new Map<string, { pool: Pool | null; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins

export async function getPoolForToken(tokenAddress: Address): Promise<Pool | null> {
  const lowerCa = tokenAddress.toLowerCase();
  const now = Date.now();
  
  if (cache.has(lowerCa)) {
    const cached = cache.get(lowerCa)!;
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.pool;
    }
  }

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${lowerCa}`);
    const data = await res.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      cache.set(lowerCa, { pool: null, timestamp: now });
      return null;
    }

    // Find the largest pool on Robinhood Chain
    const rhPools = data.pairs.filter((p: any) => p.chainId === 'robinhood' && p.dexId === 'uniswap');
    if (rhPools.length === 0) {
      cache.set(lowerCa, { pool: null, timestamp: now });
      return null;
    }

    // Sort by liquidity USD descending
    rhPools.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const bestPool = rhPools[0];

    const poolId = bestPool.pairAddress.toLowerCase() as Address;
    
    // Verify it exists in StateView
    const stateViewAbi = parseAbi(['function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)']);
    
    const slot0 = await client.readContract({
      address: V4_STATE_VIEW as Address,
      abi: stateViewAbi,
      functionName: 'getSlot0',
      args: [poolId],
    });

    if (slot0[0] === 0n) {
      cache.set(lowerCa, { pool: null, timestamp: now });
      return null;
    }

    const token0 = bestPool.baseToken.address.toLowerCase() as Address;
    const token1 = bestPool.quoteToken.address.toLowerCase() as Address;
    
    // Determine which side is the stock (meaning, not the memecoin we queried)
    const stockSide = token0 === lowerCa ? 1 : 0; 
    // Wait, if lowerCa is the memecoin, then stock is the OTHER token.
    // If token0 is memecoin, stock is token1. stockSide = 1.
    // If token1 is memecoin, stock is token0. stockSide = 0.

    const pool: Pool = {
      address: poolId,
      token0,
      token1,
      stockSide,
      createdAt: bestPool.pairCreatedAt || Date.now(), // fallback if missing
      liquidityUsd: bestPool.liquidity?.usd || 0,
      lpBurned: true, // simplified for now, as V4 liquidity is often managed by hooks/singleton
      venue: bestPool.labels?.includes('v4') ? 'Uniswap v4' : 'Uniswap v4', 
    };

    cache.set(lowerCa, { pool, timestamp: now });
    return pool;
  } catch (e) {
    console.error(`Failed to fetch pool for ${lowerCa}`, e);
    return null;
  }
}
