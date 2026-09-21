'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { HourlyPoint, Window } from '@/packages/core/types';

export type { HourlyGapReason, HourlyPoint } from '@/packages/core/types';

type HourlyResponse = {
  kind: 'ok' | 'no_pool' | 'no_stock_leg' | 'error';
  points: HourlyPoint[];
};

type ChartState = 'loading' | 'ready' | 'error';

interface HourlyContributionChartProps {
  points?: HourlyPoint[];
  tokenAddress?: string;
  window?: Window;
  state?: ChartState;
  className?: string;
  emptyLabel?: string;
}

type BarGeometry = {
  x: number;
  width: number;
  memeHeight: number;
  stockHeight: number;
  top: number;
  hitX: number;
  hitWidth: number;
};

type HoverState = {
  index: number;
  left: number;
  top: number;
  visible: boolean;
};

const WIDTH = 1000;
const HEIGHT = 216;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 198;
const TOOLTIP_WIDTH = 224;
const TOOLTIP_HEIGHT = 116;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function subscribeToBrowserTimeZone() {
  return () => {};
}

function formatTimestamp(timestamp: number, timeZone: string) {
  const date = new Date(timestamp);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  }).format(date).toLowerCase();
  return `${datePart} ${timePart}`;
}

function formatAxisTimestamp(timestamp: number, spanMs: number, timeZone: string) {
  if (spanMs > 48 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone,
    }).format(new Date(timestamp));
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(timestamp));
}

function formatPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  const digits = Math.abs(value) < 0.1 ? 2 : 1;
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function totalFor(point: HourlyPoint) {
  if (point.meme == null || point.stock == null) return null;
  return ((1 + point.meme / 100) * (1 + point.stock / 100) - 1) * 100;
}

function statusFor(point: HourlyPoint) {
  if (point.gap === 'fetch_failed') {
    return 'Data unavailable — fetch failed after retries';
  }
  if (point.gap === 'market_closed') {
    return 'No stock leg data — market closed';
  }
  if (point.stock == null) {
    return 'No stock leg data — unavailable';
  }
  if (point.meme == null) {
    return 'No meme component data — pool history unavailable';
  }
  return null;
}

