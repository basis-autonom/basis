const fs = require('fs');
let code = fs.readFileSync('packages/core/chain.ts', 'utf8');

code = code.replace(
  '  transport: fallback([\n    http(process.env.RPC_URL),\n    http(RPC_URL)\n  ]),\n});',
  '  transport: fallback([\n    http(process.env.RPC_URL),\n    http(RPC_URL)\n  ]),\n  batch: { multicall: { batchSize: 20, wait: 20 } },\n});'
);

fs.writeFileSync('packages/core/chain.ts', code);
