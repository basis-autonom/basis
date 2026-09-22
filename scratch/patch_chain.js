const fs = require('fs');
let code = fs.readFileSync('packages/core/chain.ts', 'utf8');

code = code.replace(
  "import { createPublicClient, http, defineChain } from 'viem';",
  "import { createPublicClient, http, fallback, defineChain } from 'viem';"
);

code = code.replace(
  "export const publicClient = createPublicClient({\n  chain: robinhoodChain,\n  transport: http(RPC_URL),\n});",
  "export const client = createPublicClient({\n  chain: robinhoodChain,\n  transport: fallback([\n    http(process.env.RPC_URL),\n    http(RPC_URL)\n  ]),\n});"
);

fs.writeFileSync('packages/core/chain.ts', code);
