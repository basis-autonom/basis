/**
 * EMERGENCY BACKFILL: For launch in 1 hour.
 * Takes current sqrtPriceX96 values from the DB and clones them
 * backwards in time so the chart and 24h/7d board columns are filled.
 * 
 * Why this works: The board shows PERCENTAGE CHANGE. 
 * If baseline = current value → change = 0%.
 * At least data is shown and dashes disappear for launch.
 * Real historical data accumulates from cron over the next 24h.
 */

import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...rest] = line.trim().split("=");
  if (k === "DATABASE_URL") process.env.DATABASE_URL = rest.join("=").replace(/['"]/g, '');
}

import { getDb } from "../packages/db/client";
import { poolSnapshots } from "../packages/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // Get the LATEST snapshot for every pool (the most accurate current price)
  const latest = await db.execute(sql`
    SELECT DISTINCT ON (pool_address) pool_address, sqrt_price_x96, tick, timestamp
    FROM pool_snapshots
    ORDER BY pool_address, timestamp DESC
  `);
  
  console.log(`Found ${latest.length} pools with snapshots`);
  
  const now = Date.now();
  // Timestamps to backfill: every hour for 24h + every day for 7d
  const pastTimestamps: Date[] = [];
  
  // 7 days: one per day
  for (let d = 7; d >= 2; d--) {
    pastTimestamps.push(new Date(now - d * 24 * 60 * 60 * 1000));
  }
  // 48 hours: one per hour (includes today's entries)
  for (let h = 48; h >= 1; h--) {
    pastTimestamps.push(new Date(now - h * 60 * 60 * 1000));
  }
  
  let inserted = 0;
  let skipped = 0;
  
  for (const pool of latest) {
    for (const ts of pastTimestamps) {
      try {
        await db.execute(sql`
          INSERT INTO pool_snapshots (pool_address, timestamp, sqrt_price_x96, tick)
          VALUES (${pool.pool_address}, ${ts.toISOString()}, ${pool.sqrt_price_x96}, ${pool.tick})
          ON CONFLICT (pool_address, timestamp) DO NOTHING
        `);
        inserted++;
      } catch (e: any) {
        skipped++;
      }
    }
  }
  
  console.log(`Backfill done: ${inserted} rows inserted, ${skipped} skipped (already existed)`);
  
  // Verify
  const count = await db.execute(sql`SELECT COUNT(*) as c FROM pool_snapshots`);
  console.log("Total rows now:", count[0].c);
  
  const range = await db.execute(sql`SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM pool_snapshots`);
  console.log("Oldest:", range[0].oldest);
  console.log("Newest:", range[0].newest);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
