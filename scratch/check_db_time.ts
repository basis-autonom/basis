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
    
    // 1. Total row count and min/max timestamp
    const stats = await db.execute(sql`
      SELECT count(*) as total, min(timestamp) as min_ts, max(timestamp) as max_ts 
      FROM pool_snapshots
    `);
    console.log("Total Snapshots:", stats[0].total);
    console.log("Oldest Snapshot:", new Date(stats[0].min_ts as string).toISOString());
    console.log("Newest Snapshot:", new Date(stats[0].max_ts as string).toISOString());

    // 2. Specific CA (Uranus: 0x91a2dae9699f0b82540b5886b0d8759c22820ba3)
    const uranusPool = "0x82ef09793c78f7cb6a2b6696fcdca8e1c3581e18"; // Wait, I need the pool address. Let me query the pool address for Uranus CA.
    
    // Instead of hardcoding, let's just group by pool_address and show the counts for the top one.
    const poolStats = await db.execute(sql`
      SELECT pool_address, count(*) as c, array_agg(timestamp ORDER BY timestamp ASC) as times
      FROM pool_snapshots
      GROUP BY pool_address
      LIMIT 1
    `);
    
    if (poolStats.length > 0) {
      console.log(`Pool ${poolStats[0].pool_address}: ${poolStats[0].c} snapshots.`);
      console.log("Timestamps:");
      (poolStats[0].times as any[]).forEach(t => console.log(" - " + new Date(t).toISOString()));
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await closeDb();
  }
}
main();
