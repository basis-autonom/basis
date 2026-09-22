import { capturePoolSnapshots } from "../packages/core/snapshots";
import { closeDb } from "../packages/db/client";

async function main() {
  console.log("Starting...");
  const inserted = await capturePoolSnapshots();
  console.log(`Inserted ${inserted} snapshots.`);
}

main().catch(console.error).finally(closeDb);
