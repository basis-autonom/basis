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
