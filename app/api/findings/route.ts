import { NextRequest, NextResponse } from "next/server";
import { listFindings } from "@/packages/db/findings";
import type { Finding } from "@/packages/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  GET /api/findings?limit=20
  Response:
  {
    kind: "success",
    data: {
      findings: Array<{
        id: number,
        detectedAt: string,
        tokenAddress: string,
        symbol: string | null,
        stockPair: string | null,
        priceMovement: number | null,
        memeComponent: number | null,
        stockComponent: number | null,
        liquidity: number | null
      }>,
      limit: number
    }
  }
*/

function serializeFinding(finding: Finding) {
  return {
    id: finding.id,
    detectedAt: finding.detectedAt.toISOString(),
    tokenAddress: finding.tokenAddress,
    symbol: finding.symbol,
    stockPair: finding.stockPair,
    priceMovement: finding.priceMovement,
    memeComponent: finding.memeComponent,
    stockComponent: finding.stockComponent,
    liquidity: finding.liquidity,
  };
}

export async function GET(request: NextRequest) {
  const rawLimit = request.nextUrl.searchParams.get("limit") ?? "20";
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { kind: "error", error: "limit must be an integer between 1 and 100." },
      { status: 400 },
    );
  }

  try {
    const findings = await listFindings(limit);
    return NextResponse.json({
      kind: "success",
      data: {
        findings: findings.map(serializeFinding),
        limit,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        kind: "error",
        error: error instanceof Error ? error.message : "Findings could not be read.",
      },
      { status: 503 },
    );
  }
}
