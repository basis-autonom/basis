import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  if (line.trim().startsWith("DATABASE_URL=")) {
    process.env.DATABASE_URL = line.trim().substring("DATABASE_URL=".length).replace(/['"]/g, '');
  }
}

import { getBaselineSnapshots } from "../packages/db/queries";
import { closeDb } from "../packages/db/client";

async function main() {
  const ts = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const addrs = ["0xd5effce87036cd858146c0c15fa825c231a9de1843200ca108e431e431331e8e"];
  const res = await getBaselineSnapshots(addrs, ts);
  console.log(res);
}
main().finally(closeDb);
