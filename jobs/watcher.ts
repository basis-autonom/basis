import { getBoardData } from "../packages/core/board";
import { insertFindingIfNew } from "../packages/db/findings";
import type { Finding } from "../packages/db/schema";
import { fileURLToPath } from "node:url";

const PRICE_MOVEMENT_THRESHOLD = 3;
const MEME_COMPONENT_THRESHOLD = 1;
const LIQUIDITY_THRESHOLD = 10_000;

type BoardRow = {
  ca?: unknown;
  coin?: unknown;
  quote?: unknown;
  chg24h?: unknown;
  meme24h?: unknown;
  stock24h?: unknown;
  liquidity?: unknown;
};

export type WatcherRunResult = {
  enabled: boolean;
  scanned: number;
  detected: number;
  stored: number;
  duplicates: number;
  findings: Finding[];
};

function watcherEnabled() {
  return process.env.WATCHER_ENABLED?.trim().toLowerCase() !== "false";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isFinding(row: BoardRow) {
  const priceMovement = finiteNumber(row.chg24h);
  const memeComponent = finiteNumber(row.meme24h);
  const liquidity = finiteNumber(row.liquidity);

  return (
    priceMovement !== null &&
    memeComponent !== null &&
    liquidity !== null &&
    Math.abs(priceMovement) >= PRICE_MOVEMENT_THRESHOLD &&
    Math.abs(memeComponent) <= MEME_COMPONENT_THRESHOLD &&
    liquidity >= LIQUIDITY_THRESHOLD
  );
}

function toNewFinding(row: BoardRow, detectedAt: Date) {
  const tokenAddress = textOrNull(row.ca)?.toLowerCase();
  if (!tokenAddress) return null;

  return {
    detectedAt,
    reportedOn: utcDay(detectedAt),
    tokenAddress,
    symbol: textOrNull(row.coin),
    stockPair: textOrNull(row.quote),
    priceMovement: finiteNumber(row.chg24h),
    memeComponent: finiteNumber(row.meme24h),
    stockComponent: finiteNumber(row.stock24h),
    liquidity: finiteNumber(row.liquidity),
  };
}

export async function runWatcher(): Promise<WatcherRunResult> {
  if (!watcherEnabled()) {
    return {
      enabled: false,
      scanned: 0,
      detected: 0,
      stored: 0,
      duplicates: 0,
      findings: [],
    };
  }

  // The watcher reads the finished board values. It does not calculate any
  // price or attribution component itself.
  const board = (await getBoardData(100)) as BoardRow[];
  const detectedAt = new Date();
  const candidates = board.filter(isFinding);
  const findings: Finding[] = [];

  for (const row of candidates) {
    const finding = toNewFinding(row, detectedAt);
    if (!finding) continue;

    const inserted = await insertFindingIfNew(finding);
    if (inserted) findings.push(inserted);
  }

  return {
    enabled: true,
    scanned: board.length,
    detected: candidates.length,
    stored: findings.length,
    duplicates: candidates.length - findings.length,
    findings,
  };
}

async function main() {
  const result = await runWatcher();
  console.log(
    JSON.stringify({
      enabled: result.enabled,
      scanned: result.scanned,
      detected: result.detected,
      stored: result.stored,
      duplicates: result.duplicates,
      findings: result.findings,
    }),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
