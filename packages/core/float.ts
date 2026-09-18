import { Address, FloatGrip, StockToken } from './types';
import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain, V4_POOL_MANAGER, V4_STATE_VIEW } from './chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const reportAbi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function uiMultiplier() view returns (uint256)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
]);

export type LatestRoundData = readonly [bigint, bigint, bigint, bigint, bigint];
export type Slot0Data = readonly [bigint, number, number, number];

export interface ReportSnapshot {
  lockedRaw: bigint | null;
  totalRaw: bigint | null;
  multiplierRaw: bigint | null;
  latestRoundData: LatestRoundData | null;
  slot0: Slot0Data | null;
}

function successfulResult<T>(result: { status?: string; result?: unknown } | undefined): T | null {
  return result?.status === 'success' ? (result.result as T) : null;
}

export function makeFloatGrip(
  stockToken: StockToken,
  poolAddress: Address,
  lockedRaw: bigint | null,
  totalRaw: bigint | null,
): FloatGrip {
  const gripPct =
    lockedRaw !== null && totalRaw !== null && totalRaw > 0n
      ? (Number(lockedRaw) / Number(totalRaw)) * 100
      : null;

  return {
    stock: stockToken,
    lockedRaw: lockedRaw?.toString() ?? null,
    totalRaw: totalRaw?.toString() ?? null,
    gripPct,
    poolCount: 1, // hardcoded for V4 singleton design for now
    largestPool: {
      address: poolAddress,
      symbol: stockToken.symbol, // the pool is managed by PoolManager singleton
      pct: gripPct,
    }
  };
}

/**
 * Current report reads are deliberately one multicall: pool grip, stock supply,
 * corporate-action multiplier, Chainlink latest price, and pool slot0.
 * Historical readings still require their own block/round lookups.
 */
export async function getReportSnapshot(
  stockToken: StockToken,
  poolAddress: Address,
): Promise<ReportSnapshot> {
  const results = await client.multicall({
    contracts: [
      {
        address: stockToken.address,
        abi: reportAbi,
        functionName: 'balanceOf' as const,
        args: [V4_POOL_MANAGER as Address],
      },
      {
        address: stockToken.address,
        abi: reportAbi,
        functionName: 'totalSupply' as const,
      },
      {
        address: stockToken.address,
        abi: reportAbi,
        functionName: 'uiMultiplier' as const,
      },
      {
        address: stockToken.feed,
        abi: reportAbi,
        functionName: 'latestRoundData' as const,
      },
      {
        address: V4_STATE_VIEW as Address,
        abi: reportAbi,
        functionName: 'getSlot0' as const,
        args: [poolAddress],
      },
    ],
  });

  return {
    lockedRaw: successfulResult<bigint>(results[0]),
    totalRaw: successfulResult<bigint>(results[1]),
    multiplierRaw: successfulResult<bigint>(results[2]),
    latestRoundData: successfulResult<LatestRoundData>(results[3]),
    slot0: successfulResult<Slot0Data>(results[4]),
  };
}

export async function getFloatGrip(stockToken: StockToken, poolAddress: Address): Promise<FloatGrip> {
  const results = await client.multicall({
    contracts: [
      {
        address: stockToken.address,
        abi: reportAbi,
        functionName: 'balanceOf' as const,
        args: [V4_POOL_MANAGER as Address],
      },
      {
        address: stockToken.address,
        abi: reportAbi,
        functionName: 'totalSupply' as const,
      },
    ],
  });

  return makeFloatGrip(
    stockToken,
    poolAddress,
    successfulResult<bigint>(results[0]),
    successfulResult<bigint>(results[1]),
  );
}

export async function getFloatBoardData() {
  const { fetchRegistry } = await import('./registry');
  const registry = await fetchRegistry();
  
  const calls = registry.map(stock => ({
    address: stock.address,
    abi: reportAbi,
    functionName: 'balanceOf' as const,
    args: [V4_POOL_MANAGER as Address],
  }));
  const supplyCalls = registry.map(stock => ({
    address: stock.address,
    abi: reportAbi,
    functionName: 'totalSupply' as const,
  }));
  
  const res = await client.multicall({ contracts: registry.flatMap((_, i) => [calls[i], supplyCalls[i]]) });
  
  const rows = [];
  for (let i = 0; i < registry.length; i++) {
    const stock = registry[i];
    const grip = makeFloatGrip(
      stock,
      V4_POOL_MANAGER as Address,
      successfulResult<bigint>(res[i * 2]),
      successfulResult<bigint>(res[i * 2 + 1]),
    );
    
    // Determine a dummy largest holder name if we don't have the exact pool info,
    // or we can fetch pools just for top grips later. But for now, returning simple structure.
    rows.push({
      ticker: stock.symbol,
      floatOnChain: grip.totalRaw == null ? null : Number(grip.totalRaw) / 1e18,
      lockedInPools: grip.lockedRaw == null ? null : Number(grip.lockedRaw) / 1e18,
      gripPct: grip.gripPct,
      poolsCount: grip.poolCount,
      largestHolder: 'V4 PoolManager',
      largestShare: grip.largestPool.pct,
      lpBurned: true,
    });
  }
  
  // Sort by float grip descending
  rows.sort((a, b) => (b.gripPct ?? -Infinity) - (a.gripPct ?? -Infinity));
  return rows;
}
