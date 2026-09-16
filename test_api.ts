import { getBoardData } from './packages/core/board.ts';
import { getRobinhoodPools } from "./packages/core/pools.ts";
async function run() {
  try {
    const data = await getBoardData(10);
    console.log("Success! Length:", data.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
