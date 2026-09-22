'use client';

import React from 'react';
import { LandingBoardRow, displaySymbol } from './types';

export function TickerTape({ rows, isRpcError }: { rows: LandingBoardRow[], isRpcError?: boolean }) {
  const tape = rows.slice(0, 12).map((row, index) => (
    <span key={`${row.ca || row.poolId || index}-${index}`}>
      {displaySymbol(row.coin)} <i>/</i> {row.quote || '—'}{' '}
      {row.chg24h == null ? '—' : `${row.chg24h >= 0 ? '+' : ''}${row.chg24h.toFixed(1)}%`}{' '}
      <i>meme {row.meme7d == null ? '—' : `${row.meme7d.toFixed(0)}%`}</i>
    </span>
  ));

  const content = tape.length > 0 ? tape : <span>{isRpcError ? "RPC connection unavailable" : "No live pool data"}</span>;

  return (
    <div className="landing-tape" aria-label="Live pool summary">
      <div className="landing-tape-track">{content}{content}</div>
    </div>
  );
}
