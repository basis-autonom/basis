import { capturePoolSnapshots } from "../packages/core/snapshots";
import { closeDb } from "../packages/db/client";

async function main() {
  const inserted = await capturePoolSnapshots();
  console.log(`Inserted ${inserted} snapshots.`);
}

main().finally(closeDb);
