import { NextResponse } from "next/server";
import { getCachedBoardData } from "@/packages/core/board";
import { getCachedWeekFeedObservations } from "@/packages/core/hours";

export const dynamic = "force-dynamic";

async function registryIsReachable() {
  const [assetsResponse, feedsResponse] = await Promise.all([
    fetch("https://api.robinhood.com/rhj/assets", { cache: "no-store" }),
    fetch("https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json", { cache: "no-store" }),
  ]);
  if (!assetsResponse.ok || !feedsResponse.ok) return false;
  const assets = (await assetsResponse.json()) as { assets?: unknown };
  const feeds = await feedsResponse.json();
  return Array.isArray(assets.assets) && Array.isArray(feeds);
}

export async function GET() {
  try {
    if (!(await registryIsReachable())) {
      return NextResponse.json({
        kind: "error",
        source: "registry",
        message: "The official stock-token registry could not be reached.",
      });
    }

    const [boardResult, weekHistory] = await Promise.all([
      getCachedBoardData(12),
      getCachedWeekFeedObservations(),
    ]);

    if (boardResult.kind === "error") throw new Error("RPC error");
    return NextResponse.json({
      kind: "success",
      data: boardResult.data,
      weekHistory,
    });
  } catch {
    return NextResponse.json({
      kind: "error",
      source: "chain",
      message: "The hours snapshot could not complete its RPC chain read.",
    });
  }
}
