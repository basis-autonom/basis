'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HourlyPoint } from './HourlyContributionChart';

type DriftResponse = {
  kind: 'ok' | 'no_pool' | 'no_stock_leg' | 'error';
  points: HourlyPoint[];
};

type DriftStripProps = {
  tokenAddress: string;
};

function formatPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  const digits = Math.abs(value) < 0.1 ? 2 : 1;
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function totalFor(point: HourlyPoint) {
  if (point.meme == null || point.stock == null) return null;
  return ((1 + point.meme / 100) * (1 + point.stock / 100) - 1) * 100;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }).format(new Date(timestamp));
}

export function DriftStrip({ tokenAddress }: DriftStripProps) {
  const [points, setPoints] = useState<HourlyPoint[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/split/${encodeURIComponent(tokenAddress)}/hourly?window=30d`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Drift request failed: ${response.status}`);
        return (await response.json()) as DriftResponse;
      })
      .then((response) => {
        if (cancelled) return;
        setPoints(response.points ?? []);
        setState(response.kind === 'error' ? 'error' : 'ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  const observed = useMemo(
    () => points.filter((point) => point.meme != null),
    [points],
  );
  const redCount = observed.filter((point) => (point.meme ?? 0) < 0).length;
  const activePoint = activeIndex == null ? null : points[activeIndex] ?? null;

  if (state === 'loading') {
    return (
      <div className="flex h-[30px] items-center justify-center font-mono text-[10px] text-fg3">
        Reading 30-day drift…
      </div>
    );
  }

  if (state === 'error' || points.length === 0) {
    return (
      <div className="flex h-[30px] items-center justify-center font-mono text-[10px] text-fg3">
        30-day drift unavailable.
      </div>
    );
  }

  return (
    <div className="relative" onPointerLeave={() => setActiveIndex(null)}>
      <div className="flex gap-[2px]" role="list" aria-label="30-day meme component drift">
        {points.map((point, index) => {
          const unavailable = point.meme == null;
          const positive = point.meme != null && point.meme >= 0;
          return (
            <button
              key={point.t}
              type="button"
              role="listitem"
              aria-label={`${formatDate(point.t)}: meme ${formatPercent(point.meme)}, stock ${formatPercent(point.stock)}`}
              className="h-[30px] min-w-0 flex-1 border-0 p-0 transition-[filter,transform] duration-150 hover:brightness-125 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-meme"
              style={{
                background: unavailable
                  ? 'var(--color-pane2)'
                  : positive
                    ? 'var(--color-memebg)'
                    : '#3A1A1A',
                borderTop: `2px solid ${unavailable ? 'var(--color-fg3)' : positive ? 'var(--color-meme)' : 'var(--color-down)'}`,
              }}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          );
        })}
      </div>

      {activePoint && activeIndex != null && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-[40px] z-20 w-[218px] rounded-[3px] border border-line2 bg-pane px-[10px] py-[8px] font-mono text-[10px] shadow-[0_8px_24px_rgb(0_0_0_/35%)]"
          style={{
            left: `${((activeIndex + 0.5) / points.length) * 100}%`,
            transform: `translateX(${activeIndex < points.length / 2 ? '0' : '-100%'})`,
          }}
        >
          <div className="mb-[6px] text-fg">{formatDate(activePoint.t)}</div>
          <div className="flex justify-between text-meme">
            <span>meme component</span><strong>{formatPercent(activePoint.meme)}</strong>
          </div>
          <div className="flex justify-between text-stock">
            <span>stock component</span><strong>{formatPercent(activePoint.stock)}</strong>
          </div>
          <div className="flex justify-between text-fg2">
            <span>total</span><strong className="text-fg">{formatPercent(totalFor(activePoint))}</strong>
          </div>
          {activePoint.stock == null && (
            <div className="mt-[6px] border-t border-line pt-[5px] text-fg3">No stock leg data — market closed</div>
          )}
        </div>
      )}

      <div className="mt-[6px] flex justify-between font-mono text-[10px] text-fg3">
        <span>30d ago</span>
        <span>{observed.length ? `${redCount} red intervals of ${observed.length} observed` : 'No observed intervals'}</span>
        <span>today</span>
      </div>
    </div>
  );
}
