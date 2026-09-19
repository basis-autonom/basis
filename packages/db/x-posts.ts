import { and, count, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "./client";
import { xPostRecords } from "./schema";

const ACTIVE_STATUSES = ["reserved", "sent"] as const;
const RESERVATION_TIMEOUT_MS = 15 * 60 * 1000;

export type XPostReservation = {
  recordId: number;
  findingId: number;
  postedOn: string;
  content: string;
};

export async function countXPostsForDay(postedOn: string) {
  const [result] = await getDb()
    .select({ count: count() })
    .from(xPostRecords)
    .where(
      and(
        eq(xPostRecords.postedOn, postedOn),
        inArray(xPostRecords.status, [...ACTIVE_STATUSES]),
      ),
    );

  return Number(result?.count ?? 0);
}

/**
 * Reserve the daily posting slots while holding a transaction-scoped
 * advisory lock. The X request is made only after this function returns.
 */
export async function reserveXPostSlots(
  candidates: Array<{ findingId: number; postedOn: string; content: string }>,
  postedOn: string,
  maxSlots: number,
): Promise<XPostReservation[]> {
  if (candidates.length === 0 || maxSlots <= 0) return [];

  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`basis:x-post:${postedOn}`}))`,
    );

    const staleBefore = new Date(Date.now() - RESERVATION_TIMEOUT_MS);
    await tx
      .update(xPostRecords)
      .set({ status: "failed" })
      .where(
        and(
          eq(xPostRecords.status, "reserved"),
          lt(xPostRecords.createdAt, staleBefore),
        ),
      );

    const [activeResult] = await tx
      .select({ count: count() })
      .from(xPostRecords)
      .where(
        and(
          eq(xPostRecords.postedOn, postedOn),
          inArray(xPostRecords.status, [...ACTIVE_STATUSES]),
        ),
      );

    let remaining = Math.max(0, maxSlots - Number(activeResult?.count ?? 0));
    if (remaining === 0) return [];

    const findingIds = candidates.map((candidate) => candidate.findingId);
    const existing = await tx
      .select({
        id: xPostRecords.id,
        findingId: xPostRecords.findingId,
        status: xPostRecords.status,
      })
      .from(xPostRecords)
      .where(inArray(xPostRecords.findingId, findingIds));
    const existingByFindingId = new Map(
      existing.map((record) => [record.findingId, record]),
    );
    const reservations: XPostReservation[] = [];

    for (const candidate of candidates) {
      if (remaining === 0) break;

      const record = existingByFindingId.get(candidate.findingId);
      if (
        record &&
        ACTIVE_STATUSES.includes(
          record.status as (typeof ACTIVE_STATUSES)[number],
        )
      ) {
        continue;
      }

      if (record) {
        await tx
          .update(xPostRecords)
          .set({
            postedOn,
            content: candidate.content,
            status: "reserved",
            externalId: null,
            createdAt: new Date(),
          })
          .where(eq(xPostRecords.id, record.id));

        reservations.push({
          recordId: record.id,
          findingId: candidate.findingId,
          postedOn,
          content: candidate.content,
        });
      } else {
        const [inserted] = await tx
          .insert(xPostRecords)
          .values({
            findingId: candidate.findingId,
            postedOn,
            content: candidate.content,
            status: "reserved",
          })
          .returning({ id: xPostRecords.id });

        if (!inserted) continue;
        reservations.push({
          recordId: inserted.id,
          findingId: candidate.findingId,
          postedOn,
          content: candidate.content,
        });
      }

      remaining -= 1;
    }

    return reservations;
  });
}

export async function completeXPost(recordId: number, externalId: string | null) {
  await getDb()
    .update(xPostRecords)
    .set({ status: "sent", externalId })
    .where(eq(xPostRecords.id, recordId));
}

export async function failXPost(recordId: number) {
  await getDb()
    .update(xPostRecords)
    .set({ status: "failed" })
    .where(eq(xPostRecords.id, recordId));
}
