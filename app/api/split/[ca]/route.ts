/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Address } from "../../../../packages/core/types";
import { computeSplit } from "../../../../packages/core/attribution";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ca: string }> },
) {
  const { ca } = await params;
  const normalizedCa = ca.trim().toLowerCase();
  const searchParams = req.nextUrl.searchParams;
  const windowParam = searchParams.get("window") || "7d";

  if (!["24h", "7d", "30d"].includes(windowParam)) {
    return NextResponse.json({ error: "Invalid window" }, { status: 400 });
  }

  try {
    const result = await computeSplit(
      normalizedCa as Address,
      windowParam as "24h" | "7d" | "30d",
    );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate",
      },
    });
  } catch (error: any) {
    console.error(`Error computing split for ${normalizedCa}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
