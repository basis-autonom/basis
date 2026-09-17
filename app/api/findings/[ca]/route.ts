import { NextResponse } from "next/server";
import { listFindingsForToken } from "@/packages/db/findings";
import type { Finding } from "@/packages/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  GET /api/findings/[ca]
  Response:
  {
    kind: "success",
    data: {
      tokenAddress: string,
      totalDetections: number,
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
      }>
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ca: string }> },
) {
  const { ca } = await params;
  const tokenAddress = ca.trim().toLowerCase();

  if (!tokenAddress) {
    return NextResponse.json(
      { kind: "error", error: "Token address is required." },
      { status: 400 },
    );
  }

  try {
    const findings = await listFindingsForToken(tokenAddress);
    return NextResponse.json({
      kind: "success",
      data: {
        tokenAddress,
        totalDetections: findings.length,
        findings: findings.map(serializeFinding),
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
