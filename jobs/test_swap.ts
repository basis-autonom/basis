import { createPublicClient, http } from 'viem';
import { robinhoodChain } from '../packages/core/chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
});

const V2_SWAP = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const V3_SWAP = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
const V4_SWAP = '0x484346bb6c483cc160100eb6014283b27b3d37a1f599af8d8c9bc8d506d8713d';

async function main() {
  const currentBlock = await client.getBlockNumber();
  console.log('Current block:', currentBlock);

  // fetch logs in chunks if needed, let's try 1000 blocks
  const fromBlock = currentBlock - 1000n;
  
  for (const [name, topic] of [['V2', V2_SWAP], ['V3', V3_SWAP], ['V4', V4_SWAP]]) {
    try {
      const logs = await client.getLogs({
        event: {
          type: 'event',
          name: 'Swap',
          inputs: [], // Doesn't matter for raw topic search if we just use topics
        } as any,
        topics: [topic],
        fromBlock,
        toBlock: currentBlock,
      });
      console.log(`${name} Swaps:`, logs.length);
      if (logs.length > 0) {
        console.log(`  Example ${name} Pool:`, logs[0].address);
      }
    } catch (e: any) {
      console.log(`${name} Swaps error:`, e.message.split('\n')[0]);
    }
  }
}

main().catch(console.error);
