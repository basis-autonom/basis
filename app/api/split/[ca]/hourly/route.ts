import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { getBlockByTimestamp } from "../../../../../packages/core/blocks";
import { robinhoodChain, V4_STATE_VIEW } from "../../../../../packages/core/chain";
import { getPoolForToken } from "../../../../../packages/core/pools";
import { getStockTokenByAddress } from "../../../../../packages/core/registry";
import { Address } from "../../../../../packages/core/types";

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(process.env.RPC_URL),
});

const stateViewAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
]);
const decimalsAbi = parseAbi([
  "function decimals() view returns (uint8)",
]);
const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

const HOUR_MS = 60 * 60 * 1000;
const POINT_COUNT = 12;
const POINT_INTERVAL_MS = 2 * HOUR_MS;
const FEED_ROUND_COUNT = 96;

type Slot0 = readonly [bigint, number, number, number];
type RoundData = readonly [bigint, bigint, bigint, bigint, bigint];
type HourlyPoint = { t: number; meme: number | null; stock: number | null };

function successful<T>(result: { status?: string; result?: unknown } | undefined): T | null {
  return result?.status === "success" ? (result.result as T) : null;
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
  const [currency0, currency1] = token0 < token1
    ? [token0, token1]
    : [token1, token0];
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

function priceAtOrBefore(
  targetMs: number,
  rounds: RoundData[],
): number | null {
  const targetSeconds = BigInt(Math.floor(targetMs / 1000));
  const round = rounds
    .filter((candidate) => candidate[3] <= targetSeconds)
    .sort((a, b) => Number(b[3] - a[3]))[0];

  if (!round) return null;
  const price = Number(round[1]) / 1e8;
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function readHourly(tokenAddress: Address): Promise<{
  kind: "ok" | "no_pool" | "no_stock_leg";
  tokenAddress: Address;
  interval: "2h";
  points: HourlyPoint[];
}> {
  const empty = (kind: "no_pool" | "no_stock_leg") => ({
    kind,
    tokenAddress,
    interval: "2h" as const,
    points: [],
  });

  const pool = await getPoolForToken(tokenAddress);
  if (!pool) return empty("no_pool");

  const stockAddress = (
    pool.stockSide === 0 ? pool.token0 : pool.token1
  ).toLowerCase() as Address;
  const stock = await getStockTokenByAddress(stockAddress);
  if (!stock) return empty("no_stock_leg");

  const now = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const timestamps = Array.from(
    { length: POINT_COUNT },
    (_, index) => now - (POINT_COUNT - 1 - index) * POINT_INTERVAL_MS,
  );

  // Token decimals are part of the same current metadata batch; no made-up
  // 18-decimal fallback is used when either read fails.
  const decimalResults = await client.multicall({
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
  });
  const token0Decimals = successful<number>(decimalResults[0]);
  const token1Decimals = successful<number>(decimalResults[1]);

  // A time-travelled eth_call can only use one block number per multicall.
  // Therefore each historical block gets one viem multicall containing all
  // StateView reads for that block (one call here), with low concurrency to
  // avoid creating a 429 burst. No point is interpolated.
  const blocks = await mapWithConcurrency(
    timestamps,
    async (timestamp) => {
      try {
        return await getBlockByTimestamp(timestamp);
      } catch {
        return null;
      }
    },
    4,
  );
  const slots = await mapWithConcurrency(
    blocks,
    async (block) => {
      if (block === null) return null;
      try {
        const [result] = await client.multicall({
          contracts: [
            {
              address: V4_STATE_VIEW as Address,
              abi: stateViewAbi,
              functionName: "getSlot0" as const,
              args: [pool.address],
            },
          ],
          blockNumber: block,
        });
        return successful<Slot0>(result);
      } catch {
        return null;
      }
    },
    4,
  );

  let rounds: RoundData[] = [];
  try {
    const latest = await client.readContract({
      address: stock.feed,
      abi: feedAbi,
      functionName: "latestRoundData",
    }) as RoundData;
    const roundCalls = Array.from({ length: FEED_ROUND_COUNT }, (_, index) => {
      const roundId = latest[0] - BigInt(index);
      return {
        address: stock.feed,
        abi: feedAbi,
        functionName: "getRoundData" as const,
        args: [roundId],
      };
    });
    const roundResults = await client.multicall({ contracts: roundCalls });
    rounds = [latest, ...roundResults
      .map((result) => successful<RoundData>(result))
      .filter((result): result is RoundData => result !== null)];
  } catch {
    rounds = [];
  }

  const ratios = slots.map((slot) =>
    ratioFromSlot(slot, pool, stockAddress, token0Decimals, token1Decimals),
  );
  const prices = timestamps.map((timestamp) => priceAtOrBefore(timestamp, rounds));

  const points = timestamps.map((t, index): HourlyPoint => {
    if (index === 0 || ratios[index] === null) {
      return { t, meme: null, stock: null };
    }

    const previousRatio = ratios[index - 1];
    const currentRatio = ratios[index];
    const previousPrice = prices[index - 1];
    const currentPrice = prices[index];

    return {
      t,
      meme:
        previousRatio !== null && previousRatio > 0 && currentRatio !== null
          ? (currentRatio / previousRatio - 1) * 100
          : null,
      stock:
        previousPrice !== null && previousPrice > 0 && currentPrice !== null
          ? (currentPrice / previousPrice - 1) * 100
          : null,
    };
  });

  return { kind: "ok", tokenAddress, interval: "2h", points };
}

const getCachedHourly = unstable_cache(
  async (tokenAddress: Address) => readHourly(tokenAddress),
  ["split-hourly-v4"],
  { revalidate: 300 },
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ca: string }> },
) {
  const { ca } = await params;
  const tokenAddress = ca.toLowerCase() as Address;

  try {
    // Response contract for TerminalChart:
    // { kind, tokenAddress, interval: "2h", points: [{ t, meme, stock }] }
    // meme/stock are percentage points; null means that point is unavailable.
    const result = await getCachedHourly(tokenAddress);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error(`Error reading hourly split for ${tokenAddress}:`, error);
    return NextResponse.json(
      { kind: "error", tokenAddress, interval: "1h", points: [] },
      { status: 500 },
    );
  }
}
