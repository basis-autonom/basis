/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getBoardData } from "@/packages/core/board";
import { unstable_cache } from "next/cache";

// Per user instruction: Use unstable_cache with revalidate: 300 (5 mins) instead of KV or cron jobs.
const getCachedBoardData = unstable_cache(
  async () => {
    return await getBoardData(50);
  },
  ["board-data"],
  { revalidate: 300 },
);

export async function GET() {
  try {
    const data = await getCachedBoardData();
    return NextResponse.json({ kind: "success", data });
  } catch (e: any) {
    return NextResponse.json(
      { kind: "error", error: e.message },
      { status: 500 },
    );
  }
}
