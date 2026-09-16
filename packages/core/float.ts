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
  
  if (totalRaw > BigInt(0)) {
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

export async function getFloatBoardData() {
  const { fetchRegistry } = await import('./registry');
  const registry = await fetchRegistry();
  
  const actionAbi = parseAbi(['function balanceOf(address) view returns (uint256)']);
  
  const calls = registry.map(stock => ({
    address: stock.address,
    abi: actionAbi,
    functionName: 'balanceOf',
    args: [V4_POOL_MANAGER as Address],
  }));
  
  const res = await client.multicall({ contracts: calls });
  
  const rows = [];
  for (let i = 0; i < registry.length; i++) {
    const stock = registry[i];
    if (res[i].status !== 'success') continue;
    
    const lockedRaw = res[i].result as bigint;
    const totalRaw = BigInt(stock.totalSupply);
    let gripPct = 0;
    if (totalRaw > BigInt(0)) {
      gripPct = (Number(lockedRaw) / Number(totalRaw)) * 100;
    }
    
    // Determine a dummy largest holder name if we don't have the exact pool info,
    // or we can fetch pools just for top grips later. But for now, returning simple structure.
    rows.push({
      ticker: stock.symbol,
      floatOnChain: Number(totalRaw) / 1e18, // For UI display, we scale it
      lockedInPools: Number(lockedRaw) / 1e18, // Scale it
      gripPct,
      poolsCount: 1,
      largestHolder: 'V4 PoolManager',
      largestShare: gripPct,
      lpBurned: true,
    });
  }
  
  // Sort by float grip descending
  rows.sort((a, b) => b.gripPct - a.gripPct);
  return rows;
}
