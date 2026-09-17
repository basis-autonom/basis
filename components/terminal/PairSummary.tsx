/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { StatCell } from '@/components/primitives/StatCell';
import { formatMillions, formatPercent, formatPrice } from './terminalFormat';

export function PairSummary({ row }: { row: any }) {
  const changeClass = row.chg24h == null ? 'text-fg3' : row.chg24h >= 0 ? 'text-up' : 'text-down';

  return (
    <section
      className="flex flex-shrink-0 items-center overflow-x-auto whitespace-nowrap border-b border-line bg-pane"
      style={{ gap: 22, padding: '0 16px', height: 54 }}
    >
      {/* pairid */}
      <div className="flex items-baseline" style={{ gap: 8 }}>
        <span className="font-mono text-[16px] font-semibold text-fg">${row.coin}</span>
        <span className="text-[11px] text-fg3">quoted in</span>
        <span className="font-mono text-[13px] text-stock">{row.quote}</span>
      </div>

      {/* price */}
      <span className="font-mono text-[21px] font-medium text-fg">{formatPrice(row.priceUsd)}</span>

      {/* 24h change — triangle + percent, no space between triangle and number */}
      <span className={`font-mono text-[12px] ${changeClass}`}>
        {row.chg24h == null
          ? '—'
          : `${row.chg24h >= 0 ? '▲' : '▼'} ${Math.abs(row.chg24h).toFixed(2)}%`}
      </span>

      <StatCell label="Meme 7d" value={formatPercent(row.meme7d)} tone="meme" />
      <StatCell label="Stock 7d" value={formatPercent(row.stock7d)} tone="stock" />
      <StatCell
        label="Float grip"
        value={row.grip == null ? '—' : `${row.grip.toFixed(1)}%`}
        tone={row.grip != null && row.grip >= 10 ? 'hot' : 'neutral'}
      />
      <StatCell label="Liquidity" value={formatMillions(row.liquidity)} />
      <StatCell label="24h vol" value={formatMillions(row.vol24h, 1)} />
      <StatCell label="Stock leg" value="frozen" valueClassName="text-fg3" />
    </section>
  );
}
