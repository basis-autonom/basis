import { createPublicClient, http, parseAbiItem } from 'viem';
import { robinhoodChain } from '../packages/core/chain';

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
});

async function main() {
  console.log('Fetching NVDA address...');
  const res = await fetch('https://api.robinhood.com/rhj/assets');
  const data = await res.json();
  const nvda = data.assets.find((x: any) => x.tokenSymbol === 'NVDA');
  const nvdaAddress = nvda.deployments.find((x: any) => x.chainId === 4663).contractAddress;
  console.log('NVDA:', nvdaAddress);

  const currentBlock = await client.getBlockNumber();
  console.log('Current block:', currentBlock);

  // Transfer event
  const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

  console.log('Scanning logs for the last 50,000 blocks...');
  const logs = await client.getLogs({
    address: nvdaAddress,
    event: transferEvent,
    fromBlock: currentBlock - 50000n,
    toBlock: currentBlock,
  });
  
  console.log(`Found ${logs.length} transfers.`);
  const toAddresses = new Set<string>();
  for (const log of logs) {
    toAddresses.add(log.args.to as string);
  }
  
  console.log('Unique recipients:', toAddresses.size);
  for (const addr of toAddresses) {
    // Check if it's a contract
    const code = await client.getBytecode({ address: addr as any });
    if (code && code !== '0x') {
      console.log('Contract recipient:', addr);
    }
  }
}

main().catch(console.error);
