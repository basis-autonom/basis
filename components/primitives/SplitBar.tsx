import React from 'react';

interface SplitBarProps {
  memePct: number;
  stockPct: number;
  size?: 'small' | 'large';
  quoteSymbol?: string;
}

export function SplitBar({ memePct, stockPct, size = 'small', quoteSymbol }: SplitBarProps) {
  // Ensure the total adds up to exactly 100 for visual stability, defaulting to 50/50 if both 0
  const total = memePct + stockPct;
  const m = total === 0 ? 50 : (memePct / total) * 100;
  const s = total === 0 ? 50 : (stockPct / total) * 100;

  if (size === 'small') {
    return (
      <div className="flex h-[11px] w-[112px] rounded-[2px] overflow-hidden">
        <i className="block h-full bg-meme" style={{ width: `${m}%` }}></i>
        <i className="block h-full bg-stock" style={{ width: `${s}%` }}></i>
      </div>
    );
  }

  // large variant (used in inspector/report)
  return (
    <div className="flex h-[34px] rounded-[3px] overflow-hidden my-[14px] mx-0">
      <div
        className="split-bar-label flex items-center px-[10px] font-mono text-[11px] bg-memebg border-l-2 border-meme"
        style={{ width: `${m}%` }}
      >
        meme
      </div>
      <div 
        className="split-bar-label flex items-center px-[10px] font-mono text-[11px] bg-stockbg justify-end border-r-2 border-stock"
        style={{ width: `${s}%` }}
      >
        {quoteSymbol || 'STOCK'}
      </div>
    </div>
  );
}
