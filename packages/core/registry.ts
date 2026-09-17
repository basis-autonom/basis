/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain } from "./chain";
import { Address, StockToken } from "./types";

let cachedRegistry: StockToken[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

export async function fetchRegistryOriginal(): Promise<StockToken[]> {
  const now = Date.now();
  if (cachedRegistry && now - lastFetchTime < CACHE_TTL) {
    return cachedRegistry;
  }

  const [assetsRes, feedsRes] = await Promise.all([
    fetch("https://api.robinhood.com/rhj/assets").then((r) => r.json()),
    fetch(
      "https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json",
    ).then((r) => r.json()),
  ]);

  const tokens = assetsRes.assets.filter((a: any) =>
    a.deployments?.some((d: any) => d.chainId === 4663),
  );

  const descAbi = parseAbi(["function description() view returns (string)"]);
  const actionAbi = parseAbi([
    "function uiMultiplier() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ]);

  const tokensWithFeed: Array<{
    token: any;
    address: Address;
    symbol: string;
    feedAddress: Address;
  }> = [];

  for (const token of tokens) {
    const deployment = token.deployments?.find((d: any) => d.chainId === 4663);
    const address = deployment?.contractAddress?.toLowerCase() as Address;
    const symbol = token.tokenSymbol;
    if (!address) continue;

    // Find matching feed
    let feedAddress: Address | null = null;
    for (const feed of feedsRes) {
      const symbolMatch = feed.name.match(/([A-Z]+)\s*\//);
      if (symbolMatch && symbolMatch[1] === symbol) {
        feedAddress = feed.proxyAddress
          ? (feed.proxyAddress.toLowerCase() as Address)
          : (feed.contractAddress.toLowerCase() as Address);
        break;
      }
    }

    if (feedAddress) {
      tokensWithFeed.push({ token, address, symbol, feedAddress });
    }
  }

  // Multicall for uiMultiplier and totalSupply across ALL tokens at once (1 request instead of 60)
  const supplyCalls = tokensWithFeed.flatMap((t) => [
    {
      address: t.address,
      abi: actionAbi,
      functionName: "uiMultiplier" as const,
    },
    {
      address: t.address,
      abi: actionAbi,
      functionName: "totalSupply" as const,
    },
  ]);

  let supplyResults: any[] = [];
  try {
    supplyResults = await client.multicall({ contracts: supplyCalls });
  } catch (e) {
    console.error("Multicall failed in fetchRegistry", e);
  }

  const stockTokens: StockToken[] = [];
  for (let i = 0; i < tokensWithFeed.length; i++) {
    const { token, address, symbol, feedAddress } = tokensWithFeed[i];
    const multRes = supplyResults[i * 2];
    const supplyRes = supplyResults[i * 2 + 1];

    const multiplierRaw =
      multRes?.status === "success" ? multRes.result : 1000000000000000000n;
    const totalSupplyRaw =
      supplyRes?.status === "success" ? supplyRes.result : 0n;

    stockTokens.push({
      address,
      symbol,
      name: token.name,
      feed: feedAddress,
      multiplier: Number(multiplierRaw) / 1e18,
      totalSupply: (totalSupplyRaw as bigint).toString(),
    });
  }

  cachedRegistry = stockTokens;
  lastFetchTime = now;
  return stockTokens;
}

export async function getStockTokenBySymbol(
  symbol: string,
): Promise<StockToken | null> {
  const registry = await fetchRegistry();
  return registry.find((t) => t.symbol === symbol) || null;
}

export async function getStockTokenByAddress(
  address: Address,
): Promise<StockToken | null> {
  const registry = await fetchRegistry();
  const lowerAddress = address.toLowerCase();
  return registry.find((t) => t.address === lowerAddress) || null;
}

export async function fetchRegistry(): Promise<StockToken[]> {
  try {
    return await fetchRegistryOriginal();
  } catch (error) {
    // Never substitute invented stock addresses or feeds. The terminal must
    // show an honest empty state until the official registry is reachable.
    console.warn("fetchRegistry failed", error);
    return cachedRegistry ?? [];
  }
}
