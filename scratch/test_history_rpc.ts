import { client, V4_STATE_VIEW } from '../packages/core/chain';
import { getBlockByTimestamp } from '../packages/core/blocks';

async function main() {
  const targetTs = Date.now() - 24 * 60 * 60 * 1000;
  console.log("Fetching block for timestamp", targetTs);
  try {
    const blockNum = await getBlockByTimestamp(targetTs);
    console.log("Got block number:", blockNum);
    
    const res = await client.readContract({
      address: V4_STATE_VIEW,
      abi: [{
        inputs: [{ type: 'address' }],
        name: 'getSlot0',
        outputs: [{ type: 'uint160' }, { type: 'int24' }, { type: 'uint16' }, { type: 'uint16' }],
        stateMutability: 'view',
        type: 'function'
      }],
      functionName: 'getSlot0',
      args: ['0x91a2dae9699f0b82540b5886b0d8759c22820ba3'], // use token address instead? No, it needs pool address. Let's just use 0x0000000000000000000000000000000000000000 and see if it returns 0x or an error
      blockNumber: blockNum
    });
    console.log("Slot0 at past block:", res);
  } catch (e) {
    console.error("FAILED:", e.message);
  }
}
main();
