import { parseAbi } from "viem";
import { client } from "./chain";
import { fetchRegistry } from "./registry";
import { unstable_cache } from "next/cache";

const clAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80 roundId) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

export type DayObservation = {
  day: string; // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  dateLabel: string;
  state: "live" | "frozen" | "mixed" | "upcoming";
  label: string;
  sublabel: string;
  roundCount: number;
  activeFeedsCount: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Computes observed feed states for each day of the current week
 * by inspecting actual Chainlink round updates directly on chain.
 */
export async function computeWeekFeedObservations(): Promise<DayObservation[]> {
  const now = new Date();
  
  // Format current day in America/New_York
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const currentWeekday = formatter.format(now).split(",")[0];
  const currentDayIndex = WEEKDAYS.indexOf(currentWeekday) === -1 ? 2 : WEEKDAYS.indexOf(currentWeekday);

  // Determine dates for Mon-Sun of current week
  // Sunday of previous week or Monday of current week
  const mondayOffset = currentDayIndex * 86400000;
  const mondayTime = now.getTime() - mondayOffset;

  const registry = await fetchRegistry();
  const feedsWithProxy = registry.filter((t) => t.feed != null).slice(0, 15);

  // Tally rounds by day
  const dailyUpdates: Record<string, { roundCount: number; feeds: Set<string> }> = {
    Mon: { roundCount: 0, feeds: new Set() },
    Tue: { roundCount: 0, feeds: new Set() },
    Wed: { roundCount: 0, feeds: new Set() },
    Thu: { roundCount: 0, feeds: new Set() },
    Fri: { roundCount: 0, feeds: new Set() },
    Sat: { roundCount: 0, feeds: new Set() },
    Sun: { roundCount: 0, feeds: new Set() },
  };

  try {
    // 1. Read latestRoundData for feeds
    const latestCalls = feedsWithProxy.map((f) => ({
      address: f.feed!,
      abi: clAbi,
      functionName: "latestRoundData" as const,
    }));
    const latestResults = await client.multicall({ contracts: latestCalls });

    // 2. Build multicalls for past 20 rounds per feed
    const historicalCalls: Array<{
      address: `0x${string}`;
      abi: typeof clAbi;
      functionName: "getRoundData";
      args: [bigint];
      symbol: string;
    }> = [];

    for (let i = 0; i < feedsWithProxy.length; i++) {
      const res = latestResults[i];
      if (res.status !== "success") continue;
      const data = res.result as [bigint, bigint, bigint, bigint, bigint];
      const latestRoundId = data[0];
      const symbol = feedsWithProxy[i].symbol;

      for (let r = 0n; r < 20n; r++) {
        if (latestRoundId - r < 0n) break;
        historicalCalls.push({
          address: feedsWithProxy[i].feed!,
          abi: clAbi,
          functionName: "getRoundData",
          args: [latestRoundId - r],
          symbol,
        });
      }
    }

    if (historicalCalls.length > 0) {
      const histResults = await client.multicall({
        contracts: historicalCalls.map(({ address, abi, functionName, args }) => ({
          address,
          abi,
          functionName,
          args,
        })),
      });

      for (let idx = 0; idx < histResults.length; idx++) {
        const hRes = histResults[idx];
        if (hRes.status !== "success") continue;
        const rData = hRes.result as [bigint, bigint, bigint, bigint, bigint];
        const updatedAtSeconds = Number(rData[3]);
        if (!updatedAtSeconds) continue;

        const updateDate = new Date(updatedAtSeconds * 1000);
        const dayStr = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          weekday: "short",
        }).format(updateDate);

        if (dailyUpdates[dayStr]) {
          dailyUpdates[dayStr].roundCount++;
          dailyUpdates[dayStr].feeds.add(historicalCalls[idx].symbol);
        }
      }
    }
  } catch (err) {
    console.error("Failed to read onchain rounds for week history:", err);
  }

  // Build the 7 days observation
  const result: DayObservation[] = WEEKDAYS.map((day, idx) => {
    const dayDate = new Date(mondayTime + idx * 86400000);
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
    }).format(dayDate);

    if (idx < currentDayIndex) {
      // Past day: decide based on actual on-chain rounds recorded
      const data = dailyUpdates[day];
      const hasUpdates = data && data.roundCount > 0;
      if (hasUpdates) {
        return {
          day,
          dateLabel,
          state: "live",
          label: "feed live",
          sublabel: "observed onchain rounds",
          roundCount: data.roundCount,
          activeFeedsCount: data.feeds.size,
        };
      } else {
        return {
          day,
          dateLabel,
          state: "frozen",
          label: "feed frozen",
          sublabel: "no rounds observed",
          roundCount: 0,
          activeFeedsCount: 0,
        };
      }
    } else if (idx === currentDayIndex) {
      // Today: will be augmented by client or live observation
      const data = dailyUpdates[day];
      return {
        day,
        dateLabel,
        state: "mixed",
        label: "mixed feed state",
        sublabel: "latest Chainlink observation",
        roundCount: data ? data.roundCount : 0,
        activeFeedsCount: data ? data.feeds.size : 0,
      };
    } else {
      // Future day: genuinely hasn't happened yet
      return {
        day,
        dateLabel,
        state: "upcoming",
        label: "no snapshot for this day",
        sublabel: "upcoming",
        roundCount: 0,
        activeFeedsCount: 0,
      };
    }
  });

  return result;
}

export const getCachedWeekFeedObservations = unstable_cache(
  async () => computeWeekFeedObservations(),
  ["week-feed-observations-v1"],
  { revalidate: 1800 } // revalidate every 30 mins
);
