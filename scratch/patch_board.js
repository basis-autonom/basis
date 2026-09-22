const fs = require('fs');

let code = fs.readFileSync('packages/core/board.ts', 'utf8');

if (!code.includes('getBaselineSnapshots')) {
  code = code.replace(
    'import { client, getBlockByTimestamp, getRatio, V4_STATE_VIEW } from "./chain";',
    'import { client, getBlockByTimestamp, getRatio, V4_STATE_VIEW } from "./chain";\nimport { getBaselineSnapshots } from "../db/queries";'
  );
}

// Replace the block fetching logic
const targetStr = `  const [block24h, block7d] = await Promise.all([
    getBlockByTimestamp(targetTs24h).catch(() => null),
    getBlockByTimestamp(targetTs7d).catch(() => null),
  ]);

  // Historical slot0 calls with try/catch to handle public RPC limitations
  let res24h: any[] = [];
  if (block24h) {
    try {
      res24h = await client.multicall({
        contracts: poolCalls,
        blockNumber: block24h,
      });
    } catch {
      res24h = selected.map(() => ({ status: "failure" }));
    }
  } else {
    res24h = selected.map(() => ({ status: "failure" }));
  }

  let res7d: any[] = [];
  if (block7d) {
    try {
      res7d = await client.multicall({
        contracts: poolCalls,
        blockNumber: block7d,
      });
    } catch {
      res7d = selected.map(() => ({ status: "failure" }));
    }
  } else {
    res7d = selected.map(() => ({ status: "failure" }));
  }`;

const replacementStr = `  const poolAddrs = selected.map(s => s.pool.address.toLowerCase());
  
  // Use the database to get historical snapshots
  const [snap24h, snap7d] = await Promise.all([
    getBaselineSnapshots(poolAddrs, new Date(targetTs24h)).catch(() => []),
    getBaselineSnapshots(poolAddrs, new Date(targetTs7d)).catch(() => []),
  ]);
  
  // Create lookup maps
  const map24h = new Map(snap24h.map((s: any) => [s.pool_address, s.sqrt_price_x96]));
  const map7d = new Map(snap7d.map((s: any) => [s.pool_address, s.sqrt_price_x96]));
  
  // Mock the multicall result structure so we don't have to rewrite the entire processing loop below
  const res24h = selected.map(s => {
    const sqrt = map24h.get(s.pool.address.toLowerCase());
    return sqrt ? { status: "success", result: [BigInt(sqrt)] } : { status: "failure" };
  });
  
  const res7d = selected.map(s => {
    const sqrt = map7d.get(s.pool.address.toLowerCase());
    return sqrt ? { status: "success", result: [BigInt(sqrt)] } : { status: "failure" };
  });`;

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('packages/core/board.ts', code);
