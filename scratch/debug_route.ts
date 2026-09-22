import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  if (line.trim().startsWith("DATABASE_URL=")) {
    process.env.DATABASE_URL = line.trim().substring("DATABASE_URL=".length).replace(/['"]/g, '');
  }
}

import { getSnapshotsForPool } from "../packages/db/queries";

async function main() {
  const ts = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snapshots = await getSnapshotsForPool("0x82ef09793c78f7cb6a2b6696fcdca8e1c3581e18", ts);
  if (snapshots.length > 0) {
    console.log(typeof snapshots[0].timestamp);
    console.log(snapshots[0].timestamp instanceof Date);
  }
}
main();
