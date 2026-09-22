import { getDb } from "./client";
import { poolSnapshots } from "./schema";
import { and, eq, gte, asc } from "drizzle-orm";

export async function getSnapshotsForPool(poolAddress: string, since: Date) {
  return await getDb()
    .select()
    .from(poolSnapshots)
    .where(and(
      eq(poolSnapshots.poolAddress, poolAddress.toLowerCase()),
      gte(poolSnapshots.timestamp, since)
    ))
    .orderBy(asc(poolSnapshots.timestamp));
}

import { sql } from "drizzle-orm";

export async function getBaselineSnapshots(poolAddresses: string[], targetTs: Date) {
  if (poolAddresses.length === 0) return [];
  
  const addrs = poolAddresses.map(a => `'${a.toLowerCase()}'`).join(",");
  
  // Get the first snapshot at or after the target timestamp for each pool
  // PostgreSQL DISTINCT ON is perfect for this.
  const query = sql.raw(`
    SELECT pool_address, timestamp, sqrt_price_x96, tick
    FROM (
      SELECT DISTINCT ON (pool_address) pool_address, timestamp, sqrt_price_x96, tick
      FROM pool_snapshots
      WHERE pool_address IN (${addrs}) AND timestamp >= '${targetTs.toISOString()}'
      ORDER BY pool_address, timestamp ASC
    ) sub
  `);
  
  const res = await getDb().execute(query);
  return res as any[];
}
