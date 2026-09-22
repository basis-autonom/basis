import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...rest] = line.trim().split("=");
  if (k === "RPC_URL") process.env.RPC_URL = rest.join("=").replace(/['"]/g, '');
}
import { client } from "../packages/core/chain";
import { parseAbi } from "viem";

const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
]);

const FEED = "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0";

async function main() {
  const latest = await client.readContract({ address: FEED, abi: feedAbi, functionName: "latestRoundData" }) as any;
  console.log("Latest roundId:", latest[0].toString());
  
  // Try 96 rounds multicall (same as the route does)
  const FEED_ROUND_COUNT = 96;
  const calls = Array.from({ length: FEED_ROUND_COUNT }, (_, i) => ({
    address: FEED,
    abi: feedAbi,
    functionName: "getRoundData" as const,
    args: [latest[0] - BigInt(i)],
  }));
  
  console.log("Firing 96-round multicall...");
  try {
    const results = await client.multicall({ contracts: calls });
    const successes = results.filter(r => r.status === "success").length;
    console.log(`OK: ${successes}/${FEED_ROUND_COUNT} rounds succeeded`);
  } catch(e: any) {
    console.log("Multicall FAILED:", e.message?.slice(0, 300));
  }
}
main();
