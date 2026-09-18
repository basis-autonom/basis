'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HourlyContributionChart, type HourlyPoint } from '@/components/charts/HourlyContributionChart';

type Timeframe = '1h' | '4h' | '24h' | '7d' | '30d';

interface TerminalChartProps {
  seed: string;
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}

type HourlyResponse = {
  kind: 'ok' | 'no_pool' | 'no_stock_leg' | 'error';
  points: HourlyPoint[];
};

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
        <HourlyContributionChart
          points={points}
          state={loading ? 'loading' : error ? 'error' : 'ready'}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
