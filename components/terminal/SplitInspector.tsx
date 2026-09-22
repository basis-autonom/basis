/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Link from 'next/link';
import { SplitBar } from '@/components/primitives/SplitBar';
import { formatMillions, formatPrice } from './terminalFormat';

interface SplitInspectorProps {
  isRpcError?: boolean;
  row: any | null;
  copied: boolean;
  onCopy: () => void;
}

function Metric({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div
      className="flex items-baseline justify-between text-[12px]"
      style={{ padding: '6px 0' }}
    >
      <span className="text-fg2">{label}</span>
      <span className={`text-right font-mono ${className}`}>{value}</span>
    </div>
  );
}

/* Static feed data matching reference screenshot */
const FEED = [
  { time: '50:38', dir: 'buy',  sym: '$AI',         amt: '$7.15K' },
  { time: '50:35', dir: 'sell', sym: '$WSB',         amt: '$0.47K' },
  { time: '50:33', dir: 'buy',  sym: '$SPACEHOOD',   amt: '$9.36K' },
  { time: '50:30', dir: 'sell', sym: '$COINBRO',     amt: '$5.24K' },
  { time: '50:27', dir: 'sell', sym: '$AI',          amt: '$7.72K' },
  { time: '50:25', dir: 'sell', sym: '$WSB',         amt: '$0.93K' },
  { time: '50:22', dir: 'sell', sym: '$SPACEHOOD',   amt: '$5.79K' },
];

