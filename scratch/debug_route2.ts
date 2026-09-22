import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  if (line.trim().startsWith("DATABASE_URL=")) {
    process.env.DATABASE_URL = line.trim().substring("DATABASE_URL=".length).replace(/['"]/g, '');
  }
}

import { getDb, closeDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  // Get a pool that has snapshots
  const stats = await db.execute(sql`SELECT pool_address, count(*) as c FROM pool_snapshots GROUP BY pool_address LIMIT 1`);
  console.log("Pool from DB:", stats[0]);
  
  // Now get token for this pool?
}
main().finally(closeDb);
