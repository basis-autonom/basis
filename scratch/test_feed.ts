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

// AAPL feed address from registry
async function main() {
  try {
    const result = await client.readContract({
      address: "0x5F17a4a1d0a2dF65A5AC7bD0D4cD0a7AC28beC0" as any,
      abi: feedAbi,
      functionName: "latestRoundData",
    });
    console.log("Feed OK:", result);
  } catch(e: any) {
    console.log("Feed FAILED:", e.message?.slice(0, 200));
  }
}
main();
