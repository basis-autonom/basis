import { Address, SplitResponse, Window } from './types';
import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain, V4_STATE_VIEW } from './chain';
import { getStockTokenByAddress } from './registry';
import { getPoolForToken } from './pools';
import { getBlockByTimestamp } from './blocks';
import { getPrices } from './prices';
import { getFloatGrip } from './float';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const windowToMs = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function computeSplit(tokenAddress: Address, window: Window): Promise<SplitResponse> {
  // 1. Fetch Pool
  const pool = await getPoolForToken(tokenAddress);
  if (!pool) {
    return { kind: "no_pool" };
  }

  // 2. Fetch Stock Token
  const stockTokenAddr = pool.stockSide === 0 ? pool.token0 : pool.token1;
  const stockToken = await getStockTokenByAddress(stockTokenAddr);
  
  if (!stockToken) {
    return { kind: "unknown_token" };
  }
  
  if (!stockToken.feed) {
    return { kind: "no_feed" };
  }

  // 3. Time windows
  const now = Date.now();
  const windowMs = windowToMs[window];
  if (now - pool.createdAt < windowMs) {
    // We could return "too_new", but the brief says "Kalau data belum ada, kosongkan sectionnya" or similar, 
    // but the split response spec has "too_new". We'll just return it.
    return { kind: "too_new" };
  }

  const targetTs = now - windowMs;
  const oldBlock = await getBlockByTimestamp(targetTs);

  // 4. Get Pool Ratio via StateView
  const stateViewAbi = parseAbi(['function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)']);
  
  const slot0Now = await client.readContract({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: 'getSlot0',
    args: [pool.address],
  });
  
  const slot0Old = await client.readContract({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: 'getSlot0',
    args: [pool.address],
    blockNumber: oldBlock,
  });

  const pL = (Number(slot0Now[0]) / (2 ** 96)) ** 2;
  const pO = (Number(slot0Old[0]) / (2 ** 96)) ** 2;

  // The ratio calculation depends on which side the stock is
  const poolRatioNow = pool.stockSide === 1 ? pL : 1 / pL;
  const poolRatioOld = pool.stockSide === 1 ? pO : 1 / pO;
  
  const memeComponent = (poolRatioNow / poolRatioOld) - 1;

  // 5. Get Chainlink prices
  const { latestPrice, oldPrice } = await getPrices(stockToken.feed, targetTs);
  const stockComponent = (latestPrice / oldPrice) - 1;

  // 6. Total Attribution
  const total = ((1 + memeComponent) * (1 + stockComponent)) - 1;

  // 7. Float Grip
  const grip = await getFloatGrip(stockToken, pool.address);

  return {
    kind: "success",
    data: {
      stock: stockToken,
      pool,
      window,
      prices: {
        stockNow: latestPrice,
        stockOld: oldPrice,
        poolRatioNow,
        poolRatioOld,
      },
      attribution: {
        stockComponent,
        memeComponent,
        total,
      },
      grip,
    }
  };
}
