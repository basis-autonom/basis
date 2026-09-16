import React from 'react';
import { LandingBoardRow, displaySymbol } from './types';

function formatPrice(price: number | null | undefined) {
  if (price == null) return '—';
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

function totalMove(row: LandingBoardRow | undefined) {
  if (!row || row.meme7d == null || row.stock7d == null) return null;
  return ((1 + row.meme7d / 100) * (1 + row.stock7d / 100) - 1) * 100;
}

export function TerminalPreview({ rows, featured }: { rows: LandingBoardRow[]; featured?: LandingBoardRow }) {
  const previewRows = rows.slice(0, 7);
  const total = totalMove(featured);
  const memePct = featured?.memeRatioPct;
  const stockPct = memePct == null ? null : 100 - memePct;
  const liquidity = featured?.liquidity == null ? '—' : `$${(featured.liquidity / 1e6).toFixed(2)}M`;

  return (
    <div className="landing-shot">
      <div className="landing-shotbar"><div className="landing-dots"><i /><i /><i /></div><span className="landing-shot-url">basis.tools/terminal</span></div>
      <div className="landing-shot-grid">
        <div className="landing-shot-pane">
          <div className="landing-label">Views</div>
          <div className="landing-nav-row active">Split board</div>
          <div className="landing-nav-row">Float grip</div>
          <div className="landing-nav-row">Market hours</div>
          <div className="landing-nav-row">Corporate actions</div>
          <div className="landing-label" style={{ paddingTop: 14 }}>Watchlist</div>
          {previewRows.slice(0, 4).map((row, index) => (
            <div key={row.ca || row.poolId || index} className="landing-watch-row"><span>{displaySymbol(row.coin)}</span><span>{formatPrice(row.priceUsd).replace('$', '')}</span></div>
          ))}
        </div>

        <div className="landing-shot-pane">
          <div className="landing-shot-top">
            <b>{displaySymbol(featured?.coin)}</b><span>quoted in</span><span style={{ color: 'var(--color-stock)' }}>{featured?.quote || '—'}</span>
            <span className="push-right">grip {featured?.grip == null ? '—' : `${featured.grip.toFixed(1)}%`}</span>
          </div>
          <table className="landing-shot-table">
            <thead><tr><th>Coin</th><th>Quote</th><th className="right">Price</th><th>Meme / stock</th><th className="right">Grip</th></tr></thead>
            <tbody>
              {previewRows.length === 0 ? <tr><td colSpan={5}>No live pool data</td></tr> : previewRows.map((row, index) => {
                const ratio = row.memeRatioPct;
                return (
                  <tr key={row.ca || row.poolId || index}>
                    <td>{displaySymbol(row.coin)}</td>
                    <td style={{ color: 'var(--color-stock)' }}>{row.quote || '—'}</td>
                    <td className="right">{formatPrice(row.priceUsd)}</td>
                    <td>{ratio == null ? '—' : <div className="landing-split-bar"><i className="meme" style={{ width: `${ratio}%` }} /><i className="stock" style={{ width: `${100 - ratio}%` }} /></div>}</td>
                    <td className="right" style={{ color: row.grip != null && row.grip >= 10 ? 'var(--color-down)' : 'var(--color-fg)' }}>{row.grip == null ? '—' : `${row.grip.toFixed(1)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="landing-shot-pane">
          <div className="landing-shot-rail-section">
            <div className="landing-verdict">{total == null ? 'Attribution pending.' : `${total >= 0 ? 'Up' : 'Down'} ${Math.abs(total).toFixed(1)}%.`} <em>{featured?.meme7d == null ? 'Historical state points pending calculation.' : `The meme did ${featured.meme7d.toFixed(1)}% of it.`}</em></div>
            {memePct == null ? <div className="landing-note" style={{ marginTop: 11 }}>Attribution ratio pending</div> : <>
              <div className="landing-large-split"><div className="meme" style={{ width: `${memePct}%` }}>meme</div><div className="stock" style={{ width: `${stockPct}%` }}>{featured?.quote || '—'}</div></div>
              <div className="landing-shot-numbers"><span>{featured?.meme7d == null ? '—' : `${featured.meme7d >= 0 ? '+' : ''}${featured.meme7d.toFixed(1)}%`}</span><span>{featured?.stock7d == null ? '—' : `${featured.stock7d >= 0 ? '+' : ''}${featured.stock7d.toFixed(1)}%`}</span></div>
            </>}
          </div>
          <div className="landing-shot-rail-section">
            <div className="landing-kv"><span>Stock beta</span><span>—</span></div>
            <div className="landing-kv"><span>Float grip</span><span style={{ color: 'var(--color-down)' }}>{featured?.grip == null ? '—' : `${featured.grip.toFixed(1)}%`}</span></div>
            <div className="landing-kv"><span>Liquidity</span><span>{liquidity}</span></div>
            <div className="landing-kv"><span>Stock leg</span><span>frozen</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