export function HourlyContributionChart({
  points: providedPoints,
  tokenAddress,
  window = '24h',
  state: providedState,
  className,
  emptyLabel = 'No hourly data available.',
}: HourlyContributionChartProps) {
  const [remotePoints, setRemotePoints] = useState<HourlyPoint[] | null>(null);
  const [remoteState, setRemoteState] = useState<ChartState>(tokenAddress ? 'loading' : 'ready');
  const [hover, setHover] = useState<HoverState | null>(null);
  // The server snapshot is deterministic; the hydrated client snapshot is
  // the visitor's own timezone. Never hardcode WIB/UTC for the UI.
  const browserTimeZone = useSyncExternalStore(
    subscribeToBrowserTimeZone,
    getBrowserTimeZone,
    () => 'UTC',
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tokenAddress) return;

    let cancelled = false;
    setRemotePoints(null);
    setRemoteState('loading');

    const fetchHourly = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(`/api/split/${encodeURIComponent(tokenAddress)}/hourly?window=${window}`);
          if (!response.ok) throw new Error(`Hourly request failed: ${response.status}`);
          return (await response.json()) as HourlyResponse;
        } catch (error) {
          lastError = error;
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Hourly request failed');
    };

    fetchHourly()
      .then((response) => {
        if (cancelled) return;
        setRemotePoints(response.points ?? []);
        setRemoteState(response.kind === 'error' ? 'error' : 'ready');
      })
      .catch(() => {
        if (!cancelled) setRemoteState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [tokenAddress, window]);

  const points = providedPoints ?? remotePoints ?? [];
  const state = providedState ?? (tokenAddress ? remoteState : 'ready');

  const { grid, bars, labels, hitAreas, geometry, hasData } = useMemo(() => {
    const grids: React.ReactElement[] = [];
    for (let index = 1; index < 4; index += 1) {
      const y = PLOT_TOP + index * ((PLOT_BOTTOM - PLOT_TOP) / 4);
      grids.push(
        <line
          key={`grid-${index}`}
          x1="0"
          y1={y}
          x2={WIDTH}
          y2={y}
          stroke="var(--color-line)"
          strokeWidth="1"
        />,
      );
    }

    const maxStack = Math.max(
      0.1,
      ...points.map((point) => Math.abs(point.meme ?? 0) + Math.abs(point.stock ?? 0)),
    );
    const scale = (PLOT_BOTTOM - PLOT_TOP) / maxStack;
    const nextGeometry: BarGeometry[] = [];
    const renderedBars: React.ReactElement[] = [];
    const renderedLabels: React.ReactElement[] = [];
    const renderedHitAreas: React.ReactElement[] = [];

    const firstDelta = points.length > 1 ? points[1].t - points[0].t : 60 * 60 * 1000;
    const domainStart = points.length > 0 ? points[0].t - firstDelta : 0;
    const domainEnd = points.length > 0 ? points[points.length - 1].t : domainStart + firstDelta;
    const domainSpan = Math.max(domainEnd - domainStart, 1);
    const xForTime = (timestamp: number) =>
      ((timestamp - domainStart) / domainSpan) * WIDTH;

    points.forEach((point, index) => {
      const intervalStart = index === 0 ? domainStart : points[index - 1].t;
      const hitX = xForTime(intervalStart);
      const hitEnd = xForTime(point.t);
      const hitWidth = Math.max(1, hitEnd - hitX);
      const x = hitX + 3;
      const barWidth = Math.max(2, hitWidth - 6);
      const memeHeight = point.meme == null ? 0 : Math.abs(point.meme * scale);
      const stockHeight = point.stock == null ? 0 : Math.abs(point.stock * scale);
      const top = PLOT_BOTTOM - memeHeight - stockHeight;
      nextGeometry.push({ x, width: barWidth, memeHeight, stockHeight, top, hitX, hitWidth });

      if (point.gap) {
        const isFetchFailure = point.gap === 'fetch_failed';
        renderedBars.push(
          <rect
            key={`gap-${point.t}`}
            x={x}
            y={PLOT_TOP}
            width={barWidth}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill={isFetchFailure ? 'var(--color-downbg)' : 'var(--color-pane2)'}
            stroke={isFetchFailure ? 'var(--color-down)' : 'var(--color-fg3)'}
            strokeDasharray={isFetchFailure ? '3 2' : undefined}
            strokeWidth="1"
            opacity="0.42"
          />,
        );
      }

      if (point.meme != null) {
        renderedBars.push(
          <rect
            key={`meme-${point.t}`}
            x={x}
            y={PLOT_BOTTOM - memeHeight}
            width={barWidth}
            height={memeHeight}
            fill="var(--color-memebg)"
            stroke="var(--color-meme)"
            strokeWidth="1"
          />,
        );
      }
      if (point.stock != null) {
        renderedBars.push(
          <rect
            key={`stock-${point.t}`}
            x={x}
            y={PLOT_BOTTOM - memeHeight - stockHeight}
            width={barWidth}
            height={stockHeight}
            fill="var(--color-stockbg)"
            stroke="var(--color-stock)"
            strokeWidth="1"
          />,
        );
      }

      renderedHitAreas.push(
        <rect
          key={`hit-${point.t}`}
          className="hourly-chart-hit-area"
          x={hitX}
          y={PLOT_TOP}
          width={hitWidth}
          height={PLOT_BOTTOM - PLOT_TOP}
          fill="transparent"
          tabIndex={0}
          aria-label={`Hourly contribution at ${formatTimestamp(point.t, browserTimeZone ?? 'UTC')}`}
          onPointerMove={(event) => {
            handleMove(event.clientX, event.clientY, index);
          }}
          onFocus={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            handleMove(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, index);
          }}
        />,
      );

    });

    const labelTimes = [domainStart, domainStart + domainSpan / 2, domainEnd];
    labelTimes.forEach((timestamp, index) => {
      renderedLabels.push(
        <text
          key={`label-${timestamp}`}
          x={xForTime(timestamp)}
          y={HEIGHT - 2}
          textAnchor={index === 0 ? 'start' : index === labelTimes.length - 1 ? 'end' : 'middle'}
          fill="var(--color-fg3)"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          {formatAxisTimestamp(timestamp, domainSpan, browserTimeZone ?? 'UTC')}
        </text>,
      );
    });

    return {
      grid: grids,
      bars: renderedBars,
      labels: renderedLabels,
      hitAreas: renderedHitAreas,
      geometry: nextGeometry,
      hasData: points.length > 0,
    };
  }, [browserTimeZone, points]);

  function handleMove(clientX: number, clientY: number, forcedIndex: number | null) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const surface = surfaceRef.current;
    if (!surface || points.length === 0) return;

    const bounds = surface.getBoundingClientRect();
    const localX = clamp(clientX - bounds.left, 0, bounds.width);
    const localY = clamp(clientY - bounds.top, 0, bounds.height);
    const svgX = (localX / Math.max(bounds.width, 1)) * WIDTH;
    const hitIndex = geometry.findIndex(
      (bar) => svgX >= bar.hitX && svgX <= bar.hitX + bar.hitWidth,
    );
    const calculatedIndex = hitIndex >= 0
      ? hitIndex
      : Math.min(
        points.length - 1,
        Math.max(0, Math.floor((svgX / WIDTH) * points.length)),
      );
    const index = forcedIndex ?? calculatedIndex;
    const bar = geometry[index];
    const tooltipWidth = Math.min(TOOLTIP_WIDTH, Math.max(160, bounds.width - 16));
    const barTop = bar ? (bar.top / HEIGHT) * bounds.height : localY;
    const baseline = (PLOT_BOTTOM / HEIGHT) * bounds.height;
    const aboveTop = barTop - TOOLTIP_HEIGHT - 10;
    const belowTop = baseline + 10;
    const hasRoomAbove = aboveTop >= 8;
    const hasRoomBelow = belowTop + TOOLTIP_HEIGHT <= bounds.height - 8;
    let top = hasRoomAbove
      ? aboveTop
      : hasRoomBelow
        ? belowTop
        : clamp(barTop - TOOLTIP_HEIGHT / 2, 8, Math.max(8, bounds.height - TOOLTIP_HEIGHT - 8));

    const barLeft = ((bar?.x ?? localX) / WIDTH) * bounds.width;
    const barRight = (((bar?.x ?? localX) + (bar?.width ?? 0)) / WIDTH) * bounds.width;
    const midpoint = (barLeft + barRight) / 2;
    const rightCandidate = barRight + 12;
    const leftCandidate = barLeft - tooltipWidth - 12;
    const rightFits = rightCandidate + tooltipWidth <= bounds.width - 8;
    const leftFits = leftCandidate >= 8;
    let left = midpoint < bounds.width / 2
      ? rightFits ? rightCandidate : leftCandidate
      : leftFits ? leftCandidate : rightCandidate;
    left = clamp(left, 8, Math.max(8, bounds.width - tooltipWidth - 8));
    top = clamp(top, -TOOLTIP_HEIGHT - 8, Math.max(8, bounds.height - TOOLTIP_HEIGHT - 8));

    setHover({ index, left, top, visible: true });
  }

  function handleSurfaceMove(event: React.PointerEvent<HTMLDivElement>) {
    if (points.length === 0) return;
    const target = surfaceRef.current?.querySelector('svg');
    if (!target) return;
    handleMove(event.clientX, event.clientY, null);
  }

  function handleLeave() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHover((current) => current ? { ...current, visible: false } : current);
    hideTimer.current = setTimeout(() => {
      setHover((current) => current?.visible ? current : null);
    }, 180);
  }

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const activePoint = hover ? points[hover.index] : null;
  const status = activePoint ? statusFor(activePoint) : null;

  return (
    <div
      ref={surfaceRef}
      className={`hourly-chart-surface relative w-full ${className ?? ''}`}
      onPointerMove={handleSurfaceMove}
      onPointerLeave={handleLeave}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Hourly contribution split"
        className="absolute inset-0 h-full w-full"
      >
        {grid}
        <line x1="0" y1={PLOT_BOTTOM} x2={WIDTH} y2={PLOT_BOTTOM} stroke="var(--color-line2)" strokeWidth="1" />
        {bars}
        {hitAreas}
        {labels}
      </svg>

      {hover && activePoint && (
        <div
          role="status"
          aria-live="polite"
          className={`hourly-chart-tooltip ${hover.visible ? 'is-visible' : ''}`}
          style={{ left: hover.left, top: hover.top, width: `min(${TOOLTIP_WIDTH}px, calc(100% - 16px))` }}
        >
          <div className="hourly-chart-tooltip__time">{formatTimestamp(activePoint.t, browserTimeZone ?? 'UTC')}</div>
          <div className="hourly-chart-tooltip__row">
            <span className="text-meme">meme component</span>
            <strong className="text-meme">{formatPercent(activePoint.meme)}</strong>
          </div>
          <div className="hourly-chart-tooltip__row">
            <span className="text-stock">stock component</span>
            <strong className="text-stock">{formatPercent(activePoint.stock)}</strong>
          </div>
          <div className="hourly-chart-tooltip__row">
            <span className="text-fg2">total</span>
            <strong className="text-fg">{formatPercent(totalFor(activePoint))}</strong>
          </div>
          {status && <div className="hourly-chart-tooltip__status">{status}</div>}
        </div>
      )}

      {!hasData && (
        <div className="relative flex h-full items-center justify-center font-mono text-[11px] text-fg3">
          {state === 'loading' ? 'Loading hourly data…' : state === 'error' ? 'Hourly data unavailable.' : emptyLabel}
        </div>
      )}
    </div>
  );
}
