/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getCachedFloatBoardData } from "@/packages/core/float";

export async function GET() {
  try {
    const data = await getCachedFloatBoardData();
    return NextResponse.json({ kind: "success", data });
  } catch (e: any) {
    return NextResponse.json(
      { kind: "error", error: e.message },
      { status: 500 },
    );
  }
}
