import { Address, FloatGrip, StockToken } from './types';
import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain, V4_POOL_MANAGER } from './chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

export async function getFloatGrip(stockToken: StockToken, poolAddress: Address): Promise<FloatGrip> {
  const actionAbi = parseAbi(['function balanceOf(address) view returns (uint256)']);
  
  // Both balanceOf and totalSupply are RAW (unscaled)
  const lockedRaw = await client.readContract({
    address: stockToken.address,
    abi: actionAbi,
    functionName: 'balanceOf',
    args: [V4_POOL_MANAGER as Address],
  });
  
  const totalRaw = BigInt(stockToken.totalSupply);
  let gripPct = 0;
  
  if (totalRaw > 0n) {
    gripPct = (Number(lockedRaw) / Number(totalRaw)) * 100;
  }
  
  return {
    stock: stockToken,
    lockedRaw: (lockedRaw as bigint).toString(),
    gripPct,
    poolCount: 1, // hardcoded for V4 singleton design for now
    largestPool: {
      address: poolAddress,
      symbol: stockToken.symbol, // the pool is managed by PoolManager singleton
      pct: gripPct,
    }
  };
}
