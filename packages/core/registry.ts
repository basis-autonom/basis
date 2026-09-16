import { createPublicClient, http, parseAbi } from 'viem';
import { robinhoodChain } from './chain';
import { Address, StockToken } from './types';

let cachedRegistry: StockToken[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

export async function fetchRegistry(): Promise<StockToken[]> {
  const now = Date.now();
  if (cachedRegistry && now - lastFetchTime < CACHE_TTL) {
    return cachedRegistry;
  }

  const [assetsRes, feedsRes] = await Promise.all([
    fetch('https://api.robinhood.com/rhj/assets').then(r => r.json()),
    fetch('https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json').then(r => r.json()),
  ]);

  const tokens = assetsRes.assets.filter((a: any) => 
    a.deployments?.some((d: any) => d.chainId === 4663)
  );

  const descAbi = parseAbi(['function description() view returns (string)']);
  const actionAbi = parseAbi(['function uiMultiplier() view returns (uint256)', 'function totalSupply() view returns (uint256)']);
  
  const stockTokens: StockToken[] = [];

  for (const token of tokens) {
    const deployment = token.deployments.find((d: any) => d.chainId === 4663);
    const address = deployment.contractAddress.toLowerCase() as Address;
    const symbol = token.tokenSymbol;
    
    // Find matching feed
    let feedAddress: Address | null = null;
    for (const feed of feedsRes) {
      const symbolMatch = feed.name.match(/([A-Z]+)\s*\//);
      if (symbolMatch && symbolMatch[1] === symbol) {
        try {
          const desc = await client.readContract({
            address: feed.contractAddress as Address,
            abi: descAbi,
            functionName: 'description',
          });
          if (desc.includes(symbol)) {
            feedAddress = feed.proxyAddress ? feed.proxyAddress.toLowerCase() as Address : feed.contractAddress.toLowerCase() as Address;
            break;
          }
        } catch (e) {
          // ignore failures on misconfigured feeds
        }
      }
    }

    if (feedAddress) {
      // Get raw total supply and multiplier
      try {
        const [multiplierRaw, totalSupplyRaw] = await Promise.all([
          client.readContract({ address, abi: actionAbi, functionName: 'uiMultiplier' }),
          client.readContract({ address, abi: actionAbi, functionName: 'totalSupply' }),
        ]);

        stockTokens.push({
          address,
          symbol,
          name: token.name,
          feed: feedAddress,
          multiplier: Number(multiplierRaw) / 1e18, // scaled for easy UI math
          totalSupply: (totalSupplyRaw as bigint).toString(), // raw string
        });
      } catch (e) {
        console.error(`Failed to fetch supply for ${symbol}`, e);
      }
    }
  }

  cachedRegistry = stockTokens;
  lastFetchTime = now;
  return stockTokens;
}

export async function getStockTokenBySymbol(symbol: string): Promise<StockToken | null> {
  const registry = await fetchRegistry();
  return registry.find(t => t.symbol === symbol) || null;
}

export async function getStockTokenByAddress(address: Address): Promise<StockToken | null> {
  const registry = await fetchRegistry();
  const lowerAddress = address.toLowerCase();
  return registry.find(t => t.address === lowerAddress) || null;
}
