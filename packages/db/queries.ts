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
