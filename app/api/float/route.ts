/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getFloatBoardData } from "@/packages/core/float";
import { unstable_cache } from "next/cache";

// Per user instruction: Use unstable_cache with revalidate: 300 (5 mins) instead of KV or cron jobs.
const getCachedFloatData = unstable_cache(
  async () => {
    return await getFloatBoardData();
  },
  ["float-data"],
  { revalidate: 300 },
);

export async function GET() {
  try {
    const data = await getCachedFloatData();
    return NextResponse.json({ kind: "success", data });
  } catch (e: any) {
    return NextResponse.json(
      { kind: "error", error: e.message },
      { status: 500 },
    );
  }
}
