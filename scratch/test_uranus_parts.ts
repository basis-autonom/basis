import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain, V4_STATE_VIEW } from "../packages/core/chain";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

async function main() {
  const pool = {
    address: "0x52a261a40fd3cbeab71e903d8aa9eac1c11d75aff4bcf0551573e09d5f7e720e",
    token0: "0xb911f04a24a9f6234537829290335e623ee71e18",
    token1: "0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea"
  };

  const decimalsAbi = parseAbi(["function decimals() view returns (uint8)"]);
  console.log("Fetching decimals...");
  try {
    const decimalResults = await client.multicall({
      contracts: [
        { address: pool.token0 as any, abi: decimalsAbi, functionName: "decimals" as const },
        { address: pool.token1 as any, abi: decimalsAbi, functionName: "decimals" as const },
      ],
    });
    console.log("Decimals:", decimalResults);
  } catch (e) {
    console.log("Decimals failed:", e);
  }

  const stockFeed = "0xc40A8118fD33330772De5Be4C6e2587a07489BA3"; // SPCX feed doesn't exist? Wait, getStockTokenByAddress
  // Actually, SPCX feed might be different. Let's find SPCX feed in registry.
}
main().catch(console.error);
