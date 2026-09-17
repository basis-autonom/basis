
'use client';
import React, { useMemo, useState, useRef } from 'react';

type Timeframe = '1h' | '4h' | '24h' | '7d' | '30d';

interface TerminalChartProps {
  seed: string;
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}

export function TerminalChart({ seed, timeframe, onTimeframeChange }: TerminalChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { grid, memePath, stockPath, marks, points } = useMemo(() => {
    const safeSeed = seed || "default";
    const s = safeSeed.length + safeSeed.charCodeAt(0) + safeSeed.charCodeAt(safeSeed.length - 1) + (timeframe === "1h" ? 10 : timeframe === "4h" ? 20 : timeframe === "24h" ? 30 : timeframe === "7d" ? 40 : 50);
    const W = 1000, H = 216, n = 48, pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const open = (i > 14 && i < 34);
      const meme = 26 + Math.sin(i / (3.1 + (s % 3))) * 13 + ((i * 37 + s) % 15);
      const stock = open ? (30 + Math.sin(i / (4.4 + (s % 2))) * 20 + ((i * 17 + s) % 15)) : 0;
      pts.push([meme, stock]);
    }
    let max = 0;
    pts.forEach(p => { max = Math.max(max, p[0] + p[1]); });
    const safeMax = max === 0 ? 1 : max;
    const y = (v: number) => H - 8 - (v / safeMax) * (H - 26);
    
    const area = (idx: number) => {
      let top = '', bot = '';
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const base = idx === 0 ? 0 : pts[i][0];
        const t = base + pts[i][idx];
        top += (i === 0 ? 'M' : 'L') + x + ',' + y(t) + ' ';
        bot = ('L' + x + ',' + y(base) + ' ') + bot;
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
    
    const calculatedPoints = pts.map((p, i) => {
      const x = (i / (n - 1)) * W;
      const base = p[0];
      const t = base + p[1];
      return { x, y: y(t), memeValue: p[0], stockValue: p[1] };
    });

    return { grid: grids, memePath: area(0), stockPath: area(1), marks: markers, points: calculatedPoints };
  }, [timeframe, seed]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const W = 1000;
    const svgX = ratio * W;
    
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    setHoverIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

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
      <div className="flex-1 relative min-h-0">
        <svg 
          ref={svgRef}
          viewBox="0 0 1000 216" 
          preserveAspectRatio="none" 
          className="w-full h-full absolute top-0 left-0 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {grid}
          <path d={memePath} fill="var(--color-memebg)" stroke="var(--color-meme)" strokeWidth="1.4" style={{ pointerEvents: 'none' }} />
          <path d={stockPath} fill="var(--color-stockbg)" stroke="var(--color-stock)" strokeWidth="1.4" style={{ pointerEvents: 'none' }} />
          {marks}
          
          {hoverIndex !== null && points[hoverIndex] && (
            <g style={{ pointerEvents: 'none' }}>
              <line 
                x1={points[hoverIndex].x} 
                y1="0" 
                x2={points[hoverIndex].x} 
                y2="216" 
                stroke="var(--color-fg3)" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
              />
              <circle 
                cx={points[hoverIndex].x} 
                cy={points[hoverIndex].y} 
                r="4" 
                fill="var(--color-stock)" 
                stroke="var(--color-bg)" 
                strokeWidth="2" 
              />
            </g>
          )}
        </svg>
        
        {hoverIndex !== null && points[hoverIndex] && (
          <div 
            className="absolute top-[10px] left-[10px] bg-pane2 border border-line rounded-[4px] p-[8px] font-mono text-[10px] text-fg pointer-events-none shadow-lg z-10"
          >
            <div className="text-fg3 mb-[4px]">Price Details</div>
            <div className="flex justify-between gap-[16px]">
              <span className="text-meme">Meme</span>
              <span>{points[hoverIndex].memeValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-[16px]">
              <span className="text-stock">Stock</span>
              <span>{points[hoverIndex].stockValue.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
