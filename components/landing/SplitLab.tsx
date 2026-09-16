'use client';

import React, { useState } from 'react';

export function SplitLab() {
  const [price, setPrice] = useState(218);
  const dollars = price * 0.000189;
  const move = (price / 218 - 1) * 100;

  return (
    <section className="landing-section">
      <div className="landing-frame">
        <div className="landing-section-head">
          <h2>Move the stock. The coin follows on its own.</h2>
          <p>Nothing below is a trade. Drag Nvidia&apos;s share price and watch the memecoin reprice with zero volume, because the pool quotes it in NVDA rather than dollars.</p>
        </div>
        <div className="landing-lab">
          <div className="landing-control">
            <label htmlFor="landing-stock-price">Nvidia share price</label>
            <input id="landing-stock-price" type="range" min="170" max="265" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
            <div className="landing-row"><span>NVDA</span><span>${price.toFixed(2)}</span></div>
            <div className="landing-row"><span>Swaps executed</span><span>0</span></div>
            <div className="landing-row"><span>Buyers involved</span><span>0</span></div>
          </div>
          <div>
            <div className="landing-row"><span>$AI in NVDA terms</span><span>0.000189</span></div>
            <div className="landing-row"><span>$AI in dollars</span><span>${dollars.toFixed(4)}</span></div>
            <div className="landing-row"><span>Move caused by this alone</span><span style={{ color: 'var(--color-stock)' }}>{move >= 0 ? '+' : ''}{move.toFixed(1)}%</span></div>
            <p className="landing-note" style={{ marginTop: 16 }}>The pool ratio never changed. Every cent of that move came from the other side of the pair.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
