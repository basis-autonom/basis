"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTerminalRows } from "@/components/shell/TerminalDataProvider";

type MarketRow = {
  ca?: string;
  poolId?: string;
  coin?: string;
  coinName?: string;
  quote?: string;
  priceUsd?: number | null;
  chg24h?: number | null;
  meme24h?: number | null;
  stock24h?: number | null;
  stockFeedUpdatedAt?: number | null;
  liquidity?: number | null;
};

const FEED_LIVENESS_WINDOW_MS = 3 * 60 * 60 * 1000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type HoursDiagnostic = {
  kind: "success" | "error";
  data?: MarketRow[];
  source?: "registry" | "chain" | "pools";
  message?: string;
};

function formatPrice(price: number | null | undefined) {
  if (price == null) return "—";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatAge(milliseconds: number | null) {
  if (milliseconds == null || milliseconds < 0) return "—";
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getEtPart(date: Date, part: "weekday" | "hour" | "minute") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    [part]: part === "hour" || part === "minute" ? "numeric" : "short",
    ...(part === "hour" ? { hour12: false } : {}),
  });
  return formatter.format(date);
}

function getEtDayIndex(date: Date) {
  const weekday = getEtPart(date, "weekday");
  const index = WEEKDAYS.indexOf(weekday);
  return index === -1 ? 0 : index;
}

function FeedState({ updatedAt, now }: { updatedAt?: number | null; now: number }) {
  if (!updatedAt || !now) {
    return <span className="hours-state hours-state--unknown">no feed timestamp</span>;
  }

  const age = now - updatedAt;
  const fresh = age >= 0 && age <= FEED_LIVENESS_WINDOW_MS;
  return (
    <span className={`hours-state ${fresh ? "hours-state--live" : "hours-state--frozen"}`}>
      <i aria-hidden="true" />
      {fresh ? "feed live" : "feed frozen"}
    </span>
  );
}

