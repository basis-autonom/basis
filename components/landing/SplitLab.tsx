'use client';

import React, { useState } from 'react';
import { LandingBoardRow, displaySymbol } from './types';

function formatPrice(price: number | null | undefined) {
  if (price == null) return '—';
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

function formatRatio(ratio: number | null | undefined) {
  if (ratio == null) return '—';
  return ratio < 0.01 ? ratio.toPrecision(6) : ratio.toFixed(5);
}

function formatMillions(value: number | null | undefined) {
  if (value == null) return '—';
  return `$${(value / 1e6).toFixed(2)}M`;
}

export function SplitLab({ featured }: { featured?: LandingBoardRow }) {
  const basePrice = featured?.stockPrice ?? null;
  const poolRatio = featured?.poolRatio ?? null;
  const [price, setPrice] = useState(basePrice ?? 0);
  const hasData = basePrice != null && poolRatio != null;
  const min = basePrice == null ? 0 : basePrice * 0.75;
  const max = basePrice == null ? 1 : basePrice * 1.25;
  const step = basePrice == null ? 0.01 : Math.max(basePrice >= 10 ? 0.01 : basePrice / 1000, 0.000001);
  const dollars = hasData ? price * poolRatio : null;
  const move = hasData ? (price / basePrice - 1) * 100 : null;
  const coin = displaySymbol(featured?.coin);
  const quote = featured?.quote || 'stock';

  return (
    <section className="landing-section">
      <div className="landing-frame">
        <div className="landing-section-head">
          <h2>{quote} moves. Your bag moves. Nobody traded.</h2>
          <p>Nothing below is a trade. Drag the live stock price and watch {coin} reprice with the pool ratio held constant. The starting values come from this pool&apos;s current state and Chainlink feed.</p>
        </div>
        <div className="landing-lab">
          <div className="landing-control">
            <label htmlFor="landing-stock-price">{quote} share price</label>
            <input id="landing-stock-price" type="range" min={min} max={max} step={step} value={price} disabled={!hasData} onChange={(event) => setPrice(Number(event.target.value))} />
            <div className="landing-row"><span>{quote}</span><span>{hasData ? formatPrice(price) : '—'}</span></div>
            <div className="landing-row"><span>Pool ratio</span><span>{formatRatio(poolRatio)}</span></div>
            <div className="landing-row"><span>24h volume</span><span>{formatMillions(featured?.vol24h)}</span></div>
          </div>
          <div>
            <div className="landing-row"><span>{coin} in {quote} terms</span><span>{formatRatio(poolRatio)}</span></div>
            <div className="landing-row"><span>{coin} in dollars</span><span>{formatPrice(dollars)}</span></div>
            <div className="landing-row"><span>Move caused by this alone</span><span style={{ color: 'var(--color-stock)' }}>{move == null ? '—' : `${move >= 0 ? '+' : ''}${move.toFixed(1)}%`}</span></div>
            <p className="landing-note" style={{ marginTop: 16 }}>{hasData ? 'The pool ratio stays fixed in this simulation. Every cent of the move comes from the stock side of the pair.' : 'Current pool state is unavailable, so this simulation is paused.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
