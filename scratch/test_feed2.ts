import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...rest] = line.trim().split("=");
  if (k === "RPC_URL") process.env.RPC_URL = rest.join("=").replace(/['"]/g, '');
}
import { client } from "../packages/core/chain";
import { parseAbi } from "viem";

const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
]);

async function main() {
  console.log("Testing feed via current client (Alchemy fallback to public RPC)...");
  try {
    const result = await client.readContract({
      address: "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0",
      abi: feedAbi,
      functionName: "latestRoundData",
    });
    console.log("Feed OK! roundId:", result[0].toString(), "answer:", result[1].toString());
  } catch(e: any) {
    console.log("Feed FAILED:", e.message?.slice(0, 300));
  }
}
main();
