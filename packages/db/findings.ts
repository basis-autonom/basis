import { desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { findings, type Finding, type NewFinding } from "./schema";

export async function insertFindingIfNew(
  finding: NewFinding,
): Promise<Finding | null> {
  const [inserted] = await getDb()
    .insert(findings)
    .values(finding)
    .onConflictDoNothing({
      target: [findings.tokenAddress, findings.reportedOn],
    })
    .returning();

  return inserted ?? null;
}

export async function listFindings(limit: number): Promise<Finding[]> {
  return getDb()
    .select()
    .from(findings)
    .orderBy(desc(findings.detectedAt), desc(findings.id))
    .limit(limit);
}

export async function listFindingsForToken(
  tokenAddress: string,
): Promise<Finding[]> {
  return getDb()
    .select()
    .from(findings)
    .where(eq(findings.tokenAddress, tokenAddress.toLowerCase()))
    .orderBy(desc(findings.detectedAt), desc(findings.id));
}
