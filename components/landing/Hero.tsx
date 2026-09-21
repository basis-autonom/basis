import React from 'react';
import Link from 'next/link';
import { ContractForm } from './ContractForm';
import { TerminalPreview } from './TerminalPreview';
import { LandingBoardRow, displaySymbol } from './types';
import { RotatingQuote } from './RotatingQuote';

export function Hero({ rows }: { rows: LandingBoardRow[] }) {
  const featured = rows[0];
  const sampleRows = rows.slice(0, 3);
  const stockExposure = featured?.memeRatioPct == null ? null : 100 - featured.memeRatioPct;
  const quote = featured?.quote || '—';
  
  const uniqueQuotes = Array.from(new Set(rows.map((r) => r.quote).filter(Boolean))) as string[];
  if (uniqueQuotes.length === 0) uniqueQuotes.push('—');

  return (
    <header className="landing-hero">
      <div className="landing-frame">
        <h1 className="landing-h1">
          You bought a memecoin.<br />
          You are holding <RotatingQuote quotes={uniqueQuotes.slice(0, 5)} />.
        </h1>
        <p className="landing-lede">On Robinhood Chain, memecoins can be quoted in tokenized stocks instead of dollars. That makes every holder a stock holder, whether they know it or not. Paste a contract to see what you are actually exposed to.</p>
        <div className="landing-exposure">
          <span>stock share of 7d move</span>
          <strong>{stockExposure == null ? '—' : `${stockExposure.toFixed(1)}% ${quote}`}</strong>
        </div>
        <ContractForm />
        <div className="landing-tryline">
          try{' '}
          {sampleRows.length === 0 ? <span>no live examples</span> : sampleRows.map((row, index) => (
            <React.Fragment key={row.ca || row.poolId || index}>
              {index > 0 && ' · '}
              <Link href={`/c/${(row.ca || row.poolId || '').trim().toLowerCase()}`}>{displaySymbol(row.coin)} / {row.quote || '—'}</Link>
            </React.Fragment>
          ))}
        </div>
        <TerminalPreview rows={rows} featured={featured} />
      </div>
    </header>
  );
}
