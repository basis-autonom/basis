import { getDb, closeDb } from "../packages/db/client";
import { sql } from "drizzle-orm";
import * as fs from "fs";

const env = fs.readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  if (line.trim().startsWith("DATABASE_URL=")) {
    process.env.DATABASE_URL = line.trim().substring("DATABASE_URL=".length).replace(/['"]/g, '');
  }
}

async function main() {
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pool_snapshots'
      );
    `);
    console.log("Table pool_snapshots exists:", result[0].exists);

    if (result[0].exists) {
      const count = await db.execute(sql`SELECT count(*) FROM pool_snapshots`);
      console.log("Snapshot count:", count[0].count);
    }
  } catch (error) {
    console.error("Failed to connect or query DB:", error.message);
  } finally {
    await closeDb();
  }
}
main();
