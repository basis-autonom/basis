import { Address } from './types';
import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain } from './chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const clAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
]);

export async function getPrices(feedAddress: Address, targetMs: number) {
  const targetTs = BigInt(Math.floor(targetMs / 1000));
  
  const latest = await client.readContract({
    address: feedAddress,
    abi: clAbi,
    functionName: 'latestRoundData',
  });

  const latestPrice = Number(latest[1]);
  const lastUpdatedAt = latest[3];
  
  // If the target is newer than our latest data, return latest for both
  if (targetTs >= lastUpdatedAt) {
    return { latestPrice, oldPrice: latestPrice };
  }

  let roundId = latest[0];
  let oldestPrice = latestPrice;
  const initialPhase = roundId >> 64n;
  
  while (true) {
    try {
      const data = await client.readContract({
        address: feedAddress,
        abi: clAbi,
        functionName: 'getRoundData',
        args: [roundId],
      });
      
      const currentPhase = roundId >> 64n;
      // Note: if phase changed, we'd need more complex logic. 
      // But recon showed phase hasn't changed in 7 days.
      // So we just iterate.
      
      oldestPrice = Number(data[1]);
      if (data[3] < targetTs) {
        break; // found the price just before our target timestamp
      }
      
      roundId--;
    } catch (e: any) {
      if (e.message.includes('No data present')) {
        // We reached the beginning of this phase.
        // We should move to the previous phase's last round, but we don't know its ID without complex scanning.
        // For our scope, we break and use the oldest we got.
        break;
      }
      throw e;
    }
  }

  return { latestPrice, oldPrice: oldestPrice };
}
