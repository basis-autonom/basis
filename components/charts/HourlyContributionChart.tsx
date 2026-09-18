'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export type HourlyPoint = {
  t: number;
  meme: number | null;
  stock: number | null;
};

type HourlyResponse = {
  kind: 'ok' | 'no_pool' | 'no_stock_leg' | 'error';
  points: HourlyPoint[];
};

type ChartState = 'loading' | 'ready' | 'error';

interface HourlyContributionChartProps {
  points?: HourlyPoint[];
  tokenAddress?: string;
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

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date).toLowerCase();
  return `${datePart} ${timePart}`;
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
  if (point.meme == null && point.stock == null) {
    return 'No data for this hour';
  }
  if (point.stock == null) {
    return 'No stock leg data — market closed';
  }
  if (point.meme == null) {
    return 'No meme component data — pool history unavailable';
  }
  return null;
}

export function HourlyContributionChart({
  points: providedPoints,
  tokenAddress,
  state: providedState,
  className,
  emptyLabel = 'No hourly data available.',
}: HourlyContributionChartProps) {
  const [remotePoints, setRemotePoints] = useState<HourlyPoint[] | null>(null);
  const [remoteState, setRemoteState] = useState<ChartState>(tokenAddress ? 'loading' : 'ready');
  const [hover, setHover] = useState<HoverState | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tokenAddress) return;

    let cancelled = false;
    setRemotePoints(null);
    setRemoteState('loading');

    fetch(`/api/split/${encodeURIComponent(tokenAddress)}/hourly`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Hourly request failed: ${response.status}`);
        return (await response.json()) as HourlyResponse;
      })
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
  }, [tokenAddress]);

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
    const width = WIDTH / Math.max(points.length, 1);
    const nextGeometry: BarGeometry[] = [];
    const renderedBars: React.ReactElement[] = [];
    const renderedLabels: React.ReactElement[] = [];
    const renderedHitAreas: React.ReactElement[] = [];

    points.forEach((point, index) => {
      const x = index * width + 3;
      const barWidth = Math.max(2, width - 6);
      const memeHeight = point.meme == null ? 0 : Math.abs(point.meme * scale);
      const stockHeight = point.stock == null ? 0 : Math.abs(point.stock * scale);
      const top = PLOT_BOTTOM - memeHeight - stockHeight;
      nextGeometry.push({ x, width: barWidth, memeHeight, stockHeight, top });

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
          x={index * width}
          y={PLOT_TOP}
          width={width}
          height={PLOT_BOTTOM - PLOT_TOP}
          fill="transparent"
          tabIndex={0}
          aria-label={`Hourly contribution at ${formatTimestamp(point.t)}`}
          onPointerMove={(event) => {
            handleMove(event.clientX, event.clientY, index);
          }}
          onFocus={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            handleMove(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, index);
          }}
        />,
      );

      if (index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)) {
        renderedLabels.push(
          <text
            key={`label-${point.t}`}
            x={x + barWidth / 2}
            y={HEIGHT - 2}
            textAnchor="middle"
            fill="var(--color-fg3)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {new Date(point.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>,
        );
      }
    });

    return {
      grid: grids,
      bars: renderedBars,
      labels: renderedLabels,
      hitAreas: renderedHitAreas,
      geometry: nextGeometry,
      hasData: points.some((point) => point.meme != null || point.stock != null),
    };
  }, [points]);

  function handleMove(clientX: number, clientY: number, forcedIndex: number | null) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const surface = surfaceRef.current;
    if (!surface || points.length === 0) return;

    const bounds = surface.getBoundingClientRect();
    const localX = clamp(clientX - bounds.left, 0, bounds.width);
    const calculatedIndex = Math.min(
      points.length - 1,
      Math.max(0, Math.floor((localX / Math.max(bounds.width, 1)) * points.length)),
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
    let top = hasRoomAbove ? aboveTop : hasRoomBelow ? belowTop : -TOOLTIP_HEIGHT - 8;

    const midpoint = ((bar?.x ?? localX) + (bar?.width ?? 0) / 2) / WIDTH * bounds.width;
    let left = midpoint < bounds.width / 2 ? midpoint + 12 : midpoint - tooltipWidth - 12;
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
      className={`hourly-chart-surface relative h-full w-full ${className ?? ''}`}
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
          <div className="hourly-chart-tooltip__time">{formatTimestamp(activePoint.t)}</div>
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
