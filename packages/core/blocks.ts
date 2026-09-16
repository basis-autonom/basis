import { createPublicClient, http } from 'viem';
import { robinhoodChain } from './chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const blockCache = new Map<number, bigint>();

export async function getBlockByTimestamp(targetMs: number): Promise<bigint> {
  // Approximate to nearest minute for caching to avoid hammering RPC for exact same windows
  const cacheKey = Math.floor(targetMs / 60000) * 60000;
  if (blockCache.has(cacheKey)) {
    return blockCache.get(cacheKey)!;
  }

  const targetTs = BigInt(Math.floor(targetMs / 1000));
  let low = 0n;
  let high = await client.getBlockNumber();
  let best = high;
  
  while (low <= high) {
    const mid = (low + high) / 2n;
    const block = await client.getBlock({ blockNumber: mid });
    if (block.timestamp === targetTs) {
      best = mid;
      break;
    }
    if (block.timestamp < targetTs) {
      low = mid + 1n;
      best = mid;
    } else {
      high = mid - 1n;
    }
  }
  
  blockCache.set(cacheKey, best);
  return best;
}
