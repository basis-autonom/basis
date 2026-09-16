/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain } from "../packages/core/chain";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
});

const addresses = [
  "0xC79D199C7BcA812B1AD11f2F446524C5BB185BE7",
  "0xCc38D26F6EAbf36bd40887Ea6911B897269D868B",
  "0xd485ffdB2F2E6330F5D479E1992E84344736Eb05",
];

const abi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function factory() view returns (address)",
  "function getReserves() view returns (uint112, uint112, uint32)", // V2
  "function fee() view returns (uint24)", // V3
]);

async function main() {
  for (const addr of addresses) {
    console.log("Testing", addr);
    try {
      const t0 = await client.readContract({
        address: addr as any,
        abi,
        functionName: "token0",
      });
      console.log("  token0:", t0);
      try {
        await client.readContract({
          address: addr as any,
          abi,
          functionName: "fee",
        });
        console.log("  -> Seems like V3");
      } catch (e) {
        console.log("  -> Seems like V2 (no fee())");
      }
    } catch (e: any) {
      console.log(
        "  not a pool contract (no token0):",
        e.message.split("\n")[0],
      );
    }
  }
}

main().catch(console.error);
