/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Link from 'next/link';
import { SplitBar } from '@/components/primitives/SplitBar';
import { formatMillions, formatPrice } from './terminalFormat';

interface SplitInspectorProps {
  row: any | null;
  copied: boolean;
  onCopy: () => void;
}

function Metric({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[12px] py-[6px] text-[12px]">
      <span className="text-fg2">{label}</span>
      <span className={`text-right font-mono ${className}`}>{value}</span>
    </div>
  );
}

const swaps = [
  ['50:38', 'buy $AI', '$7.15K', 'text-up'],
  ['50:35', 'sell $WSB', '$0.47K', 'text-down'],
  ['50:33', 'buy $SPACEHOOD', '$9.36K', 'text-up'],
  ['50:30', 'sell $COINBRO', '$5.24K', 'text-down'],
  ['50:27', 'sell $AI', '$7.72K', 'text-down'],
  ['50:25', 'sell $WSB', '$0.93K', 'text-down'],
  ['50:22', 'sell $SPACEHOOD', '$5.79K', 'text-down'],
];

export function SplitInspector({ row, copied, onCopy }: SplitInspectorProps) {
  const total7d = row?.meme7d == null || row?.stock7d == null
    ? null
    : ((1 + row.meme7d / 100) * (1 + row.stock7d / 100) - 1) * 100;

  return (
    <aside className="hidden lg:flex w-[292px] flex-shrink-0 flex-col overflow-y-auto border-l border-line bg-pane">
      <div className="flex items-center justify-between border-b border-line px-[14px] py-[10px]">
        <h2 className="text-[12px] font-medium text-fg">Split inspector</h2>
        {row && <span className="font-mono text-[10px] text-fg3">${row.coin} / {row.quote}</span>}
      </div>

      {row ? (
        <>
          <section className="border-b border-line p-[14px]">
            <div className="text-[15px] font-medium leading-[1.45] text-fg">
              {total7d == null ? (
                <>
                  Attribution pending.{' '}
                  <em className="font-normal not-italic text-fg2">
                    {row.clamped ? `Pool age (${row.windowLabel}) is shorter than the standard 7d window.` : 'Historical state points pending calculation.'}
                  </em>
                </>
              ) : (
                <>
                  {total7d >= 0 ? `Up ${total7d.toFixed(1)}%. ` : `Down ${Math.abs(total7d).toFixed(1)}%. `}
                  <em className="font-normal not-italic text-fg2">The meme did {row.meme7d.toFixed(1)}% of it. {row.quote} did {row.stock7d.toFixed(1)}%.</em>
                </>
              )}
            </div>

            {row.memeRatioPct != null ? (
              <>
                <SplitBar memePct={row.memeRatioPct} stockPct={100 - row.memeRatioPct} size="large" quoteSymbol={row.quote} />
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-meme">{row.meme7d == null ? '—' : `${row.meme7d >= 0 ? '+' : ''}${row.meme7d.toFixed(1)}%`}</span>
                  <span className="text-stock">{row.stock7d == null ? '—' : `${row.stock7d >= 0 ? '+' : ''}${row.stock7d.toFixed(1)}%`}</span>
                </div>
              </>
            ) : (
              <div className="mt-[14px] rounded-[3px] bg-pane2 p-[10px] text-center font-mono text-[11px] text-fg3">Attribution ratio pending</div>
            )}
          </section>

          <section className="border-b border-line p-[14px]">
            <Metric label="Price in dollars" value={formatPrice(row.priceUsd)} />
            <Metric label="24h change" value={row.chg24h == null ? '—' : `${row.chg24h >= 0 ? '+' : ''}${row.chg24h.toFixed(2)}%`} className={row.chg24h == null ? 'text-fg3' : row.chg24h >= 0 ? 'text-up' : 'text-down'} />
            <Metric label="Meme 7d" value={row.meme7d == null ? '—' : `${row.meme7d >= 0 ? '+' : ''}${row.meme7d.toFixed(1)}%`} className="text-meme" />
            <Metric label="Stock 7d" value={row.stock7d == null ? '—' : `${row.stock7d >= 0 ? '+' : ''}${row.stock7d.toFixed(1)}%`} className="text-stock" />
            <Metric label="Liquidity" value={formatMillions(row.liquidity)} />
            <Metric label="24h volume" value={formatMillions(row.vol24h, 1)} />
            <Metric label="Window" value={row.windowLabel || '7d'} className="text-fg3" />
          </section>

          <section className="border-b border-line p-[14px]">
            <Metric label="Float grip" value={row.grip == null ? '—' : `${row.grip.toFixed(1)}%`} className={row.grip != null && row.grip >= 10 ? 'text-down' : ''} />
            {row.grip != null && (
              <div className="my-[8px] h-[7px] overflow-hidden rounded-[2px] bg-pane2">
                <i className="block h-full bg-down" style={{ width: `${Math.min(row.grip, 100)}%` }} />
              </div>
            )}
            <p className="text-[10px] leading-[1.5] text-fg3">
              {row.grip == null ? 'Float grip data is not available for this pair.' : `Proportion of ${row.quote} on-chain tokens locked in the Uniswap v4 AMM.`}
            </p>
          </section>

          <section className="border-b border-line p-[14px]">
            <div className="flex items-center justify-between pb-[9px]">
              <h2 className="text-[12px] font-medium text-fg">Recent swaps</h2>
              <span className="font-mono text-[10px] text-fg3">live</span>
            </div>
            <div>
              {swaps.map(([type, amount, time, tone]) => (
                <div key={`${type}-${time}`} className="grid grid-cols-[44px_1fr_auto] gap-[8px] border-b border-line/40 py-[5px] font-mono text-[10px] last:border-0">
                  <span className={tone}>{type}</span>
                  <span className="text-fg">{amount}</span>
                  <span className="text-fg3">{time}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-[14px]">
            <button type="button" onClick={onCopy} className="h-[33px] w-full rounded-[4px] bg-fg font-sans text-[12px] font-medium text-bg transition-opacity hover:opacity-90">{copied ? 'Copied split link' : 'Copy split link'}</button>
            <Link href={`/c/${row.ca || row.poolId}`} className="mt-[7px] flex h-[33px] w-full items-center justify-center rounded-[4px] border border-line2 font-sans text-[12px] font-medium text-fg2 transition-colors hover:border-line hover:text-fg">Open full report</Link>
          </section>
        </>
      ) : (
        <div className="p-[14px] font-mono text-[12px] text-fg3">No pool selected.</div>
      )}
    </aside>
  );
}
