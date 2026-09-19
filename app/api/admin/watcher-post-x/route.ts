import { NextRequest, NextResponse } from "next/server";
import {
  getWatcherPostXEnabled,
  setWatcherPostXEnabled,
} from "@/packages/db/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ kind: "error", error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json({
      kind: "success",
      watcherPostX: await getWatcherPostXEnabled(),
    });
  } catch (error) {
    return NextResponse.json(
      { kind: "error", error: error instanceof Error ? error.message : "Setting could not be read." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ kind: "error", error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ kind: "error", error: "Body must be JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as { enabled?: unknown }).enabled !== "boolean") {
    return NextResponse.json(
      { kind: "error", error: "Body must contain boolean enabled." },
      { status: 400 },
    );
  }

  try {
    const enabled = (body as { enabled: boolean }).enabled;
    await setWatcherPostXEnabled(enabled);
    return NextResponse.json({ kind: "success", watcherPostX: enabled });
  } catch (error) {
    return NextResponse.json(
      { kind: "error", error: error instanceof Error ? error.message : "Setting could not be saved." },
      { status: 503 },
    );
  }
}
