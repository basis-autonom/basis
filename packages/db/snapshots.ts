import { getDb } from "./client";
import { poolSnapshots, type NewPoolSnapshot } from "./schema";
import { sql } from "drizzle-orm";

export async function insertPoolSnapshots(snapshots: NewPoolSnapshot[]) {
  if (snapshots.length === 0) return 0;
  
  await getDb()
    .insert(poolSnapshots)
    .values(snapshots)
    .onConflictDoNothing({ target: [poolSnapshots.poolAddress, poolSnapshots.timestamp] });

  return snapshots.length;
}

/**
 * For each pool address, return the first snapshot in the window
 * [targetTs, targetTs + maxDriftMs]. Snapshots outside this window are
 * NOT returned — the caller should treat a missing entry as unavailable (—).
 *
 * Default drifts per window:
 *   24h  → 2 hours  (7_200_000 ms)
 *   7d   → 4 hours  (14_400_000 ms)
 *   30d  → 12 hours (43_200_000 ms)
 */
export async function getBaselineSnapshots(
  poolAddresses: string[],
  targetTs: Date,
  maxDriftMs: number,
) {
  if (poolAddresses.length === 0) return [];

  const addrs = poolAddresses.map((a) => `'${a.toLowerCase()}'`).join(",");
  const minIso = targetTs.toISOString();
  const maxIso = new Date(targetTs.getTime() + maxDriftMs).toISOString();

  // DISTINCT ON keeps the row with the smallest timestamp for each pool.
  const query = sql.raw(`
    SELECT pool_address, timestamp, sqrt_price_x96, tick
    FROM (
      SELECT DISTINCT ON (pool_address)
        pool_address, timestamp, sqrt_price_x96, tick
      FROM pool_snapshots
      WHERE pool_address IN (${addrs})
        AND timestamp >= '${minIso}'
        AND timestamp <= '${maxIso}'
      ORDER BY pool_address, timestamp ASC
    ) sub
  `);

  const res = await getDb().execute(query);
  return res as unknown as Array<{
    pool_address: string;
    timestamp: Date;
    sqrt_price_x96: string;
    tick: number;
  }>;
}

/**
 * Return the earliest snapshot ever recorded for a pool, regardless of
 * timestamp. Used as the clamped-pool baseline (since launch).
 */
export async function getEarliestSnapshotForPool(poolAddress: string) {
  const addr = poolAddress.toLowerCase();
  const query = sql.raw(`
    SELECT pool_address, timestamp, sqrt_price_x96, tick
    FROM pool_snapshots
    WHERE pool_address = '${addr}'
    ORDER BY timestamp ASC
    LIMIT 1
  `);

  const res = await getDb().execute(query);
  const rows = res as unknown as Array<{
    pool_address: string;
    timestamp: Date;
    sqrt_price_x96: string;
    tick: number;
  }>;
  return rows[0] ?? null;
}

/**
 * Bulk return earliest snapshots for multiple pools in a single query.
 */
export async function getEarliestSnapshots(poolAddresses: string[]) {
  if (poolAddresses.length === 0) return [];

  const addrs = poolAddresses.map((a) => `'${a.toLowerCase()}'`).join(",");
  const query = sql.raw(`
    SELECT pool_address, timestamp, sqrt_price_x96, tick
    FROM (
      SELECT DISTINCT ON (pool_address)
        pool_address, timestamp, sqrt_price_x96, tick
      FROM pool_snapshots
      WHERE pool_address IN (${addrs})
      ORDER BY pool_address, timestamp ASC
    ) sub
  `);

  const res = await getDb().execute(query);
  return res as unknown as Array<{
    pool_address: string;
    timestamp: Date;
    sqrt_price_x96: string;
    tick: number;
  }>;
}