export function MarketHoursView() {
  const { rows } = useTerminalRows() as { rows: MarketRow[] };
  const [diagnosticRows, setDiagnosticRows] = useState<MarketRow[]>([]);
  const [diagnostic, setDiagnostic] = useState<HoursDiagnostic | null>(null);
  const diagnosticRequested = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (rows.length > 0 || diagnosticRequested.current) return;
    diagnosticRequested.current = true;

    fetch("/api/hours")
      .then(async (response) => {
        const result = (await response.json()) as HoursDiagnostic;
        if (result.kind === "success" && result.data?.length) {
          setDiagnosticRows(result.data);
        }
        setDiagnostic(result);
      })
      .catch(() => {
        setDiagnostic({
          kind: "error",
          source: "chain",
          message: "The hours snapshot request failed before a chain read completed.",
        });
      });
  }, [rows.length]);

  const visibleRows = rows.length > 0 ? rows : diagnosticRows;

  const observations = useMemo(() => {
    return (visibleRows || []).map((row) => {
      const updatedAt = row.stockFeedUpdatedAt ?? null;
      const age = updatedAt && now ? Math.max(0, now - updatedAt) : null;
      const feedLive = age != null && age <= FEED_LIVENESS_WINDOW_MS;
      return { row, updatedAt, age, feedLive };
    });
  }, [visibleRows, now]);

  const feedRows = observations.filter((observation) => observation.updatedAt != null);
  const liveCount = feedRows.filter((observation) => observation.feedLive).length;
  const frozenCount = feedRows.length - liveCount;
  const latestUpdate = feedRows.reduce<number | null>((latest, observation) => {
    if (observation.updatedAt == null) return latest;
    return latest == null ? observation.updatedAt : Math.max(latest, observation.updatedAt);
  }, null);

  const aggregateState =
    feedRows.length === 0
      ? "unavailable"
      : liveCount === feedRows.length
        ? "live"
        : liveCount === 0
          ? "frozen"
          : "mixed";

  const currentDate = latestUpdate ? new Date(latestUpdate) : null;
  const currentDayIndex = currentDate ? getEtDayIndex(currentDate) : -1;
  const hour = currentDate ? Number(getEtPart(currentDate, "hour")) : 0;
  const minute = currentDate ? Number(getEtPart(currentDate, "minute")) : 0;
  const nowPosition = Math.min(100, Math.max(0, ((hour + minute / 60) / 24) * 100));

  const weekLabel = currentDate
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
      }).format(new Date(currentDate.getTime() - currentDayIndex * 86400000))
    : "syncing";

  return (
    <div className="hours-page">
      <header className="hours-header">
        <div className="hours-title">
          <h1>Market hours</h1>
          <p>When the stock leg can reprice, and what the meme did while it could not</p>
        </div>

        <div className="hours-stats" aria-label="Market hours summary">
          <div className="hours-stat">
            <span>Now</span>
            <strong className={`hours-value hours-value--${aggregateState}`}>
              {aggregateState === "unavailable" ? "unknown" : aggregateState}
            </strong>
          </div>
          <div className="hours-stat">
            <span>Latest feed</span>
            <strong>{latestUpdate && now ? `${formatAge(now - latestUpdate)} ago` : "—"}</strong>
          </div>
          <div className="hours-stat">
            <span>Feed coverage</span>
            <strong>{feedRows.length ? `${liveCount}/${feedRows.length} live` : "—"}</strong>
          </div>
          <div className="hours-stat">
            <span>Tracked pools</span>
            <strong>{visibleRows.length}</strong>
          </div>
        </div>
      </header>

      <section className="hours-panel hours-week-panel">
        <div className="hours-panel-head">
          <div>
            <h2>This week</h2>
            <p>Observed Chainlink feed state; no exchange calendar is assumed.</p>
          </div>
          <span className="hours-mono">week of {weekLabel} · {frozenCount} frozen signals</span>
        </div>

        <div className="hours-week" role="img" aria-label="Weekly Chainlink feed observations">
          {WEEKDAYS.map((day, index) => {
            const isToday = index === currentDayIndex;
            const currentState =
              aggregateState === "unavailable"
                ? "no feed snapshot"
                : aggregateState === "mixed"
                  ? "mixed feed state"
                  : aggregateState === "live"
                    ? "feed live"
                    : "feed frozen";
            return (
              <div className={`hours-day ${isToday ? "hours-day--today" : ""}`} key={day}>
                <div className="hours-day-label">
                  <span>{day}</span>
                  {isToday && <b>latest</b>}
                </div>
                <div className="hours-day-track">
                  {isToday ? (
                    <div className={`hours-observed-state hours-observed-state--${aggregateState}`}>
                      <span>{currentState}</span>
                      <small>latest Chainlink observation</small>
                    </div>
                  ) : (
                    <span className="hours-closed">no snapshot for this day</span>
                  )}
                </div>
              </div>
            );
          })}
          {currentDate && <div className="hours-now-line" style={{ left: `${(currentDayIndex * 100) / 7 + nowPosition / 7}%` }} />}
        </div>

        <div className="hours-legend">
          <span><i className="hours-swatch hours-swatch--stock" />stock feed live</span>
          <span><i className="hours-swatch hours-swatch--frozen" />feed outside liveness window</span>
          <span><i className="hours-swatch hours-swatch--meme" />meme leg remains onchain-live</span>
          <span className="hours-legend-note">Market state comes from feed timestamps, never a calendar.</span>
        </div>
      </section>

      <section className="hours-panel hours-log-panel">
        <div className="hours-panel-head">
          <div>
            <h2>Freeze log</h2>
            <p>Every row is a pool currently indexed by the terminal. Movement is measured over the same 24h window.</p>
          </div>
          <span className="hours-mono">{visibleRows.length} pool reads · live</span>
        </div>

        {observations.length > 0 ? (
          <div className="hours-table-wrap">
            <table className="hours-table">
              <thead>
                <tr>
                  <th>Feed state</th>
                  <th>Coin</th>
                  <th>Quote</th>
                  <th className="hours-right">Feed age</th>
                  <th className="hours-right">Pool ratio move · 24h</th>
                  <th className="hours-right">Stock feed move · 24h</th>
                  <th className="hours-right">Pool price</th>
                  <th className="hours-right">Liquidity</th>
                </tr>
              </thead>
              <tbody>
                {observations.map(({ row, age, updatedAt }) => {
                  const href = row.ca || row.poolId ? `/c/${row.ca || row.poolId}` : null;
                  const coin = row.coin || "—";
                  return (
                    <tr key={row.ca || row.poolId || coin}>
                      <td><FeedState updatedAt={updatedAt} now={now} /></td>
                      <td>
                        {href ? <Link href={href} className="hours-coin" title={row.coinName || coin}>{coin}</Link> : <span className="hours-coin">{coin}</span>}
                      </td>
                      <td><span className="hours-quote">{row.quote || "—"}</span></td>
                      <td className="hours-right hours-mono">{age == null ? "—" : formatAge(age)}</td>
                      <td className={`hours-right hours-mono ${row.meme24h == null ? "" : row.meme24h >= 0 ? "hours-up" : "hours-down"}`}>{formatPct(row.meme24h)}</td>
                      <td className={`hours-right hours-mono ${row.stock24h == null ? "" : row.stock24h >= 0 ? "hours-up" : "hours-down"}`}>{formatPct(row.stock24h)}</td>
                      <td className="hours-right hours-mono">{formatPrice(row.priceUsd)}</td>
                      <td className="hours-right hours-mono hours-muted">{formatMoney(row.liquidity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hours-empty">
            <span>
              {diagnostic?.kind === "error"
                ? diagnostic.message
                : "No stock-paired pools are available from the current chain read."}
            </span>
            <small>
              {diagnostic?.source === "registry"
                ? "Cause: the official stock-token registry could not be reached. No substitute data is used."
                : diagnostic?.source === "chain"
                  ? "Cause: the RPC chain read did not complete. No substitute data is used."
                  : "Cause: the registry loaded, but no verified stock-paired pool rows were returned."}
            </small>
          </div>
        )}
      </section>

      <section className="hours-bottom-grid">
        <article className="hours-panel hours-copy-panel">
          <div className="hours-panel-head"><h2>What a freeze means</h2></div>
          <p>When a Chainlink stock feed stops updating, the underlying stock leg is treated as frozen. The memecoin side still trades on Robinhood Chain, so the pool ratio can keep moving.</p>
          <p>This board reports that movement directly. It does not infer a stock price from an assumed constant meme value.</p>
        </article>
        <article className="hours-panel hours-copy-panel">
          <div className="hours-panel-head"><h2>Reading the board</h2><span className="hours-mono">plain rules</span></div>
          <div className="hours-rule"><span>Feed state</span><strong>latest Chainlink update age</strong></div>
          <div className="hours-rule"><span>Pool move</span><strong>pool ratio change over 24h</strong></div>
          <div className="hours-rule"><span>Stock move</span><strong>Chainlink price change over 24h</strong></div>
          <div className="hours-rule"><span>Pool price</span><strong>pool ratio × stock feed</strong></div>
        </article>
      </section>
    </div>
  );
}
