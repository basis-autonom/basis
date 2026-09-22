import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain } from "../packages/core/chain";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL || 'https://rpc.robinhood.com'),
});

async function main() {
  const address = "0xb911f04a24a9f6234537829290335e623ee71e18"; // Uranus CA
  const decimalsAbi = parseAbi(["function decimals() view returns (uint8)"]);
  try {
    const res = await client.multicall({
      contracts: [{ address: address as any, abi: decimalsAbi, functionName: "decimals" }]
    });
    console.log("Result:", res);
  } catch(e) {
    console.error("Error:", e);
  }
}
main().catch(console.error);
