"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTerminalRows } from "@/components/shell/TerminalDataProvider";
import type { DayObservation } from "@/packages/core/hours";

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

interface MarketHoursViewProps {
  initialWeekHistory?: DayObservation[];
}

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

export function MarketHoursView({ initialWeekHistory }: MarketHoursViewProps = {}) {
  const { rows } = useTerminalRows() as { rows: MarketRow[] };
  const [diagnosticRows, setDiagnosticRows] = useState<MarketRow[]>([]);
  const [diagnostic, setDiagnostic] = useState<HoursDiagnostic | null>(null);
  const [weekHistory, setWeekHistory] = useState<DayObservation[]>(initialWeekHistory || []);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<MarketRow | null>(null);
  const diagnosticRequested = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (rows.length > 0 && weekHistory.length > 0) return;
    if (diagnosticRequested.current) return;
    diagnosticRequested.current = true;

    fetch("/api/hours")
      .then(async (response) => {
        const result = (await response.json()) as HoursDiagnostic & { weekHistory?: DayObservation[] };
        if (result.kind === "success") {
          if (result.data?.length) {
            setDiagnosticRows(result.data);
          }
          if (result.weekHistory?.length) {
            setWeekHistory(result.weekHistory);
          }
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
  }, [rows.length, weekHistory.length]);

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

  const selectedRowObservation = useMemo(() => {
    if (!selectedRow) return null;
    return observations.find(
      (o) => (o.row.ca && o.row.ca === selectedRow.ca) || (o.row.poolId && o.row.poolId === selectedRow.poolId)
    );
  }, [selectedRow, observations]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto flex-shrink-0" style={{ gap: "22px", padding: "0 18px", height: 58, minWidth: "100%" }}>
        <div>
          <h1 className="text-[16px] font-semibold text-fg">Market hours</h1>
          <div className="text-[12px] text-fg3">When the stock leg can reprice, and what the meme did while it could not</div>
        </div>

        <div className="flex flex-col flex-shrink-0">
          <div className="text-[10px] text-fg3">Now</div>
          <div className={`font-mono text-[13px] mt-[2px] ${aggregateState === "live" ? "text-up" : aggregateState === "frozen" ? "text-fg" : "text-fg3"}`}>
            {aggregateState === "unavailable" ? "unknown" : aggregateState}
          </div>
        </div>

        <div className="flex flex-col flex-shrink-0">
          <div className="text-[10px] text-fg3">Latest feed</div>
          <div className="font-mono text-[13px] text-fg mt-[2px]">{latestUpdate && now ? `${formatAge(now - latestUpdate)} ago` : "—"}</div>
        </div>

        <div className="flex flex-col flex-shrink-0">
          <div className="text-[10px] text-fg3">Feed coverage</div>
          <div className="font-mono text-[13px] text-fg mt-[2px]">{feedRows.length ? `${liveCount}/${feedRows.length} live` : "—"}</div>
        </div>

        <div className="flex flex-col flex-shrink-0">
          <div className="text-[10px] text-fg3">Tracked pools</div>
          <div className="font-mono text-[13px] text-fg mt-[2px]">{visibleRows.length}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
              const isPast = index < currentDayIndex;
              const dayObs = weekHistory.find((w) => w.day === day);
              const isSelected = selectedDay === day;

              const currentState =
                aggregateState === "unavailable"
                  ? "no feed snapshot"
                  : aggregateState === "mixed"
                    ? "mixed feed state"
                    : aggregateState === "live"
                      ? "feed live"
                      : "feed frozen";

              return (
                <div
                  className={`hours-day ${isToday ? "hours-day--today" : ""} ${isSelected ? "hours-day--selected" : ""} hours-day--clickable`}
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  title={`Click to inspect ${day}`}
                >
                  <div className="hours-day-label">
                    <span>{day}</span>
                    {isToday && <b>latest</b>}
                    {isPast && dayObs && <span className="text-[9px] text-fg3 font-mono">{dayObs.dateLabel}</span>}
                  </div>
                  <div className="hours-day-track">
                    {isToday ? (
                      <div className={`hours-observed-state hours-observed-state--${aggregateState}`}>
                        <span>{currentState}</span>
                        <small>latest Chainlink observation</small>
                      </div>
                    ) : isPast && dayObs && dayObs.state === "live" ? (
                      <div className="hours-observed-state hours-observed-state--live">
                        <span>feed live</span>
                        <small>{dayObs.roundCount} onchain rounds</small>
                      </div>
                    ) : isPast && dayObs && dayObs.state === "frozen" ? (
                      <div className="hours-observed-state hours-observed-state--frozen">
                        <span>feed frozen</span>
                        <small>no rounds observed</small>
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

          {selectedDay && (() => {
            const dayObs = weekHistory.find((w) => w.day === selectedDay);
            const dayIndex = WEEKDAYS.indexOf(selectedDay);
            const isPast = dayIndex < currentDayIndex;
            const isToday = dayIndex === currentDayIndex;

            return (
              <div className="hours-day-info">
                <div className="flex items-center flex-wrap gap-2">
                  <strong className="text-fg font-medium">{selectedDay} {dayObs?.dateLabel ? `(${dayObs.dateLabel})` : ""}</strong>
                  <span className="text-fg3">:</span>
                  {isToday ? (
                    <span className="px-2.5 py-1 rounded-[3px] bg-stock/10 border border-stock/30 text-stock font-mono text-[10px] font-medium tracking-wide inline-flex items-center">
                      LATEST OBSERVATION · {aggregateState.toUpperCase()} ({feedRows.length ? `${liveCount}/${feedRows.length} feeds live` : "monitoring"})
                    </span>
                  ) : isPast && dayObs?.state === "live" ? (
                    <span className="px-2.5 py-1 rounded-[3px] bg-up/10 border border-up/30 text-up font-mono text-[10px] font-medium tracking-wide inline-flex items-center">
                      FEED LIVE · {dayObs.roundCount} Chainlink updates observed across {dayObs.activeFeedsCount} stock feeds
                    </span>
                  ) : isPast && dayObs?.state === "frozen" ? (
                    <span className="px-2.5 py-1 rounded-[3px] bg-down/10 border border-down/30 text-down font-mono text-[10px] font-medium tracking-wide inline-flex items-center">
                      FEED FROZEN · Outside liveness window on this day
                    </span>
                  ) : (
                    <span className="text-fg3">
                      UPCOMING · Market day not yet observed.
                    </span>
                  )}
                </div>
                <span className="text-fg3 text-[10px] hidden sm:inline">
                  Market state comes from feed timestamps, never a calendar.
                </span>
              </div>
            );
          })()}

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
              <p>Every row is a pool currently indexed by the terminal. Click any row to inspect feed details. Movement is measured over the same 24h window.</p>
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
                    const isRowSelected = selectedRow && (
                      (selectedRow.ca && selectedRow.ca === row.ca) ||
                      (selectedRow.poolId && selectedRow.poolId === row.poolId)
                    );

                    return (
                      <tr
                        key={row.ca || row.poolId || coin}
                        className={`hours-table-row--interactive ${isRowSelected ? "hours-table-row--selected" : ""}`}
                        onClick={() => setSelectedRow(isRowSelected ? null : row)}
                      >
                        <td><FeedState updatedAt={updatedAt} now={now} /></td>
                        <td>
                          {href ? (
                            <Link href={href} className="hours-coin" title={row.coinName || coin} onClick={(e) => e.stopPropagation()}>
                              {coin}
                            </Link>
                          ) : (
                            <span className="hours-coin">{coin}</span>
                          )}
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
            <div className="hours-panel-head">
              <h2>Selected pool feed</h2>
              <span className="hours-mono">onchain inspection</span>
            </div>
            {selectedRow ? (
              <div className="flex flex-col gap-2.5 font-mono text-[11px] pt-1">
                <div className="flex justify-between items-center pb-3 border-b border-line mb-1">
                  <span className="text-fg font-semibold text-[13px] tracking-tight">
                    {selectedRow.coin} <span className="text-fg3 font-normal text-[11px]">quoted in</span> {selectedRow.quote}
                  </span>
                  <span className={`px-2.5 py-1 rounded-[3px] text-[10px] font-mono tracking-wider leading-none inline-flex items-center font-medium ${selectedRowObservation?.feedLive ? "bg-up/10 text-up border border-up/30" : "bg-down/10 text-down border border-down/30"}`}>
                    {selectedRowObservation?.feedLive ? "FEED LIVE" : "FEED FROZEN"}
                  </span>
                </div>
                <div className="flex justify-between text-fg3 pt-0.5">
                  <span>Feed age:</span>
                  <span className="text-fg font-mono">{selectedRowObservation?.age != null ? formatAge(selectedRowObservation.age) : "—"}</span>
                </div>
                <div className="flex justify-between text-fg3">
                  <span>Pool ratio move (24h):</span>
                  <span className={selectedRow.meme24h == null ? "text-fg" : selectedRow.meme24h >= 0 ? "text-up font-medium" : "text-down font-medium"}>
                    {formatPct(selectedRow.meme24h)}
                  </span>
                </div>
                <div className="flex justify-between text-fg3">
                  <span>Stock feed move (24h):</span>
                  <span className={selectedRow.stock24h == null ? "text-fg" : selectedRow.stock24h >= 0 ? "text-up font-medium" : "text-down font-medium"}>
                    {formatPct(selectedRow.stock24h)}
                  </span>
                </div>
                <div className="flex justify-between text-fg3">
                  <span>Calculated pool price:</span>
                  <span className="text-fg font-mono font-medium">{formatPrice(selectedRow.priceUsd)}</span>
                </div>
                <div className="pt-3 border-t border-line mt-2">
                  <Link
                    href={`/c/${selectedRow.ca || selectedRow.poolId}`}
                    className="inline-flex items-center gap-1.5 text-[11px] text-stock hover:underline font-mono"
                  >
                    Open {selectedRow.coin} Split Report &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="hours-inspector-empty">
                Click any pool row in the Freeze log to inspect its feed liveness and direct contract link.
              </div>
            )}
          </article>

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
    </div>
  );
}
