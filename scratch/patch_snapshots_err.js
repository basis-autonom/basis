const fs = require('fs');
let code = fs.readFileSync('packages/core/snapshots.ts', 'utf8');
code = code.replace(
  'console.log(`Multicall executed',
  'console.log(results[0]);\n  console.log(`Multicall executed'
);
fs.writeFileSync('packages/core/snapshots.ts', code);
