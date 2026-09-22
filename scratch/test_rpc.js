const { createPublicClient, http, fallback } = require('viem');
const { robinhood } = require('viem/chains');

const client = createPublicClient({
  chain: robinhood,
  transport: http('https://rpc.mainnet.chain.robinhood.com'),
});

async function main() {
  try {
    const bn = await client.getBlockNumber();
    console.log("Block number:", bn);
    
    // Test a simple readContract
    const res = await client.readContract({
      address: '0x0000000000000000000000000000000000000000', // invalid but we just want to see if it responds with a contract error vs 429
      abi: [{ type: 'function', name: 'name', inputs: [], outputs: [{ type: 'string' }] }],
      functionName: 'name',
    }).catch(e => e.message);
    console.log("Read contract result:", res);
  } catch (e) {
    console.error(e);
  }
}
main();
