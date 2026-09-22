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

  // Rows with EXACT hour boundary = backfill (script used new Date(now - h * 3600000) with no seconds/ms)
  const backfillRows = await db.execute(sql`
    SELECT COUNT(*) as c FROM pool_snapshots
    WHERE date_trunc('hour', timestamp) = timestamp
  `);
  console.log("BACKFILL rows (exact hour boundary):", (backfillRows as any)[0].c);

  const realRows = await db.execute(sql`
    SELECT COUNT(*) as c FROM pool_snapshots
    WHERE date_trunc('hour', timestamp) != timestamp
  `);
  console.log("REAL cron rows (non-exact-hour):", (realRows as any)[0].c);

  // Show some real cron rows
  const sampleReal = await db.execute(sql`
    SELECT pool_address, timestamp, sqrt_price_x96 FROM pool_snapshots
    WHERE date_trunc('hour', timestamp) != timestamp
    ORDER BY timestamp DESC LIMIT 5
  `);
  console.log("\nSample REAL cron rows:");
  for (const r of sampleReal as any[]) {
    console.log(`  ${String(r.timestamp)} | price=${String(r.sqrt_price_x96).slice(0,20)}...`);
  }

  // Show per-pool distinct prices to confirm backfill = single price
  const perPool = await db.execute(sql`
    SELECT pool_address,
           COUNT(*) as total,
           COUNT(DISTINCT sqrt_price_x96) as distinct_prices,
           SUM(CASE WHEN date_trunc('hour', timestamp) = timestamp THEN 1 ELSE 0 END) as backfill_count,
           SUM(CASE WHEN date_trunc('hour', timestamp) != timestamp THEN 1 ELSE 0 END) as real_count
    FROM pool_snapshots
    GROUP BY pool_address
    ORDER BY total DESC LIMIT 5
  `);
  console.log("\nPer-pool (top 5):");
  for (const r of perPool as any[]) {
    console.log(`  pool=${String(r.pool_address).slice(2,16)}... total=${r.total} distinct_prices=${r.distinct_prices} backfill=${r.backfill_count} real=${r.real_count}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
