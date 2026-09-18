"use client";

import React, { useEffect, useState } from "react";
import { useTerminalRows } from "@/components/shell/TerminalDataProvider";

type Action = {
  symbol: string;
  address: string;
  type: "Dividend" | "Split" | null;
  oldMultiplier: number | null;
  newMultiplier: number | null;
  valueChange: number | null;
  date: number | null;
};

type Token = {
  address: string;
  symbol: string;
  name: string;
  currentMultiplier: number | null;
  pendingMultiplier: number | null;
  effectiveAt: number | null;
  totalSupply: string | null;
};

type ActionResponse = {
  kind: "success" | "error";
  tokens?: Token[];
  scheduled?: Token[];
  history?: Action[];
  historyStatus?: "complete" | "partial";
  message?: string;
};

type TerminalRow = { quote?: string; liquidity?: number | null };

function formatMultiplier(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(4);
}

function formatPct(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(value: number | null) {
  if (value == null) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function CorporateActionsView() {
  const { rows } = useTerminalRows() as { rows: TerminalRow[] };
  const [data, setData] = useState<ActionResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    fetch("/api/actions", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ActionResponse;
        if (!response.ok) throw new Error(body.message || "The on-chain corporate-action read failed.");
        return body;
      })
      .then(setData)
      .catch((error: unknown) => {
        setData({
          kind: "error",
          message: error instanceof DOMException && error.name === "AbortError"
            ? "The on-chain corporate-action read timed out."
            : error instanceof Error
              ? error.message
              : "The on-chain corporate-action read failed before a response was returned.",
        });
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const scheduled = data?.scheduled ?? [];
  const history = data?.history ?? [];
  const selected = scheduled[0] ?? null;

  return (
    <div className="actions-page">
      <header className="actions-header">
        <div>
          <h1>Corporate actions</h1>
          <p>Dividends and splits, read from the token multiplier before they take effect</p>
        </div>
        <div className="actions-stat"><span>Scheduled</span><strong>{data ? scheduled.length : "—"}</strong></div>
        <div className="actions-stat"><span>Since chain launch</span><strong>{data?.historyStatus === "complete" ? history.length : "—"}</strong></div>
        <div className="actions-stat"><span>Pools exposed</span><strong>{rows.length || "—"}</strong></div>
      </header>

      <section className="actions-grid">
        <article className="actions-cell">
          <div className="actions-heading"><h2>Scheduled</h2><span>read from newUIMultiplier and effectiveAt</span></div>
          {data?.kind === "error" ? (
            <div className="actions-empty"><span>{data.message}</span><small>No substitute action data is used.</small></div>
          ) : data == null ? (
            <div className="actions-empty"><span>Reading multiplier state from the stock tokens…</span></div>
          ) : scheduled.length === 0 ? (
            <div className="actions-empty"><span>No scheduled multiplier changes are currently reported on chain.</span><small>Empty is a valid result; the page does not invent upcoming actions.</small></div>
          ) : (
            scheduled.map((token) => (
              <div className="action-card" key={token.address}>
                <div className="action-card-title"><span className="actions-ticker">{token.symbol}</span><span>{token.pendingMultiplier != null && token.currentMultiplier != null && token.pendingMultiplier > token.currentMultiplier ? "Dividend" : "Split"}</span><b>{formatDate(token.effectiveAt)}</b></div>
                <div className="actions-kv"><span>New multiplier</span><strong>{formatMultiplier(token.pendingMultiplier)}</strong></div>
                <div className="actions-kv"><span>Current multiplier</span><strong>{formatMultiplier(token.currentMultiplier)}</strong></div>
                <div className="actions-kv"><span>Value change</span><strong>{formatPct(token.currentMultiplier && token.pendingMultiplier != null ? (token.pendingMultiplier / token.currentMultiplier - 1) * 100 : null)}</strong></div>
              </div>
            ))
          )}
          <p className="actions-note">A dividend raises the multiplier. A split changes it by a larger factor while the stock feed moves inversely; the token value is unchanged by a split.</p>
        </article>

        <article className="actions-cell">
          <div className="actions-heading"><h2>Effect on a pool</h2><span>worked from observed chain values</span></div>
          <div className="actions-kv"><span>Selected ticker</span><strong>{selected?.symbol ?? "—"}</strong></div>
          <div className="actions-kv"><span>Multiplier change</span><strong>{selected ? `${formatMultiplier(selected.currentMultiplier)} → ${formatMultiplier(selected.pendingMultiplier)}` : "—"}</strong></div>
          <div className="actions-kv"><span>Pool response</span><strong>{selected ? "not estimated" : "—"}</strong></div>
          <div className="actions-kv"><span>Pool value at risk</span><strong>—</strong></div>
          <p className="actions-note">The chain exposes the multiplier change. A pool response or value at risk is shown only when the required pool state is available; this page does not fill gaps with estimates.</p>
        </article>
      </section>

      <section className="actions-grid actions-history">
        <article className="actions-cell actions-cell--full">
          <div className="actions-heading"><h2>History</h2><span>UIMultiplierUpdated logs from chain genesis</span></div>
          {data?.historyStatus === "partial" && <div className="actions-warning">History could not complete before the RPC deadline. Missing values remain em dashes.</div>}
          {data == null ? <div className="actions-empty"><span>Reading historical multiplier events…</span></div> : data.historyStatus === "partial" && history.length === 0 ? <div className="actions-empty"><span>Historical multiplier events could not be read before the deadline.</span><small>No substitute history data is used.</small></div> : history.length === 0 ? <div className="actions-empty"><span>No multiplier update events were returned by the chain.</span></div> : (
            <div className="actions-table-wrap">
              <table className="actions-table">
                <thead><tr><th>Date</th><th>Ticker</th><th>Type</th><th className="actions-right">Old</th><th className="actions-right">New</th><th className="actions-right">Value change</th><th className="actions-right">Pools hit</th><th className="actions-right">Value at risk</th></tr></thead>
                <tbody>{history.map((action, index) => <tr key={`${action.address}-${action.date ?? "unknown"}-${index}`}><td className="actions-muted">{formatDate(action.date)}</td><td className="actions-ticker">{action.symbol}</td><td>{action.type ?? "—"}</td><td className="actions-right actions-mono">{formatMultiplier(action.oldMultiplier)}</td><td className="actions-right actions-mono">{formatMultiplier(action.newMultiplier)}</td><td className="actions-right actions-mono">{formatPct(action.valueChange)}</td><td className="actions-right actions-mono">—</td><td className="actions-right actions-mono">—</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="actions-grid">
        <article className="actions-cell actions-cell--full">
          <div className="actions-heading"><h2>Honest note on this page</h2></div>
          <p className="actions-note actions-note--large">Corporate actions on this chain are rare and their value impact is usually small. This page exists because scheduled multiplier changes are readable on chain and can matter to the pools they touch—not because it is expected to produce a daily signal.</p>
        </article>
      </section>
    </div>
  );
}
