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

  // Total rows
  const total = await db.execute(sql`SELECT COUNT(*) as c FROM pool_snapshots`);
  console.log("Total rows:", (total as any)[0].c);

  // Timestamp range
  const range = await db.execute(sql`SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM pool_snapshots`);
  console.log("Oldest:", (range as any)[0].oldest);
  console.log("Newest:", (range as any)[0].newest);

  // How many distinct sqrtPriceX96 per pool (if backfill = all same value, distinct count will be 1)
  const distinctPerPool = await db.execute(sql`
    SELECT pool_address, COUNT(*) as total_rows, COUNT(DISTINCT sqrt_price_x96) as distinct_prices, MIN(timestamp) as oldest, MAX(timestamp) as newest
    FROM pool_snapshots
    GROUP BY pool_address
    ORDER BY total_rows DESC
    LIMIT 10
  `);
  console.log("\nPer-pool stats (top 10):");
  for (const r of distinctPerPool as any[]) {
    console.log(`  ${r.pool_address.slice(0,20)}... rows=${r.total_rows} distinct_prices=${r.distinct_prices} oldest=${r.oldest?.toISOString().slice(0,16)} newest=${r.newest?.toISOString().slice(0,16)}`);
  }

  // Find rows that were inserted with the exact same sqrtPriceX96 as the current latest (the backfill)
  // The backfill script used timestamp < "now - 1h" so real cron data should have been inserted at actual time
  // Backfill timestamps were exact hour boundaries (e.g., now - 1h, now - 2h etc.) while cron data has non-round timestamps
  const hourBoundaryRows = await db.execute(sql`
    SELECT COUNT(*) as c FROM pool_snapshots
    WHERE EXTRACT(MINUTE FROM timestamp) = 0 AND EXTRACT(SECOND FROM timestamp) = 0
  `);
  console.log("\nRows with EXACT hour boundary (0m 0s) - these are the backfill rows:", (hourBoundaryRows as any)[0].c);

  const realCronRows = await db.execute(sql`
    SELECT COUNT(*) as c FROM pool_snapshots
    WHERE NOT (EXTRACT(MINUTE FROM timestamp) = 0 AND EXTRACT(SECOND FROM timestamp) = 0)
  `);
  console.log("Rows with non-round timestamps (real cron data):", (realCronRows as any)[0].c);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
