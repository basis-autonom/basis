/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getCachedBoardData } from "@/packages/core/board";

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
