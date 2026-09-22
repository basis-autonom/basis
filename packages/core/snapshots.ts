import { client, V4_STATE_VIEW } from "./chain";
import { getRobinhoodPools } from "./pools";
import { insertPoolSnapshots } from "../db/snapshots";
import type { Address } from "viem";
import { parseAbi } from "viem";

const stateViewAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
]);

export async function capturePoolSnapshots() {
  const pools = await getRobinhoodPools(100);
  if (!pools || pools.length === 0) return 0;

  const calls = pools.map((p) => ({
    address: V4_STATE_VIEW as Address,
    abi: stateViewAbi,
    functionName: "getSlot0" as const,
    args: [p.address as `0x${string}`],
  }));

  const results = await client.multicall({ contracts: calls });
  
  const timestamp = new Date(); // now
  const snapshots = [];

  for (let i = 0; i < pools.length; i++) {
    const res = results[i];
    if (res.status === "success" && res.result) {
      const [sqrtPriceX96, tick] = res.result as [bigint, number, number, number];
      snapshots.push({
        poolAddress: pools[i].address.toLowerCase(),
        timestamp,
        sqrtPriceX96: sqrtPriceX96.toString(),
        tick,
      });
    }
  }

  const inserted = await insertPoolSnapshots(snapshots);
  return inserted;
}
