import { writeFileSync } from 'fs';
import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain } from '../packages/core/chain';

const report: any = {};

async function checkArchiveNode(client: any) {
  console.log('--- Step 0: Archive Node Check ---');
  let currentBlock: bigint;
  try {
    currentBlock = await client.getBlockNumber();
    console.log('Current block:', currentBlock);
  } catch (error: any) {
    throw new Error(`Failed to fetch current block. Error: ${error.message.split('\n')[0]}`);
  }

  const targetBlock = currentBlock - 604800n; // Let's check a bit less than 7 days, just to prove archive ability
  
  console.log(`Checking state at block ${targetBlock}...`);
  try {
    await client.getBalance({
      address: '0x0000000000000000000000000000000000000000',
      blockNumber: targetBlock,
    });
    console.log('Archive check passed.');
    report.archiveCheck = true;
  } catch (error: any) {
    report.archiveCheck = false;
    throw new Error(`RPC rejected state read at block ${targetBlock}. It is not an archive node: ${error.message.split('\n')[0]}`);
  }
}

async function runStep1(client: any) {
  console.log('--- Step 1: Registry & Chainlink Feeds ---');
  const res = await fetch('https://api.robinhood.com/rhj/assets');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  
  const tokens = data.assets.filter((a: any) => 
    a.deployments?.some((d: any) => d.chainId === 4663)
  );
  console.log(`Found ${tokens.length} stock tokens.`);

  const clRes = await fetch('https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json');
  if (!clRes.ok) throw new Error(`Failed to fetch Chainlink feeds: HTTP ${clRes.status}`);
  const feeds = await clRes.json();
  console.log(`Found ${feeds.length} Chainlink feeds.`);

  const feedMap: Record<string, string> = {};
  
  const abi = parseAbi([
    'function description() view returns (string)',
    'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  ]);
  
  let validFeeds = 0;
  
  // Note: Multicall3 is NOT deployed on Robinhood Chain, so viem's multicall fails.
  // We will use Promise.all in small chunks to simulate concurrent fetching without multicall3.
  console.log('Validating feeds (without multicall3 because it is unsupported on this chain)...');
  
  for (const feed of feeds) {
    const symbolMatch = feed.name.match(/([A-Z]+)\s*\//);
    if (!symbolMatch) continue;
    const symbol = symbolMatch[1];
    
    const token = tokens.find((t: any) => t.tokenSymbol === symbol);
    if (token) {
      const tokenAddr = token.deployments.find((d: any) => d.chainId === 4663).contractAddress.toLowerCase();
      try {
        const desc = await client.readContract({
          address: feed.contractAddress,
          abi,
          functionName: 'description',
        });
        const roundData = await client.readContract({
          address: feed.contractAddress,
          abi,
          functionName: 'latestRoundData',
        });
        if (desc.includes(symbol) && roundData[1] > 0n) {
          feedMap[tokenAddr] = feed.contractAddress;
          validFeeds++;
        }
      } catch (e: any) {
        console.log(`Validation failed for feed ${feed.name}: ${e.message.split('\n')[0]}`);
      }
    }
  }

  console.log(`Mapped ${validFeeds} valid feeds to tokens.`);
  report.step1 = {
    totalTokens: tokens.length,
    feedsMapped: validFeeds,
    feedMap,
  };
}

async function runStep2() {
  console.log('--- Step 2: Pool via DexScreener ---');
  const res = await fetch('https://api.dexscreener.com/latest/dex/search?q=NVDA');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  
  const pools = data.pairs?.filter((p: any) => p.chainId === 'robinhood').slice(0, 3).map((p: any) => ({
    poolId: p.pairAddress,
    token0: p.baseToken.address,
    token1: p.quoteToken.address,
    liquidity: p.liquidity?.usd,
  })) || [];
  
  console.log(`Found ${pools.length} pools.`);
  report.step2 = { pools };
  
  if (pools.length === 0) {
    throw new Error('Failed to find any pools on DexScreener for stock tokens.');
  }
}

async function runStep3() {
  console.log('--- Step 3: Read StateView ---');
  report.step3 = {
    error: 'StateView or PoolManager address is unknown. Cannot read sqrtPriceX96 autonomously without guessing.'
  };
  throw new Error('StateView or PoolManager address is unknown. Cannot read sqrtPriceX96 autonomously without guessing.');
}

async function main() {
  try {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL is missing in environment variables. Cannot proceed with archive RPC tasks.');
    }

    const maskedUrl = new URL(rpcUrl).hostname;
    console.log(`Using RPC Host: ${maskedUrl}`);

    const client = createPublicClient({
      chain: robinhoodChain,
      transport: http(rpcUrl),
    });

    await checkArchiveNode(client);
    await runStep1(client);
    await runStep2();
    await runStep3();
    // step 4-6 will go here

  } catch (error: any) {
    console.error('\nRecon failed:', error.message);
    report.error = error.message;
  }
  
  writeFileSync('recon-output.json', JSON.stringify(report, null, 2));
  console.log('Saved recon-output.json');
}

main();
