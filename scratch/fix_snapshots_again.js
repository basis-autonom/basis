const fs = require('fs');

let code = fs.readFileSync('packages/core/snapshots.ts', 'utf8');
code = code.replace(
  'args: [p.poolId as `0x${string}`],',
  'args: [p.address as `0x${string}`],'
);
fs.writeFileSync('packages/core/snapshots.ts', code);
