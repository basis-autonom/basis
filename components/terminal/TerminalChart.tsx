'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Timeframe = '1h' | '4h' | '24h' | '7d' | '30d';

interface TerminalChartProps {
  seed: string;
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}

type HourlyPoint = { t: number; meme: number | null; stock: number | null };
type HourlyResponse = {
  kind: 'ok' | 'no_pool' | 'no_stock_leg' | 'error';
  points: HourlyPoint[];
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TerminalChart({ seed, timeframe, onTimeframeChange }: TerminalChartProps) {
  const [response, setResponse] = useState<HourlyResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(seed));
  const [error, setError] = useState(false);
  const fetchedSeed = useRef<string | null>(null);

  useEffect(() => {
    if (!seed || fetchedSeed.current === seed) return;
    fetchedSeed.current = seed;
    const requestedSeed = seed;
    setResponse(null);
    setLoading(true);
    setError(false);

    fetch(`/api/split/${encodeURIComponent(seed)}/hourly`, {
    })
      .then(async (result) => {
        if (!result.ok) throw new Error(`Hourly request failed: ${result.status}`);
        return (await result.json()) as HourlyResponse;
      })
      .then((nextResponse) => {
        if (fetchedSeed.current === requestedSeed) setResponse(nextResponse);
      })
      .catch(() => {
        if (fetchedSeed.current === requestedSeed) setError(true);
      })
      .finally(() => {
        if (fetchedSeed.current === requestedSeed) setLoading(false);
      });
  }, [seed]);

  const points = useMemo(() => {
    const all = response?.points ?? [];
    if (timeframe === '1h') return all.slice(-1);
    if (timeframe === '4h') return all.slice(-4);
    return all;
  }, [response, timeframe]);

  const { grid, bars, labels, hasData } = useMemo(() => {
    const W = 1000, H = 216;
    const plotTop = 8;
    const plotBottom = H - 18;
    const grids = [];
    for (let g = 1; g < 4; g++) {
      const gy = plotTop + g * ((plotBottom - plotTop) / 4);
      grids.push(<line key={g} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--color-line)" strokeWidth="1"/>);
    }
    const maxAbs = Math.max(
      0.1,
      ...points.flatMap((point) => [Math.abs(point.meme ?? 0), Math.abs(point.stock ?? 0)]),
    );
    const baseline = plotBottom;
    const scale = (plotBottom - plotTop) / maxAbs;
    const width = W / Math.max(points.length, 1);
    const renderedBars: React.ReactElement[] = [];
    const renderedLabels: React.ReactElement[] = [];

    points.forEach((point, index) => {
      const x = index * width + 3;
      const barWidth = Math.max(2, width - 6);
      const memeHeight = point.meme == null ? 0 : Math.abs(point.meme * scale);
      const stockHeight = point.stock == null ? 0 : Math.abs(point.stock * scale);
      const memeY = baseline - memeHeight;
      const stockY = baseline - (point.meme != null ? memeHeight : 0) - stockHeight;

      if (point.meme != null) {
        renderedBars.push(<rect key={`meme-${point.t}`} x={x} y={memeY} width={barWidth} height={memeHeight} fill="var(--color-memebg)" stroke="var(--color-meme)" strokeWidth="1" />);
      }
      if (point.stock != null) {
        renderedBars.push(<rect key={`stock-${point.t}`} x={x} y={stockY} width={barWidth} height={stockHeight} fill="var(--color-stockbg)" stroke="var(--color-stock)" strokeWidth="1" />);
      }
      if (index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)) {
        renderedLabels.push(<text key={`label-${point.t}`} x={x + barWidth / 2} y={H - 2} textAnchor="middle" fill="var(--color-fg3)" fontSize="10" fontFamily="var(--font-mono)">{formatTime(point.t)}</text>);
      }
    });

    return { grid: grids, bars: renderedBars, labels: renderedLabels, hasData: points.some((point) => point.meme != null || point.stock != null) };
  }, [points]);

  return (
    <div className="flex flex-col border-b border-line bg-bg min-h-0 flex-1 relative h-full">
      <div
        className="flex items-center justify-between"
        style={{ padding: "9px 16px 4px" }}
      >
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
          <line x1="0" y1="198" x2="1000" y2="198" stroke="var(--color-line2)" strokeWidth="1" />
          {bars}
          {labels}
        </svg>
        {!hasData && (
          <div className="relative font-mono text-[11px] text-fg3 bg-bg px-[10px] py-[4px] border border-line rounded-[3px]">
            {loading ? 'Loading hourly data…' : error ? 'Hourly data unavailable.' : 'No hourly data available.'}
          </div>
        )}
      </div>
    </div>
  );
}
