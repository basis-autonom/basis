import React, { useMemo } from 'react';

type Timeframe = '1h' | '4h' | '24h' | '7d' | '30d';

interface TerminalChartProps {
  seed: string;
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}

export function TerminalChart({ seed, timeframe, onTimeframeChange }: TerminalChartProps) {
  const { grid, memePath, stockPath, marks } = useMemo(() => {
    const s = seed.length + seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1);
    const W = 1000, H = 216, n = 48, pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const open = (i > 14 && i < 34);
      const meme = 26 + Math.sin(i / (3.1 + (s % 3))) * 13 + ((i * 37 + s) % 15);
      const stock = open ? (30 + Math.sin(i / (4.4 + (s % 2))) * 20 + ((i * 17 + s) % 15)) : 0;
      pts.push([meme, stock]);
    }
    let max = 0;
    pts.forEach(p => { max = Math.max(max, p[0] + p[1]); });
    const y = (v: number) => H - 8 - (v / max) * (H - 26);
    
    const area = (idx: number) => {
      let top = '', bot = '';
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const base = idx === 0 ? 0 : pts[i][0];
        const t = base + pts[i][idx];
        top += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y(t).toFixed(1) + ' ';
        bot = ('L' + x.toFixed(1) + ',' + y(base).toFixed(1) + ' ') + bot;
      }
      return top + bot + 'Z';
    };

    const grids = [];
    for (let g = 1; g < 4; g++) {
      const gy = 8 + g * ((H - 26) / 4);
      grids.push(<line key={g} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--color-line)" strokeWidth="1"/>);
    }
    
    const m1 = (14 / (n - 1) * W);
    const m2 = (34 / (n - 1) * W);
    const markers = (
      <>
        <line x1={m1} y1="0" x2={m1} y2={H} stroke="var(--color-stock)" strokeWidth="1" strokeDasharray="3 3" opacity=".5"/>
        <line x1={m2} y1="0" x2={m2} y2={H} stroke="var(--color-stock)" strokeWidth="1" strokeDasharray="3 3" opacity=".5"/>
      </>
    );

    return { grid: grids, memePath: area(0), stockPath: area(1), marks: markers };
  }, [timeframe, seed]); // timeframe can re-trigger if we want

  return (
    <div className="flex flex-col border-b border-line bg-bg overflow-hidden" style={{ height: "250px" }}>
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
      <div className="flex-1 relative">
        <svg viewBox="0 0 1000 216" preserveAspectRatio="none" className="w-full h-full absolute top-0 left-0">
          {grid}
          <path d={memePath} fill="var(--color-memebg)" stroke="var(--color-meme)" strokeWidth="1.4" />
          <path d={stockPath} fill="var(--color-stockbg)" stroke="var(--color-stock)" strokeWidth="1.4" />
          {marks}
        </svg>
      </div>
    </div>
  );
}