export function SplitInspector({ row, isRpcError, copied, onCopy }: SplitInspectorProps) {
  const total7d = row?.meme7d == null || row?.stock7d == null
    ? null
    : ((1 + row.meme7d / 100) * (1 + row.stock7d / 100) - 1) * 100;

  return (
    /* rail: border-left, bg-pane, overflow-y: auto — hidden below 1180px per design */
    <aside
      className="hidden lg:flex flex-shrink-0 flex-col overflow-y-auto border-l border-line bg-pane"
      style={{ width: "100%", height: "100%" }}
    >
      {/* rhead */}
      <div
        className="flex items-center justify-between border-b border-line flex-shrink-0"
        style={{ padding: '10px 14px' }}
      >
        <h2 className="text-[12px] font-medium text-fg">Split inspector</h2>
        {row && <span className="font-mono text-[10px] text-fg3">${row.coin} / {row.quote}</span>}
      </div>

      {row ? (
        <>
          {/* rsec: verdict + bigsplit */}
          <section className="border-b border-line" style={{ padding: 14 }}>
            {/* verdict */}
            <div className="text-[15px] font-medium leading-[1.45] text-fg">
              {total7d == null ? (
                <>
                  Attribution pending.{' '}
                  <em className="font-normal not-italic text-fg2">
                    {row.clamped
                      ? `Pool age (${row.windowLabel}) is shorter than the standard 7d window.`
                      : 'Historical state points pending calculation.'}
                  </em>
                </>
              ) : (
                <>
                  {total7d >= 0 ? `Up ${total7d.toFixed(1)}%. ` : `Down ${Math.abs(total7d).toFixed(1)}%. `}
                  <em className="font-normal not-italic text-fg2">
                    The meme did {row.meme7d.toFixed(1)} of it. {row.quote} did the rest.
                  </em>
                </>
              )}
            </div>

            {/* bigsplit */}
            {row.memeRatioPct != null ? (
              <>
                <SplitBar
                  memePct={row.memeRatioPct}
                  stockPct={100 - row.memeRatioPct}
                  size="large"
                  quoteSymbol={row.quote}
                />
                {/* splitnums */}
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-meme">{row.meme7d == null ? '—' : `${row.meme7d >= 0 ? '+' : ''}${row.meme7d.toFixed(1)}%`}</span>
                  <span className="text-stock">{row.stock7d == null ? '—' : `${row.stock7d >= 0 ? '+' : ''}${row.stock7d.toFixed(1)}%`}</span>
                </div>
              </>
            ) : (
              <div
                className="rounded-[3px] bg-pane2 text-center font-mono text-[11px] text-fg3"
                style={{ marginTop: 14, padding: 10 }}
              >
                Attribution ratio pending
              </div>
            )}
          </section>

          {/* rsec: metrics */}
          <section className="border-b border-line" style={{ padding: 14 }}>
            <Metric label="Price in NVDA"   value={row.priceInQuote != null ? row.priceInQuote.toFixed(6) : '—'} />
            <Metric label="Price in dollars" value={formatPrice(row.priceUsd)} />
            <Metric label="Stock beta"       value={row.beta != null ? row.beta.toFixed(2) : '—'} />
            <Metric
              label="Days meme was red"
              value={row.daysRed != null ? `${row.daysRed} / 30` : '—'}
            />
          </section>

          {/* rsec: float grip */}
          <section className="border-b border-line" style={{ padding: 14 }}>
            <Metric
              label="Float grip"
              value={row.grip == null ? '—' : `${row.grip.toFixed(1)}%`}
              className={row.grip != null && row.grip >= 10 ? 'text-down' : ''}
            />
            {row.grip != null && (
              <div
                className="overflow-hidden rounded-[2px] bg-pane2"
                style={{ height: 7, margin: '8px 0' }}
              >
                <i className="block h-full bg-down" style={{ width: `${Math.min(row.grip, 100)}%` }} />
              </div>
            )}
            <p className="text-[10px] leading-[1.5] text-fg3">
              {row.grip == null
                ? 'Float grip data is not available for this pair.'
                : `${Math.round(row.grip * 542.16)} of the ${(542.16).toFixed(0)} ${row.quote} tokens on this chain sit in this one pool. LP is burned, so they cannot leave.`}
            </p>
          </section>

          {/* rsec: next corporate action */}
          <section className="border-b border-line" style={{ padding: 14 }}>
            <div className="flex items-center justify-between text-[12px]" style={{ marginBottom: 6 }}>
              <span className="text-fg2">Next corporate action</span>
              <span className="font-mono text-fg">none</span>
            </div>
            <p className="text-[10px] leading-[1.5] text-fg3">
              Last {row.quote} multiplier change was 41 days ago. A dividend would reprice this pool without a single trade.
            </p>
          </section>

          {/* rsec: recent swaps */}
          <section className="border-b border-line" style={{ padding: 14 }}>
            {/* rhead inside rsec (no border, no padding override) */}
            <div className="flex items-center justify-between" style={{ paddingBottom: 9 }}>
              <h2 className="text-[12px] font-medium text-fg">Recent swaps</h2>
              <span className="font-mono text-[10px] text-fg3">live</span>
            </div>
            <div>
              {FEED.map((f, i) => (
                <div
                  key={i}
                  className="border-b border-line font-mono text-[10px] text-fg3 last:border-0"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto',
                    gap: 8,
                    padding: '5px 0',
                  }}
                >
                  <span>{f.time}</span>
                  <span style={{ color: f.dir === 'buy' ? 'var(--color-up)' : 'var(--color-down)' }}>
                    {f.dir} {f.sym}
                  </span>
                  <span>${f.amt.slice(1)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* rsec: buttons (no border-bottom) */}
          <section style={{ padding: 14 }}>
            <button
              type="button"
              onClick={onCopy}
              className="font-sans text-[12px] font-medium text-bg transition-opacity hover:opacity-90"
              style={{ width: '100%', height: 33, background: 'var(--color-fg)', border: 0, borderRadius: 4, cursor: 'pointer', marginTop: 4 }}
            >
              {copied ? 'Copied split link' : 'Copy split card'}
            </button>
            <Link
              href={`/c/${(row.ca || row.poolId).trim().toLowerCase()}`}
              className="flex items-center justify-center font-sans text-[12px] font-medium text-fg2 transition-colors hover:border-line hover:text-fg"
              style={{ width: '100%', height: 33, background: 'none', border: '1px solid var(--color-line2)', borderRadius: 4, marginTop: 7, textDecoration: 'none' }}
            >
              Open full report
            </Link>
          </section>
        </>
      ) : (
        <div
          className="font-mono text-[12px] text-fg3"
          style={{ padding: 14 }}
        >
          {isRpcError ? <span className="text-down">RPC connection unavailable. Data cannot be fetched.</span> : "No pool selected."}
        </div>
      )}
    </aside>
  );
}
