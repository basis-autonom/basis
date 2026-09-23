/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...rest] = line.trim().split("=");
  if (k === "DATABASE_URL")
    process.env.DATABASE_URL = rest.join("=").replace(/['"]/g, "");
}
import { getDb } from "../packages/db/client";
import { sql } from "drizzle-orm";
async function main() {
  const db = getDb();
  const rows = await db.execute(
    sql`SELECT DISTINCT pool_address FROM pool_snapshots LIMIT 5`,
  );
  for (const r of rows as any[]) console.log(r.pool_address);
}
main().then(() => process.exit(0));
