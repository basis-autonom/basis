const fs = require('fs');

let code = fs.readFileSync('packages/core/snapshots.ts', 'utf8');
code = code.replace(
  'const results = await client.multicall({ contracts: calls });',
  'const results = await client.multicall({ contracts: calls });\n  console.log(`Multicall executed, results length: ${results.length}. Success: ${results.filter(r => r.status === "success").length}, Failures: ${results.filter(r => r.status !== "success").length}`);'
);
fs.writeFileSync('packages/core/snapshots.ts', code);
