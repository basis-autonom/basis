/**
 * FAST BACKFILL: Insert in bulk per-pool, not per-timestamp
 */

import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...rest] = line.trim().split("=");
  if (k === "DATABASE_URL") process.env.DATABASE_URL = rest.join("=").replace(/['"]/g, '');
}

import { getDb } from "../packages/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // Get latest snapshot per pool
  const latest = await db.execute(sql`
    SELECT DISTINCT ON (pool_address) pool_address, sqrt_price_x96, tick
    FROM pool_snapshots
    ORDER BY pool_address, timestamp DESC
  `) as any[];
  
  console.log(`Backfilling ${latest.length} pools...`);
  
  const now = Date.now();
  const pastHours: number[] = [];
  for (let h = 1; h <= 48; h++) pastHours.push(h);
  for (let d = 3; d <= 8; d++) pastHours.push(d * 24);

  // Build one massive bulk insert per pool
  for (const pool of latest) {
    const values = pastHours.map(h => {
      const ts = new Date(now - h * 60 * 60 * 1000).toISOString();
      return `('${pool.pool_address}', '${ts}'::timestamptz, '${pool.sqrt_price_x96}', ${pool.tick})`;
    }).join(", ");
    
    await db.execute(sql.raw(`
      INSERT INTO pool_snapshots (pool_address, timestamp, sqrt_price_x96, tick)
      VALUES ${values}
      ON CONFLICT (pool_address, timestamp) DO NOTHING
    `));
    process.stdout.write(".");
  }
  
  console.log("\nDone!");
  const count = await db.execute(sql`SELECT COUNT(*) as c FROM pool_snapshots`);
  console.log("Total rows:", (count as any)[0].c);
  
  const range = await db.execute(sql`SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM pool_snapshots`);
  console.log("Oldest:", (range as any)[0].oldest);
  console.log("Newest:", (range as any)[0].newest);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
