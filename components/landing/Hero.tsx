import React from 'react';
import Link from 'next/link';
import { ContractForm } from './ContractForm';
import { TerminalPreview } from './TerminalPreview';
import { LandingBoardRow, displaySymbol } from './types';

function totalMove(row: LandingBoardRow | undefined) {
  if (!row || row.meme7d == null || row.stock7d == null) return null;
  return ((1 + row.meme7d / 100) * (1 + row.stock7d / 100) - 1) * 100;
}

export function Hero({ rows }: { rows: LandingBoardRow[] }) {
  const featured = rows[0];
  const total = totalMove(featured);
  const sampleRows = rows.slice(0, 3);

  return (
    <header className="landing-hero">
      <div className="landing-frame">
        <h1 className="landing-h1">
          <span className="landing-mono">{displaySymbol(featured?.coin)}</span> is up{' '}
          <span className="landing-mono">{total == null ? '—' : `${total.toFixed(1)}%`}</span>. Its meme did{' '}
          <span className="landing-mono">{featured?.meme7d == null ? '—' : featured.meme7d.toFixed(1)}</span>.
        </h1>
        <p className="landing-lede">On Robinhood Chain a memecoin is often quoted in a tokenized stock. When that stock moves, the coin reprices on its own — no buyers, no volume, no one doing anything. Basis tells you which half was real.</p>
        <ContractForm />
        <div className="landing-tryline">
          try{' '}
          {sampleRows.length === 0 ? <span>no live examples</span> : sampleRows.map((row, index) => (
            <React.Fragment key={row.ca || row.poolId || index}>
              {index > 0 && ' · '}
              <Link href={`/c/${row.ca || row.poolId || ''}`}>{displaySymbol(row.coin)} / {row.quote || '—'}</Link>
            </React.Fragment>
          ))}
        </div>
        <TerminalPreview rows={rows} featured={featured} />
      </div>
    </header>
  );
}
