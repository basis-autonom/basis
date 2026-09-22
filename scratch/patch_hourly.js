const fs = require('fs');

let code = fs.readFileSync('app/api/split/[ca]/hourly/route.ts', 'utf8');

if (!code.includes('getSnapshotsForPool')) {
  code = code.replace(
    'import { client, robinhoodChain, V4_STATE_VIEW } from "../../../../../packages/core/chain";',
    'import { client, robinhoodChain, V4_STATE_VIEW } from "../../../../../packages/core/chain";\nimport { getSnapshotsForPool } from "../../../../../packages/db/queries";'
  );
}

const targetStr = `  // A time-travelled eth_call can only use one block number per multicall.
  // Therefore each historical block gets one viem multicall containing all
  // StateView reads for that block (one call here), with low concurrency to
  // avoid creating a 429 burst. No point is interpolated.
  const blocks = await mapWithConcurrency(
    timestamps,
    async (timestamp) => {
      try {
        return { block: await withRetry(() => getBlockByTimestamp(timestamp)), failed: false };
      } catch {
        return { block: null, failed: true };
      }
    },
    4,
  );
  const slots = await mapWithConcurrency(
    blocks,
    async ({ block, failed }) : Promise<HistoricalSlot> => {
      if (failed || block === null) return { slot: null, failed: true };
      try {
        const [result] = await withRetry(() => client.multicall({
          contracts: [
            {
              address: V4_STATE_VIEW as Address,
              abi: stateViewAbi,
              functionName: "getSlot0" as const,
              args: [pool.address],
            },
          ],
          blockNumber: block,
        }));
        const slot = successful<Slot0>(result);
        return { slot, failed: slot === null };
      } catch {
        return { slot: null, failed: true };
      }
    },
    4,
  );`;

const replacementStr = `  // Load snapshots from the database instead of hitting the archive node
  const minTime = new Date(timestamps[0] - HOUR_MS);
  const snapshots = await getSnapshotsForPool(pool.address, minTime);
  
  const slots: HistoricalSlot[] = timestamps.map((targetTs) => {
    // Find the latest snapshot AT OR BEFORE this timestamp
    const matching = snapshots
      .filter((s) => s.timestamp.getTime() <= targetTs)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
    if (!matching) {
      return { slot: null, failed: true }; // we don't have it in DB, return failed so it shows red gap
    }
    
    // Construct fake Slot0 tuple to satisfy ratioFromSlot
    // [sqrtPriceX96, tick, protocolFee, lpFee]
    const slot0 = [BigInt(matching.sqrtPriceX96), matching.tick, 0, 0] as unknown as Slot0;
    return { slot: slot0, failed: false };
  });`;

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('app/api/split/[ca]/hourly/route.ts', code);
