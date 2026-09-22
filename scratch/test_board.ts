import { getBoardData } from '../packages/core/board';
import { client } from '../packages/core/chain';

async function main() {
  console.log("Using RPC:", client.transport.url || "fallback");
  const res = await getBoardData(3);
  console.log("Result:", JSON.stringify(res, null, 2));
}
main();
