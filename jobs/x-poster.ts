import { countXPostsForDay, hasXPostForFinding, recordXPost } from "../packages/db/x-posts";
import type { Finding } from "../packages/db/schema";

const MAX_POSTS_PER_DAY = 3;

export type XPostFinding = Pick<
  Finding,
  | "id"
  | "detectedAt"
  | "tokenAddress"
  | "symbol"
  | "stockPair"
  | "priceMovement"
  | "memeComponent"
  | "stockComponent"
  | "liquidity"
>;

export type XPostPlan = {
  finding: XPostFinding;
  text: string;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number) {
  return value.toFixed(Math.abs(value) < 0.1 ? 2 : 1);
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function publicBaseUrl() {
  const configured = process.env.BASIS_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return "https://basis-eight-zeta.vercel.app";
}

function isPostable(finding: XPostFinding): boolean {
  return Boolean(
    finding.id &&
      finding.tokenAddress &&
      finding.symbol &&
      finding.stockPair &&
      finiteNumber(finding.priceMovement) &&
      finiteNumber(finding.memeComponent) &&
      finiteNumber(finding.stockComponent) &&
      finiteNumber(finding.liquidity),
  );
}

export function formatXPost(finding: XPostFinding, baseUrl = publicBaseUrl()) {
  if (!isPostable(finding)) return null;

  const priceMovement = finding.priceMovement as number;
  const memeComponent = finding.memeComponent as number;

  return [
    `$${finding.symbol} moved ${formatNumber(priceMovement)}% today. Its meme did ${formatNumber(memeComponent)}% of that.`,
    `The rest is ${finding.stockPair}.`,
    "",
    `${baseUrl}/c/${finding.tokenAddress}`,
  ].join("\n");
}

export function buildXPostPlan(
  findings: XPostFinding[],
  options: { now?: Date; baseUrl?: string; limit?: number; sameDayOnly?: boolean } = {},
): XPostPlan[] {
  const now = options.now ?? new Date();
  const limit = Math.min(options.limit ?? MAX_POSTS_PER_DAY, MAX_POSTS_PER_DAY);
  const baseUrl = options.baseUrl ?? publicBaseUrl();

  const plan = findings
    .filter(isPostable)
    .sort((a, b) => {
      const liquidityDiff = (b.liquidity ?? 0) - (a.liquidity ?? 0);
      if (liquidityDiff !== 0) return liquidityDiff;
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    })
    .map((finding) => ({ finding, text: formatXPost(finding, baseUrl)! }))
    .filter(({ finding }) => options.sameDayOnly === false || utcDay(finding.detectedAt) === utcDay(now))
    .slice(0, limit);

  return plan;
}

function dryRunEnabled() {
  return process.env.X_DRY_RUN?.trim().toLowerCase() !== "false";
}

async function sendToX(text: string, forceDryRun = false) {
  if (forceDryRun || dryRunEnabled()) {
    console.log("[x:dry-run] posting the following content:");
    console.log(text);
    return { dryRun: true, externalId: null };
  }

  const accessToken = process.env.X_USER_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("X_USER_ACCESS_TOKEN is required when X_DRY_RUN=false.");
  }

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`X API returned ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as { data?: { id?: string } };
  return { dryRun: false, externalId: body.data?.id ?? null };
}

export async function dryRunXPostPreview(
  findings: XPostFinding[],
  options: { now?: Date; baseUrl?: string; limit?: number } = {},
) {
  const plan = buildXPostPlan(findings, {
    ...options,
    sameDayOnly: false,
  });
  const results = [];

  for (const candidate of plan) {
    results.push({
      findingId: candidate.finding.id,
      ...(await sendToX(candidate.text, true)),
    });
  }

  return { attempted: results.length, results };
}

export async function postFindingsToX(
  findings: XPostFinding[],
  options: { now?: Date; baseUrl?: string } = {},
) {
  const now = options.now ?? new Date();
  const postedOn = utcDay(now);
  const alreadyPosted = await countXPostsForDay(postedOn);
  const available = Math.max(0, MAX_POSTS_PER_DAY - alreadyPosted);
  const candidates = buildXPostPlan(findings, { ...options, now, limit: available });
  const results: Array<{ findingId: number; dryRun: boolean; externalId: string | null }> = [];

  for (const candidate of candidates) {
    if (await hasXPostForFinding(candidate.finding.id)) continue;
    const result = await sendToX(candidate.text);
    if (!result.dryRun) {
      await recordXPost({
        findingId: candidate.finding.id,
        postedOn,
        content: candidate.text,
        externalId: result.externalId,
      });
    }
    results.push({ findingId: candidate.finding.id, ...result });
  }

  return {
    attempted: results.length,
    skippedForDailyLimit: Math.max(0, findings.length - candidates.length),
    results,
  };
}

export function getXPostBaseUrl() {
  return publicBaseUrl();
}
