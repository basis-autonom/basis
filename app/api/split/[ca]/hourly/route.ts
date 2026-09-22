/* eslint-disable @typescript-eslint/no-explicit-any */
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { parseAbi } from "viem";
import { getBlockByTimestamp } from "../../../../../packages/core/blocks";
import {
  client,
  robinhoodChain,
  V4_STATE_VIEW,
} from "../../../../../packages/core/chain";
import { getSnapshotsForPool } from "../../../../../packages/db/queries";
import { getPoolForToken } from "../../../../../packages/core/pools";
import { getStockTokenByAddress } from "../../../../../packages/core/registry";
import {
  Address,
  type HourlyGapReason,
  type HourlyPoint,
  type Window,
} from "../../../../../packages/core/types";

const stateViewAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
]);
const decimalsAbi = parseAbi(["function decimals() view returns (uint8)"]);
const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

const HOUR_MS = 60 * 60 * 1000;
const POINT_COUNT_BY_WINDOW: Record<Window, number> = {
  "24h": 24,
  "7d": 14,
  "30d": 30,
};
const FEED_ROUND_COUNT = 96;

type Slot0 = readonly [bigint, number, number, number];
type RoundData = readonly [bigint, bigint, bigint, bigint, bigint];
type HistoricalSlot = { slot: Slot0 | null; failed: boolean; snapshotTs?: number };

