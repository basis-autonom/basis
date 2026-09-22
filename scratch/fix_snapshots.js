const fs = require('fs');

let code = fs.readFileSync('packages/core/snapshots.ts', 'utf8');
code = code.replace(
  '"function getSlot0(address poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",',
  '"function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",'
);
code = code.replace(
  'args: [p.address as Address],',
  'args: [p.poolId as `0x${string}`],'
);
fs.writeFileSync('packages/core/snapshots.ts', code);
