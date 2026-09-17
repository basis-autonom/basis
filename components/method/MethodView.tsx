import React from "react";

export function MethodView() {
  return (
    <div className="method-page">
      <header className="method-header">
        <div>
          <h1>Method</h1>
          <p>Every number on Basis, and exactly where it comes from</p>
        </div>
        <div className="method-stat"><span>Chain</span><strong>Robinhood Chain</strong></div>
        <div className="method-stat"><span>Mode</span><strong>read-only</strong></div>
      </header>

      <section className="method-grid">
        <article className="method-cell method-cell--full">
          <div className="method-heading"><h2>The split</h2><span>the attribution identity</span></div>
          <div className="method-formula">
            <div>price_usd <b>=</b> pool_ratio × stock_price</div>
            <div className="method-stock">stock_component <b>=</b> stock_price(t) ÷ stock_price(t−n) − 1</div>
            <div className="method-meme">meme_component <b>=</b> pool_ratio(t) ÷ pool_ratio(t−n) − 1</div>
            <div>total <b>=</b> (1 + meme_component) × (1 + stock_component) − 1</div>
          </div>
          <p className="method-note">Both components act on the same price, so they multiply rather than add. Every input is read from the chain at the requested window; when an input is unavailable, the product returns an em dash.</p>
        </article>
      </section>

      <section className="method-grid">
        <article className="method-cell">
          <div className="method-heading"><h2>Where each number comes from</h2></div>
          <div className="method-kv"><span>pool_ratio</span><strong>StateView pool state at chain timestamps</strong></div>
          <div className="method-kv"><span>stock_price</span><strong>the token&apos;s Chainlink feed</strong></div>
          <div className="method-kv"><span>float on chain</span><strong>totalSupply on the stock token</strong></div>
          <div className="method-kv"><span>locked in AMM</span><strong>balanceOf on the PoolManager</strong></div>
          <div className="method-kv"><span>market hours</span><strong>feed update cadence</strong></div>
          <div className="method-kv"><span>corporate actions</span><strong>ERC-8056 reads and update logs</strong></div>
          <p className="method-note">A pool indexer is used only to discover candidate pools. The numbers shown by Basis are read from Robinhood Chain or its Chainlink feeds, not from an external price API.</p>
        </article>
        <article className="method-cell">
          <div className="method-heading"><h2>What Basis does not do</h2></div>
          <div className="method-kv"><span>Hold funds</span><strong>no</strong></div>
          <div className="method-kv"><span>Route or execute trades</span><strong>no</strong></div>
          <div className="method-kv"><span>Ask for a wallet</span><strong>no</strong></div>
          <div className="method-kv"><span>Deploy a contract</span><strong>no</strong></div>
          <div className="method-kv"><span>Store your queries</span><strong>no</strong></div>
          <p className="method-note">Basis reads public state and does arithmetic. It never presents an inferred value as an on-chain fact.</p>
        </article>
      </section>

      <section className="method-grid">
        <article className="method-cell method-cell--full">
          <div className="method-heading"><h2>Limits worth knowing before you trust a number</h2></div>
          <div className="method-kv"><span>Multiple pools</span><strong>the deepest verified pool is used for attribution</strong></div>
          <div className="method-kv"><span>Thin pools</span><strong>liquidity and historical state may be unavailable</strong></div>
          <div className="method-kv"><span>Feed cadence</span><strong>timestamps reflect the latest Chainlink update</strong></div>
          <div className="method-kv"><span>Frozen windows</span><strong>the stock movement is measured from feed observations</strong></div>
          <div className="method-kv"><span>Missing state</span><strong>unknown values remain —; no default is substituted</strong></div>
        </article>
      </section>

      <section className="method-grid">
        <article className="method-cell method-cell--full">
          <div className="method-heading"><h2>Run it yourself</h2><span>same read-only principle</span></div>
          <div className="method-command">bun install<br />bun run split &lt;contract-address&gt; --window &lt;window&gt;</div>
          <p className="method-note">The command reads the same public RPC and feed contracts. It does not write to the chain or store a query.</p>
        </article>
      </section>
    </div>
  );
}
