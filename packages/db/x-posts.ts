import { count, eq } from "drizzle-orm";
import { getDb } from "./client";
import { xPostRecords } from "./schema";

export async function countXPostsForDay(postedOn: string) {
  const [result] = await getDb()
    .select({ count: count() })
    .from(xPostRecords)
    .where(eq(xPostRecords.postedOn, postedOn));

  return Number(result?.count ?? 0);
}

export async function hasXPostForFinding(findingId: number) {
  const [result] = await getDb()
    .select({ id: xPostRecords.id })
    .from(xPostRecords)
    .where(eq(xPostRecords.findingId, findingId))
    .limit(1);

  return result != null;
}

export async function recordXPost(input: {
  findingId: number;
  postedOn: string;
  content: string;
  externalId?: string | null;
}) {
  const [record] = await getDb()
    .insert(xPostRecords)
    .values(input)
    .onConflictDoNothing({ target: xPostRecords.findingId })
    .returning();

  return record ?? null;
}
