import React from "react";
import Link from "next/link";
import { ContractForm } from "./ContractForm";
import { TerminalPreview } from "./TerminalPreview";
import { LandingBoardRow, displaySymbol } from "./types";
import { RotatingQuote } from "./RotatingQuote";
import { CopyCaPill } from "./CopyCaPill";

export function Hero({
  rows,
  isRpcError,
}: {
  rows: LandingBoardRow[];
  isRpcError?: boolean;
}) {
  const featured = rows[0];
  const sampleRows = rows.slice(0, 3);
  const stockExposure =
    featured?.memeRatioPct == null ? null : 100 - featured.memeRatioPct;
  const quote = featured?.quote || "—";
  // ========================================================
  // CA RESMI TOKEN (Tinggal ganti string di bawah ini):
  // ========================================================
  const contractAddress = "basis";

  const featuredCa = contractAddress || featured?.ca || sampleRows[0]?.ca || "";

  if (isRpcError) {
    return (
      <header className="landing-hero">
        <div className="landing-frame">
          <h1 className="landing-h1">
            You bought a memecoin.
            <br />
            <span className="text-down">RPC connection unavailable.</span>
          </h1>
          <p className="landing-lede">
            The on-chain data provider is currently experiencing downtime or
            rate limits. Live pool data cannot be displayed at this moment.
            Please check back later.
          </p>
          <div className="landing-exposure">
            <span>status</span>
            <strong className="text-down">Data unavailable</strong>
          </div>
          <ContractForm />
        </div>
      </header>
    );
  }

  const uniqueQuotes = Array.from(
    new Set(rows.map((r) => r.quote).filter(Boolean)),
  ) as string[];
  if (uniqueQuotes.length === 0) uniqueQuotes.push("—");

  return (
    <header className="landing-hero">
      <div className="landing-frame">
        {featuredCa && (
          <div className="hidden  justify-center mb-6">
            <CopyCaPill address={featuredCa} />
          </div>
        )}
        <h1 className="landing-h1">
          You bought a memecoin.
          <br />
          You are holding <RotatingQuote quotes={uniqueQuotes.slice(0, 5)} />.
        </h1>
        <p className="landing-lede">
          On Robinhood Chain, memecoins can be quoted in tokenized stocks
          instead of dollars. That makes every holder a stock holder, whether
          they know it or not. Paste a contract to see what you are actually
          exposed to.
        </p>
        <div className="landing-exposure">
          <span>stock share of 7d move</span>
          <strong>
            {stockExposure == null
              ? "—"
              : `${stockExposure.toFixed(1)}% ${quote}`}
          </strong>
        </div>
        <ContractForm />
        <div className="landing-tryline">
          try{" "}
          {sampleRows.length === 0 ? (
            <span>no live examples</span>
          ) : (
            sampleRows.map((row, index) => {
              const rowCa = row.ca || row.poolId;
              return (
                <React.Fragment key={rowCa || index}>
                  {index > 0 && " · "}
                  <span className="inline-flex items-center gap-1">
                    <Link href={`/c/${(rowCa || "").trim().toLowerCase()}`}>
                      {displaySymbol(row.coin)} / {row.quote || "—"}
                    </Link>
                    {rowCa && (
                      <CopyCaPill
                        address={rowCa}
                        compact
                        title={`Copy ${displaySymbol(row.coin)} CA (${rowCa})`}
                      />
                    )}
                  </span>
                </React.Fragment>
              );
            })
          )}
        </div>
        <TerminalPreview rows={rows} featured={featured} />
      </div>
    </header>
  );
}
