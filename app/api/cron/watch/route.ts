import { NextRequest, NextResponse } from "next/server";
import { getBoardData } from "@/packages/core/board";
import { getFloatBoardData } from "@/packages/core/float";
import { runWatcher } from "@/jobs/watcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidCronSecret(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return null;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  const authorized = hasValidCronSecret(request);
  if (authorized === null) {
    return NextResponse.json(
      { kind: "error", error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (!authorized) {
    return NextResponse.json({ kind: "error", error: "Unauthorized." }, { status: 401 });
  }

  try {
    const watcher = await runWatcher();

    // Refresh both existing upstream snapshots on the same 15-minute tick.
    const [board, float] = await Promise.all([
      getBoardData(100),
      getFloatBoardData(),
    ]);
    if (board.kind === "error") throw new Error("RPC error");

    return NextResponse.json({
      kind: "success",
      watcher: {
        enabled: watcher.enabled,
        scanned: watcher.scanned,
        detected: watcher.detected,
        stored: watcher.stored,
        duplicates: watcher.duplicates,
        xPosting: watcher.xPosting,
      },
      refresh: {
        boardRows: board.kind === "success" ? board.data.length : 0,
        floatRows: float.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        kind: "error",
        error: error instanceof Error ? error.message : "Cron watch failed.",
      },
      { status: 500 },
    );
  }
}
