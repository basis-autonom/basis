import { writeFileSync, readFileSync } from 'fs';
import { createPublicClient, http, parseAbi, toEventSelector } from 'viem';
import { robinhoodChain } from '../packages/core/chain';

const report: any = {};

const V4_ADDRESSES = {
  PoolManager: '0x8366a39CC670B4001A1121B8F6A443A643e40951',
  StateView: '0xF3334192D15450CdD385c8B70e03f9A6bD9E673b',
  UniversalRouter: '0x06AfBA43Fd06227fA663b0DAecF536f6EaA6bf99',
  Quoter: '0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94',
};

async function getBlockByTimestamp(client: any, targetMs: number) {
  const targetTs = BigInt(Math.floor(targetMs / 1000));
  let low = 0n;
  let high = await client.getBlockNumber();
  let best = high;
  
  while (low <= high) {
    const mid = (low + high) / 2n;
    const block = await client.getBlock({ blockNumber: mid });
    if (block.timestamp === targetTs) return mid;
    if (block.timestamp < targetTs) {
      low = mid + 1n;
      best = mid;
    } else {
      high = mid - 1n;
    }
  }
  return best;
}

async function runVerificationAndSteps(client: any) {
  // Step 1: Feeds and tokens
  const res = await fetch('https://api.robinhood.com/rhj/assets');
  const data = await res.json();
  const tokens = data.assets.filter((a: any) => a.deployments?.some((d: any) => d.chainId === 4663));
  
  const clRes = await fetch('https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json');
  const feeds = await clRes.json();
  const feedMap: Record<string, string> = {};
  
  const descAbi = parseAbi(['function description() view returns (string)']);
  
  for (const feed of feeds) {
    const symbolMatch = feed.name.match(/([A-Z]+)\s*\//);
    if (!symbolMatch) continue;
    const symbol = symbolMatch[1];
    
    const token = tokens.find((t: any) => t.tokenSymbol === symbol);
    if (token) {
      const tokenAddr = token.deployments.find((d: any) => d.chainId === 4663).contractAddress.toLowerCase();
      try {
        const desc = await client.readContract({ address: feed.contractAddress, abi: descAbi, functionName: 'description' });
        if (desc.includes(symbol)) {
          feedMap[tokenAddr] = feed.contractAddress;
        }
      } catch (e: any) {}
    }
  }

  // Verification 1-3
  console.log('--- Verification ---');
  report.verification = {};
  
  for (const [name, addr] of Object.entries(V4_ADDRESSES)) {
    const code = await client.getBytecode({ address: addr as `0x${string}` });
    if (!code || code === '0x') throw new Error(`${name} contract has no bytecode at ${addr}`);
  }
  report.verification.bytecode = 'OK';

  const dexRes = await fetch('https://api.dexscreener.com/latest/dex/search?q=NVDA');
  const dexData = await dexRes.json();
  const nvdaPool = dexData.pairs?.find((p: any) => p.chainId === 'robinhood');
  if (!nvdaPool) throw new Error('Could not find NVDA pool on DexScreener.');
  const poolId = nvdaPool.pairAddress;
  console.log(`Using real CA for verification: ${nvdaPool.baseToken.address} vs ${nvdaPool.quoteToken.address} (Pool: ${poolId})`);

  const stateViewAbi = parseAbi(['function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)']);
  const slot0 = await client.readContract({
    address: V4_ADDRESSES.StateView as `0x${string}`,
    abi: stateViewAbi,
    functionName: 'getSlot0',
    args: [poolId as `0x${string}`],
  });
  if (slot0[0] === 0n) throw new Error('StateView returned sqrtPriceX96 = 0 for the pool. Incorrect address or pool.');
  report.verification.getSlot0 = 'OK';

  const initTopic = toEventSelector('Initialize(bytes32,uint160,int24)');
  const targetBlock = await getBlockByTimestamp(client, nvdaPool.pairCreatedAt);
  let foundInit = false;
  for (let offset = -50n; offset <= 50n; offset += 9n) {
    const from = targetBlock + offset;
    const to = from + 9n;
    try {
      const logs = await client.getLogs({
        address: V4_ADDRESSES.PoolManager as `0x${string}`,
        topics: [initTopic, poolId as `0x${string}`],
        fromBlock: from > 0n ? from : 0n,
        toBlock: to,
      });
      if (logs.length > 0) {
        foundInit = true;
        break;
      }
    } catch (e: any) {}
  }
  
  if (!foundInit) {
    throw new Error('Failed to find Initialize event in a short block range.');
  }
  report.verification.initializeEvent = 'OK';
  console.log('Verification passed.');

  // Step 3
  console.log('--- Step 3: Read StateView ---');
  const currentBlock = await client.getBlockNumber();
  const oldBlock = currentBlock - 6048000n;
  
  let slot0Old: any;
  try {
    slot0Old = await client.readContract({
      address: V4_ADDRESSES.StateView as `0x${string}`,
      abi: stateViewAbi,
      functionName: 'getSlot0',
      args: [poolId as `0x${string}`],
      blockNumber: oldBlock,
    });
  } catch (error: any) {
    throw new Error(`Archive read for getSlot0 failed at block ${oldBlock}: ${error.message.split('\n')[0]}`);
  }
  report.step3 = {
    latestSqrtPriceX96: slot0[0].toString(),
    oldSqrtPriceX96: slot0Old[0].toString(),
  };

  // Step 4
  console.log('--- Step 4: Chainlink History ---');
  const nvdaTokenAddr = nvdaPool.quoteToken.address.toLowerCase();
  const feedAddress = feedMap[nvdaTokenAddr];
  if (!feedAddress) throw new Error('Could not find valid feed address for NVDA in step 1 mapping.');

  const clAbi = parseAbi(['function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)', 'function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)']);
  
  let latest = await client.readContract({ address: feedAddress as `0x${string}`, abi: clAbi, functionName: 'latestRoundData' });
  const latestPrice = latest[1];
  const targetTs = BigInt(Math.floor(Date.now()/1000)) - (7n * 24n * 3600n);
  
  let roundId = latest[0];
  let points = 0;
  let maxSilent = 0n;
  let lastUpdatedAt = latest[3];
  let phaseChanged = false;
  const initialPhase = roundId >> 64n;
  let oldestPrice = latestPrice;
  
  while (true) {
    try {
      const data = await client.readContract({ address: feedAddress as `0x${string}`, abi: clAbi, functionName: 'getRoundData', args: [roundId] });
      points++;
      const currentPhase = roundId >> 64n;
      if (currentPhase !== initialPhase) phaseChanged = true;
      
      const diff = lastUpdatedAt - data[3];
      if (diff > maxSilent) maxSilent = diff;
      
      lastUpdatedAt = data[3];
      oldestPrice = data[1];
      if (data[3] < targetTs) break;
      roundId--;
    } catch (e: any) {
      if (e.message.includes('No data present')) break;
      throw new Error(`getRoundData failed: ${e.message.split('\n')[0]}`);
    }
    if (points > 300) break;
  }
  
  report.step4 = {
    dataPointsEvaluated: points,
    maxSilentPeriodSeconds: maxSilent.toString(),
    phaseChanged,
  };

  // Step 5
  console.log('--- Step 5: Attribution Calculation ---');
  const pL = Number(slot0[0]) ** 2;
  const pO = Number(slot0Old[0]) ** 2;
  // Note: we might need to invert poolRatio if quoteToken is token0 vs token1
  const poolRatioChange = (pL / pO) - 1;
  const stockChange = (Number(latestPrice) / Number(oldestPrice)) - 1;
  const total = ((1 + poolRatioChange) * (1 + stockChange)) - 1;
  
  report.step5 = {
    memeComponent: poolRatioChange,
    stockComponent: stockChange,
    totalAttribution: total,
    debug: {
      latestPrice: latestPrice.toString(),
      oldestPrice: oldestPrice.toString()
    }
  };

  // Step 6
  console.log('--- Step 6: Corporate Actions & Grip ---');
  const actionAbi = parseAbi([
    'function uiMultiplier() view returns (uint256)',
    'function newUIMultiplier() view returns (uint256)',
    'function effectiveAt() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ]);
  
  const results: any[] = [];
  const uimTopic = toEventSelector('UIMultiplierUpdated(uint256,uint256)');
  
  for (const t of tokens.slice(0, 10)) {
    const addr = t.deployments.find((d: any) => d.chainId === 4663).contractAddress;
    const ui = await client.readContract({ address: addr, abi: actionAbi, functionName: 'uiMultiplier' });
    const nui = await client.readContract({ address: addr, abi: actionAbi, functionName: 'newUIMultiplier' });
    const eff = await client.readContract({ address: addr, abi: actionAbi, functionName: 'effectiveAt' });
    const ts = await client.readContract({ address: addr, abi: actionAbi, functionName: 'totalSupply' });
    const bal = await client.readContract({ address: addr, abi: actionAbi, functionName: 'balanceOf', args: [V4_ADDRESSES.PoolManager as `0x${string}`] });
    
    results.push({
      symbol: t.tokenSymbol,
      uiMultiplier: ui.toString(),
      newUIMultiplier: nui.toString(),
      effectiveAt: eff.toString(),
      rawTotalSupply: ts.toString(),
      rawBalanceOfPoolManager: bal.toString(),
      gripAmmPercent: (Number(bal) / Number(ts)) * 100,
    });
    
    try {
      await client.getLogs({
        address: addr as `0x${string}`,
        topics: [uimTopic],
        fromBlock: 0n,
        toBlock: 'latest',
      });
    } catch (e: any) {
      if (!report.step6_errors) report.step6_errors = [];
      report.step6_errors.push(`eth_getLogs for ${t.tokenSymbol} rejected.`);
    }
  }
  report.step6 = { tokens: results };
}

async function main() {
  try {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) throw new Error('RPC_URL is missing.');
    const client = createPublicClient({ chain: robinhoodChain, transport: http(rpcUrl) });
    await runVerificationAndSteps(client);
  } catch (error: any) {
    console.error('\nRecon failed:', error.message);
    report.error = error.message;
  }
  writeFileSync('recon-output.json', JSON.stringify(report, null, 2));
  console.log('Saved recon-output.json');
}
main();
