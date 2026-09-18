/* eslint-disable @typescript-eslint/no-explicit-any */
import { Address } from "./types";
import type { LatestRoundData } from "./float";
import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain } from "./chain";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const clAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getPrices(
  feedAddress: Address,
  targetMs: number,
  latestOverride?: LatestRoundData,
) {
  const targetTs = BigInt(Math.floor(targetMs / 1000));

  let latest: LatestRoundData | null = latestOverride ?? null;
  if (latest === null) {
    try {
      latest = (await client.readContract({
        address: feedAddress,
        abi: clAbi,
        functionName: "latestRoundData",
      })) as LatestRoundData;
    } catch (e) {
      return { latestPrice: 0, oldPrice: 0, latestUpdatedAt: 0 };
    }
  }
  const latestPrice = Number(latest[1]) / 1e8;
  const lastUpdatedAt = latest[3];

  // If the target is newer than our latest data, return latest for both
  if (targetTs >= lastUpdatedAt) {
    return {
      latestPrice,
      oldPrice: latestPrice,
      latestUpdatedAt: Number(lastUpdatedAt) * 1000,
    };
  }

  let roundId = latest[0];
  const initialPhase = roundId >> BigInt(64);
  let oldestPrice = latestPrice;

  while (true) {
    if (roundId < BigInt(0)) break;

    // Batch 10 rounds to reduce RPC calls and avoid 429
    const batchSize = 10n;
    const calls = [];
    for (let i = 0n; i < batchSize; i++) {
      if (roundId - i < BigInt(0)) break;
      calls.push({
        address: feedAddress,
        abi: clAbi,
        functionName: "getRoundData",
        args: [roundId - i],
      });
    }

    if (calls.length === 0) break;

    try {
      const results = await client.multicall({ contracts: calls });
      let found = false;

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status !== "success") continue;

        const data = res.result as any;
        const rId = data[0];
        const rPrice = Number(data[1]);
        const rStartedAt = data[2];
        const rUpdatedAt = data[3];

        const currentPhase = rId >> BigInt(64);
        if (currentPhase !== initialPhase) {
          // Phase changed, assume oldest is what we had
          found = true;
          break;
        }

        oldestPrice = rPrice / 1e8;
        if (targetTs >= rStartedAt) {
          found = true;
          break; // Found the target
        }
      }

      if (found) break;
      roundId -= batchSize;
    } catch (e: any) {
      if (e.message?.includes("No data present")) {
        break; // Reached end of phase data
      }
      // If rate limit, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    latestPrice,
    oldPrice: oldestPrice,
    latestUpdatedAt: Number(lastUpdatedAt) * 1000,
  };
}
