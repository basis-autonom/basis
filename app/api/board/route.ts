/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getBoardData } from "@/packages/core/board";
import { unstable_cache } from "next/cache";

// Per user instruction: Use unstable_cache with revalidate: 300 (5 mins) instead of KV or cron jobs.
const getCachedBoardData = unstable_cache(
  async () => getBoardData(50),
  ["board-data-v2"],
  { revalidate: 300 },
);

export async function GET() {
  try {
    const result = await getCachedBoardData();
    if (result.kind === "error") return NextResponse.json(result, { status: 503 });
    return NextResponse.json({ kind: "success", data: result.data });
  } catch (e: any) {
    return NextResponse.json(
      { kind: "error", error: e.message },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
