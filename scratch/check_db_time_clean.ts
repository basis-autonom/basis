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
  try {
    const db = getDb();
    
    const stats = await db.execute(sql`
      SELECT count(*) as total, min(timestamp) as min_ts, max(timestamp) as max_ts 
      FROM pool_snapshots
    `);
    
    console.log("=== RINGKASAN DATABASE ===");
    console.log("Total Snapshots di DB :", stats[0].total);
    console.log("Snapshot PERTAMA      :", new Date(stats[0].min_ts as string).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }));
    console.log("Snapshot TERAKHIR     :", new Date(stats[0].max_ts as string).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }));

    const poolStats = await db.execute(sql`
      SELECT pool_address, count(*) as c
      FROM pool_snapshots
      GROUP BY pool_address
      ORDER BY c DESC
      LIMIT 1
    `);
    
    if (poolStats.length > 0) {
      console.log(`\n=== CONTOH POOL TERATAS ===`);
      console.log(`Pool Address: ${poolStats[0].pool_address}`);
      console.log(`Jumlah Snapshot untuk Pool ini: ${poolStats[0].c}`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await closeDb();
  }
}
main();
