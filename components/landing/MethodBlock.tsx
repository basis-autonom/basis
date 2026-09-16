import React from 'react';

export function MethodBlock() {
  return (
    <section id="method" className="landing-section">
      <div className="landing-frame">
        <div className="landing-section-head">
          <h2>Four lines. That is the entire method.</h2>
          <p>No model, no score, no weighting. Read the pool, read the oracle, subtract. Every number on this site comes from these four lines, and the repo runs them against live chain data so you can check any of it yourself.</p>
        </div>
        <div className="landing-two-column">
          <div className="landing-mathbox">
            price_usd&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= pool_ratio × stock_price<br />
            <u style={{ color: 'var(--color-stock)', textDecoration: 'none' }}>stock_component</u> = stock_price(t) ÷ stock_price(t−n) − 1<br />
            <b style={{ color: 'var(--color-meme)', fontWeight: 400 }}>meme_component</b>&nbsp;&nbsp;= pool_ratio(t) ÷ pool_ratio(t−n) − 1<br />
            total&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= (1 + <b style={{ color: 'var(--color-meme)', fontWeight: 400 }}>meme</b>) × (1 + <u style={{ color: 'var(--color-stock)', textDecoration: 'none' }}>stock</u>) − 1
          </div>
          <div>
            <p className="landing-note">Pool ratio comes from Swap events on the pool itself. Stock price comes from the token&apos;s Chainlink feed, which already carries the corporate-action multiplier, so dividends and splits are handled without a special case.</p>
            <p className="landing-note" style={{ marginTop: 14 }}>Basis holds nothing, routes nothing and executes nothing. It reads Robinhood Chain over a public RPC and does arithmetic. There is no contract to audit because there is no contract.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
