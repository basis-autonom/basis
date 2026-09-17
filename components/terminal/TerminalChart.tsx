'use client';
import React, { useMemo } from 'react';

type Timeframe = '1h' | '4h' | '24h' | '7d' | '30d';

interface TerminalChartProps {
  seed: string;
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}

export function TerminalChart({ seed, timeframe, onTimeframeChange }: TerminalChartProps) {
  const { grid } = useMemo(() => {
    const W = 1000, H = 216;
    const grids = [];
    for (let g = 1; g < 4; g++) {
      const gy = 8 + g * ((H - 26) / 4);
      grids.push(<line key={g} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--color-line)" strokeWidth="1"/>);
    }
    return { grid: grids };
  }, []);

  return (
    <div className="flex flex-col border-b border-line bg-bg min-h-0 flex-1 relative h-full">
      <div className="flex justify-between items-center px-[14px] pt-[9px] pb-[4px]">
        <div className="flex gap-[16px] font-mono text-[11px] text-fg3">
          {(['1h', '4h', '24h', '7d', '30d'] as Timeframe[]).map((tf) => (
            <span
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`cursor-pointer hover:text-fg ${timeframe === tf ? 'text-fg font-medium bg-pane2 px-[5px] py-[2px] rounded-[3px] -ml-[5px]' : 'py-[2px]'}`}
            >
              {tf}
            </span>
          ))}
        </div>
        <div className="flex gap-[16px] font-mono text-[10px] text-fg2">
          <span className="flex items-center gap-[6px]">
            <span className="block w-[10px] h-[10px] rounded-[2px] bg-meme"></span>
            meme component
          </span>
          <span className="flex items-center gap-[6px]">
            <span className="block w-[10px] h-[10px] rounded-[2px] bg-stock"></span>
            stock component
          </span>
        </div>
      </div>
      <div className="flex-1 relative min-h-0 flex items-center justify-center">
        <svg 
          viewBox="0 0 1000 216" 
          preserveAspectRatio="none" 
          className="w-full h-full absolute top-0 left-0"
        >
          {grid}
        </svg>
        <div className="relative font-mono text-[11px] text-fg3 bg-bg px-[10px] py-[4px] border border-line rounded-[3px]">
          Chart data pending for pair {seed ? seed.slice(0, 6) + "…" + seed.slice(-4) : "—"}
        </div>
      </div>
    </div>
  );
}