function successful<T>(
  result: { status?: string; result?: unknown } | undefined,
): T | null {
  return result?.status === "success" ? (result.result as T) : null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await delay(250 * (attempt + 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("RPC request failed after retries");
}

function isNasdaqClosed(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour =
    Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const minutes = hour * 60 + minute;
  return !isWeekday || minutes < 9 * 60 + 30 || minutes >= 16 * 60;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  worker: (value: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const output = new Array<R>(values.length);
  let cursor = 0;

  async function run() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await worker(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => run()),
  );
  return output;
}

function ratioFromSlot(
  slot0: Slot0 | null,
  pool: { token0: Address; token1: Address },
  stockAddress: Address,
  token0Decimals: number | null,
  token1Decimals: number | null,
): number | null {
  if (
    slot0 === null ||
    token0Decimals === null ||
    token1Decimals === null ||
    slot0[0] === 0n
  ) {
    return null;
  }

  const token0 = pool.token0.toLowerCase();
  const token1 = pool.token1.toLowerCase();
  const [currency0, currency1] =
    token0 < token1 ? [token0, token1] : [token1, token0];
  const decimals0 = currency0 === token0 ? token0Decimals : token1Decimals;
  const decimals1 = currency1 === token1 ? token1Decimals : token0Decimals;
  const raw = (Number(slot0[0]) / 2 ** 96) ** 2;
  const currency1PerCurrency0 = raw * Math.pow(10, decimals0 - decimals1);

  if (!Number.isFinite(currency1PerCurrency0) || currency1PerCurrency0 <= 0) {
    return null;
  }

  return stockAddress.toLowerCase() === currency1
    ? currency1PerCurrency0
    : 1 / currency1PerCurrency0;
}

function priceAtOrBefore(targetMs: number, rounds: RoundData[]): number | null {
  const targetSeconds = BigInt(Math.floor(targetMs / 1000));
  const round = rounds
    .filter((candidate) => candidate[3] <= targetSeconds)
    .sort((a: any, b: any) => Number(b[3] - a[3]))[0];

  if (!round) return null;
  const price = Number(round[1]) / 1e8;
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function readHourly(
  tokenAddress: Address,
  window: Window,
): Promise<{
  kind: "ok" | "no_pool" | "no_stock_leg";
  tokenAddress: Address;
  window: Window;
  clamped: boolean;
  windowLabel: string;
  interval: string;
  points: HourlyPoint[];
}> {
  const empty = (kind: "no_pool" | "no_stock_leg") => ({
    kind,
    tokenAddress,
    window,
    clamped: false,
    windowLabel: window,
    interval: "—",
    points: [],
  });

  const pool = await getPoolForToken(tokenAddress);
  if (!pool) return empty("no_pool");

  const stockAddress = (
    pool.stockSide === 0 ? pool.token0 : pool.token1
  ).toLowerCase() as Address;
  const stock = await getStockTokenByAddress(stockAddress);
  if (!stock) return empty("no_stock_leg");

  // Keep the last returned sample at the newest available time. The response
  // itself is still cached for five minutes, so it remains a bounded snapshot
  // rather than forcing a full historical RPC scan on every repaint.
  const now = Date.now();
  const requestedStart =
    now -
    (window === "24h"
      ? 24 * HOUR_MS
      : window === "7d"
        ? 7 * 24 * HOUR_MS
        : 30 * 24 * HOUR_MS);
  const clamped =
    pool.createdAt != null &&
    pool.createdAt > requestedStart &&
    pool.createdAt <= now;
  const effectiveStart =
    clamped && pool.createdAt != null ? pool.createdAt : requestedStart;
  const pointCount = POINT_COUNT_BY_WINDOW[window];
  const span = Math.max(HOUR_MS, now - effectiveStart);
  const intervalMs = span / pointCount;
  // Keep a fixed number of contribution bars. Each returned point is the end
  // of one interval, so the internal sample grid has one extra boundary.
  const timestamps = Array.from(
    { length: pointCount + 1 },
    (_, index) => effectiveStart + index * intervalMs,
  );
  const windowLabel = clamped
    ? `since launch, ${Math.max(0, Math.floor((now - effectiveStart) / 86400000))}d`
    : window;

  // Token decimals are part of the same current metadata batch; no made-up
  // 18-decimal fallback is used when either read fails.
  const decimalResults = await withRetry(() =>
    client.multicall({
      contracts: [
        {
          address: pool.token0,
          abi: decimalsAbi,
          functionName: "decimals" as const,
        },
        {
          address: pool.token1,
          abi: decimalsAbi,
          functionName: "decimals" as const,
        },
      ],
    }),
  );
  const token0Decimals = successful<number>(decimalResults[0]);
  const token1Decimals = successful<number>(decimalResults[1]);
  const decimalsFailed = token0Decimals === null || token1Decimals === null;

  // Load snapshots from the database instead of hitting the archive node
  const minTime = new Date(timestamps[0] - HOUR_MS);
  const snapshots = await getSnapshotsForPool(pool.address, minTime);

  const slots: HistoricalSlot[] = timestamps.map((targetTs) => {
    // Find the latest snapshot AT OR BEFORE this timestamp
    const MAX_SNAPSHOT_DRIFT_MS = 90 * 60 * 1000; // 90 minutes

    const candidate = snapshots
      .filter((s: any) => s.timestamp.getTime() <= targetTs)
      .sort(
        (a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];

    // Use candidate only if it's within the tolerance window
    let matching: typeof candidate | undefined =
      candidate && targetTs - candidate.timestamp.getTime() <= MAX_SNAPSHOT_DRIFT_MS
        ? candidate
        : undefined;

    // If no snapshot AT OR BEFORE within tolerance, try the earliest snapshot
    // AFTER targetTs — only valid for the very first bars when DB is fresh.
    if (!matching) {
      const after = snapshots
        .filter((s: any) => s.timestamp.getTime() > targetTs)
        .sort(
          (a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime(),
        )[0];
      if (after && after.timestamp.getTime() - targetTs <= MAX_SNAPSHOT_DRIFT_MS) {
        matching = after;
      }
    }

    if (!matching) {
      return { slot: null, failed: true }; // no snapshot within tolerance
    }

    // Construct fake Slot0 tuple to satisfy ratioFromSlot
    // [sqrtPriceX96, tick, protocolFee, lpFee]
    const slot0 = [
      BigInt(matching.sqrtPriceX96),
      matching.tick,
      0,
      0,
    ] as unknown as Slot0;
    return {
      slot: slot0,
      failed: false,
      snapshotTs: matching.timestamp.getTime(),
    };
  });

  let rounds: RoundData[] = [];
  let feedReadFailed = false;
  try {
    const latest = (await withRetry(() =>
      client.readContract({
        address: stock.feed,
        abi: feedAbi,
        functionName: "latestRoundData",
      }),
    )) as RoundData;
    const roundCalls = Array.from({ length: FEED_ROUND_COUNT }, (_, index) => {
      const roundId = latest[0] - BigInt(index);
      return {
        address: stock.feed,
        abi: feedAbi,
        functionName: "getRoundData" as const,
        args: [roundId],
      };
    });
    const roundResults = await withRetry(() =>
      client.multicall({ contracts: roundCalls }),
    );
    rounds = [
      latest,
      ...roundResults
        .map((result) => successful<RoundData>(result))
        .filter((result): result is RoundData => result !== null),
    ];
  } catch {
    rounds = [];
    feedReadFailed = true;
  }

  const ratios = slots.map(({ slot }) =>
    ratioFromSlot(slot, pool, stockAddress, token0Decimals, token1Decimals),
  );
  const prices = timestamps.map((timestamp) =>
    priceAtOrBefore(timestamp, rounds),
  );

  const points = Array.from({ length: pointCount }, (_, index): HourlyPoint => {
    const sampleIndex = index + 1;
    const previousRatio = ratios[index];
    const currentRatio = ratios[sampleIndex];
    const previousPrice = prices[index];
    const currentPrice = prices[sampleIndex];
    const fetchFailed =
      decimalsFailed ||
      slots[index].failed ||
      slots[sampleIndex].failed ||
      feedReadFailed;
    let gap: HourlyGapReason | null = null;
    if (fetchFailed) {
      gap = "fetch_failed";
    } else if (currentPrice === null || previousPrice === null) {
      gap = isNasdaqClosed(timestamps[sampleIndex])
        ? "market_closed"
        : "fetch_failed";
    }

    return {
      t: timestamps[sampleIndex],
      meme:
        previousRatio !== null && previousRatio > 0 && currentRatio !== null
          ? (currentRatio / previousRatio - 1) * 100
          : null,
      stock:
        previousPrice !== null && previousPrice > 0 && currentPrice !== null
          ? (currentPrice / previousPrice - 1) * 100
          : null,
      gap,
    };
  });

  return {
    kind: "ok",
    tokenAddress,
    window,
    clamped,
    windowLabel,
    interval: `${Math.max(1, Math.round(intervalMs / HOUR_MS))}h`,
    points,
  };
}

const getCachedHourly = unstable_cache(
  async (tokenAddress: Address, window: Window) =>
    readHourly(tokenAddress, window),
  ["split-hourly-v8"],
  { revalidate: 300 },
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ca: string }> },
) {
  const { ca } = await params;
  const tokenAddress = ca.toLowerCase() as Address;
  const requestedWindow = request.nextUrl.searchParams.get("window") || "24h";
  if (
    requestedWindow !== "24h" &&
    requestedWindow !== "7d" &&
    requestedWindow !== "30d"
  ) {
    return NextResponse.json({ error: "Invalid window" }, { status: 400 });
  }

  try {
    // Response contract for TerminalChart:
    // { kind, tokenAddress, window, clamped, windowLabel, interval, points: [{ t, meme, stock }] }
    // meme/stock are percentage points; null means that point is unavailable.
    const result = await getCachedHourly(tokenAddress, requestedWindow);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error(`Error reading hourly split for ${tokenAddress}:`, error);
    return NextResponse.json(
      {
        kind: "error",
        tokenAddress,
        window: requestedWindow,
        interval: "—",
        points: [],
      },
      { status: 500 },
    );
  }
}
