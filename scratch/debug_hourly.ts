import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  if (line.trim().startsWith("DATABASE_URL=")) {
    process.env.DATABASE_URL = line.trim().substring("DATABASE_URL=".length).replace(/['"]/g, '');
  }
}

import { getSnapshotsForPool } from "../packages/db/queries";
import { closeDb } from "../packages/db/client";

async function main() {
  const snapshots = await getSnapshotsForPool("0xd5effce87036cd858146c0c15fa825c231a9de1843200ca108e431e431331e8e", new Date(0));
  for (const s of snapshots) {
    console.log(s.timestamp.getTime(), s.timestamp.toISOString(), s.sqrtPriceX96);
  }
}
main().finally(closeDb);
