"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LandingBoardRow, displaySymbol } from "./types";

function formatPrice(price: number | null | undefined) {
  if (price == null) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

function totalMove(row: LandingBoardRow | undefined) {
  if (!row || row.meme7d == null || row.stock7d == null) return null;
  return ((1 + row.meme7d / 100) * (1 + row.stock7d / 100) - 1) * 100;
}

export function TerminalPreview({
  rows,
  featured,
}: {
  rows: LandingBoardRow[];
  featured?: LandingBoardRow;
}) {
  const [activeViewIndex, setActiveViewIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveViewIndex((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const previewRows = rows.slice(0, 7);
  const total = totalMove(featured);
  const memePct = featured?.memeRatioPct;
  const stockPct = memePct == null ? null : 100 - memePct;
  const liquidity =
    featured?.liquidity == null
      ? "—"
      : `$${(featured.liquidity / 1e6).toFixed(2)}M`;

  return (
    <div className="landing-shot">
      <div className="landing-shotbar">
        <div className="landing-dots">
          <i />
          <i />
          <i />
        </div>
        <span className="landing-shot-url">basisanalytics.xyz/terminal</span>
      </div>
      <div className="landing-shot-grid">
        <div className="landing-shot-pane">
          <div className="landing-label">Views</div>
          <div
            className={`landing-nav-row ${activeViewIndex === 0 ? "active" : ""}`}
            onClick={() => setActiveViewIndex(0)}
            style={{ cursor: "pointer" }}
          >
            Split board
          </div>
          <div
            className={`landing-nav-row ${activeViewIndex === 1 ? "active" : ""}`}
            onClick={() => setActiveViewIndex(1)}
            style={{ cursor: "pointer" }}
          >
            Float grip
          </div>
          <div
            className={`landing-nav-row ${activeViewIndex === 2 ? "active" : ""}`}
            onClick={() => setActiveViewIndex(2)}
            style={{ cursor: "pointer" }}
          >
            Market hours
          </div>
          <div
            className={`landing-nav-row ${activeViewIndex === 3 ? "active" : ""}`}
            onClick={() => setActiveViewIndex(3)}
            style={{ cursor: "pointer" }}
          >
            Corporate actions
          </div>
          <div className="landing-label" style={{ paddingTop: 14 }}>
            Watchlist
          </div>
          {previewRows.slice(0, 4).map((row, index) => (
            <div
              key={row.ca || row.poolId || index}
              className="landing-watch-row"
            >
              <span>{displaySymbol(row.coin)}</span>
              <span>{formatPrice(row.priceUsd).replace("$", "")}</span>
            </div>
          ))}
        </div>

        <div className="landing-shot-pane">
          <div className="landing-shot-top">
            {activeViewIndex === 0 && (
              <>
                <b>{displaySymbol(featured?.coin)}</b>
                <span>quoted in</span>
                <span style={{ color: "var(--color-stock)" }}>
                  {featured?.quote || "—"}
                </span>
                <span className="push-right">
                  grip{" "}
                  {featured?.grip == null
                    ? "—"
                    : `${featured.grip.toFixed(1)}%`}
                </span>
              </>
            )}
            {activeViewIndex === 1 && (
              <>
                <b>Float grip</b>
                <span>locked supply analysis</span>
                <span className="push-right text-down">high grip detected</span>
              </>
            )}
            {activeViewIndex === 2 && (
              <>
                <b>Market hours</b>
                <span>global trading schedule</span>
                <span className="push-right text-up">US Equities Open</span>
              </>
            )}
            {activeViewIndex === 3 && (
              <>
                <b>Corporate actions</b>
                <span>on-chain impact</span>
                <span className="push-right">1 upcoming</span>
              </>
            )}
          </div>
          <table className="landing-shot-table">
            <thead>
              {activeViewIndex === 0 && (
                <tr>
                  <th>Coin</th>
                  <th>Quote</th>
                  <th className="right">Price</th>
                  <th>Meme / stock</th>
                  <th className="right">Grip</th>
                </tr>
              )}
              {activeViewIndex === 1 && (
                <tr>
                  <th>Stock</th>
                  <th className="right">Locked</th>
                  <th className="right">Float</th>
                  <th className="right">Vol 24h</th>
                  <th className="right">Grip</th>
                </tr>
              )}
              {activeViewIndex === 2 && (
                <tr>
                  <th>Market</th>
                  <th>Status</th>
                  <th className="right">Local Time</th>
                  <th className="right">Next Open</th>
                  <th className="right">Next Close</th>
                </tr>
              )}
              {activeViewIndex === 3 && (
                <tr>
                  <th>Ticker</th>
                  <th>Action</th>
                  <th className="right">Ex-Date</th>
                  <th>Status</th>
                  <th className="right">Details</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeViewIndex === 0 &&
                (previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No live pool data</td>
                  </tr>
                ) : (
                  previewRows.map((row, index) => {
                    const ratio = row.memeRatioPct;
                    return (
                      <tr key={row.ca || row.poolId || index}>
                        <td>{displaySymbol(row.coin)}</td>
                        <td style={{ color: "var(--color-stock)" }}>
                          {row.quote || "—"}
                        </td>
                        <td className="right">{formatPrice(row.priceUsd)}</td>
                        <td>
                          {ratio == null ? (
                            "—"
                          ) : (
                            <div className="landing-split-bar">
                              <i
                                className="meme"
                                style={{ width: `${ratio}%` }}
                              />
                              <i
                                className="stock"
                                style={{ width: `${100 - ratio}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td
                          className="right"
                          style={{
                            color:
                              row.grip != null && row.grip >= 10
                                ? "var(--color-down)"
                                : "var(--color-fg)",
                          }}
                        >
                          {row.grip == null ? "—" : `${row.grip.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })
                ))}
              {activeViewIndex === 1 &&
                previewRows.map((row, index) => (
                  <tr key={index}>
                    <td style={{ color: "var(--color-stock)" }}>
                      {row.quote || "—"}
                    </td>
                    <td className="right font-mono text-fg2">
                      {row.grip == null
                        ? "—"
                        : `${(row.grip * 123).toFixed(0)}`}
                    </td>
                    <td className="right font-mono">
                      {(row.grip ? row.grip * 1234 : 0).toFixed(0)}
                    </td>
                    <td className="right font-mono text-fg2">
                      {formatPrice(
                        (row.vol24h || row.liquidity || 0) / 1000,
                      ).replace("$", "")}
                      K
                    </td>
                    <td
                      className="right"
                      style={{
                        color:
                          row.grip != null && row.grip >= 10
                            ? "var(--color-down)"
                            : "var(--color-fg)",
                      }}
                    >
                      {row.grip == null ? "—" : `${row.grip.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              {activeViewIndex === 2 && (
                <>
                  <tr>
                    <td>US Equity</td>
                    <td style={{ color: "var(--color-up)" }}>Open</td>
                    <td className="right font-mono text-fg2">10:30 AM</td>
                    <td className="right font-mono">—</td>
                    <td className="right font-mono text-fg2">04:00 PM</td>
                  </tr>
                  <tr>
                    <td>EU Equity</td>
                    <td style={{ color: "var(--color-down)" }}>Closed</td>
                    <td className="right font-mono text-fg2">04:30 PM</td>
                    <td className="right font-mono text-fg2">09:00 AM</td>
                    <td className="right font-mono">—</td>
                  </tr>
                  <tr>
                    <td>Crypto</td>
                    <td style={{ color: "var(--color-up)" }}>24/7</td>
                    <td className="right font-mono text-fg2">10:30 AM</td>
                    <td className="right font-mono">—</td>
                    <td className="right font-mono">—</td>
                  </tr>
                </>
              )}
              {activeViewIndex === 3 && (
                <>
                  <tr>
                    <td style={{ color: "var(--color-stock)" }}>NVDA</td>
                    <td>Stock Split</td>
                    <td className="right font-mono text-fg2">Jun 10</td>
                    <td style={{ color: "var(--color-fg3)" }}>Completed</td>
                    <td className="right font-mono text-fg2">10-for-1</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--color-stock)" }}>AAPL</td>
                    <td>Dividend</td>
                    <td className="right font-mono text-fg2">Aug 09</td>
                    <td style={{ color: "var(--color-up)" }}>Upcoming</td>
                    <td className="right font-mono text-fg2">$0.25/sh</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--color-stock)" }}>GME</td>
                    <td>Earnings</td>
                    <td className="right font-mono text-fg2">Sep 04</td>
                    <td style={{ color: "var(--color-fg3)" }}>Completed</td>
                    <td className="right font-mono text-fg2">Q2 2024</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="landing-shot-pane">
          {activeViewIndex === 0 && (
            <>
              <div className="landing-shot-rail-section">
                <div className="landing-verdict">
                  {total == null
                    ? "Attribution pending."
                    : `${total >= 0 ? "Up" : "Down"} ${Math.abs(total).toFixed(1)}%.`}{" "}
                  <em>
                    {featured?.meme7d == null
                      ? "Historical state points pending calculation."
                      : `The meme did ${featured.meme7d.toFixed(1)}% of it.`}
                  </em>
                </div>
                {memePct == null ? (
                  <div className="landing-note" style={{ marginTop: 11 }}>
                    Attribution ratio pending
                  </div>
                ) : (
                  <>
                    <div className="landing-large-split">
                      <div className="meme" style={{ width: `${memePct}%` }}>
                        meme
                      </div>
                      <div className="stock" style={{ width: `${stockPct}%` }}>
                        {featured?.quote || "—"}
                      </div>
                    </div>
                    <div className="landing-shot-numbers">
                      <span>
                        {featured?.meme7d == null
                          ? "—"
                          : `${featured.meme7d >= 0 ? "+" : ""}${featured.meme7d.toFixed(1)}%`}
                      </span>
                      <span>
                        {featured?.stock7d == null
                          ? "—"
                          : `${featured.stock7d >= 0 ? "+" : ""}${featured.stock7d.toFixed(1)}%`}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="landing-shot-rail-section">
                <div className="landing-kv">
                  <span>Stock share of 7d move</span>
                  <span>
                    {stockPct == null ? "—" : `${stockPct.toFixed(1)}%`}
                  </span>
                </div>
                <div className="landing-kv">
                  <span>Float grip</span>
                  <span style={{ color: "var(--color-down)" }}>
                    {featured?.grip == null
                      ? "—"
                      : `${featured.grip.toFixed(1)}%`}
                  </span>
                </div>
                <div className="landing-kv">
                  <span>Liquidity</span>
                  <span>{liquidity}</span>
                </div>
                <div className="landing-kv">
                  <span>Window</span>
                  <span>{featured?.windowLabel || "—"}</span>
                </div>
              </div>
            </>
          )}
          {activeViewIndex === 1 && (
            <>
              <div className="landing-shot-rail-section">
                <div className="landing-verdict">
                  Why this number matters.{" "}
                  <em>
                    Stock token supply is fixed. When a memecoin pool absorbs a
                    large slice of a ticker&apos;s on-chain supply, that slice
                    leaves circulation permanently.
                  </em>
                </div>
              </div>
              <div className="landing-shot-rail-section">
                <div className="landing-kv">
                  <span>Tokens on chain</span>
                  <span>{previewRows.length}</span>
                </div>
                <div className="landing-kv">
                  <span>Gripped over 10%</span>
                  <span className="text-down">4</span>
                </div>
              </div>
            </>
          )}
          {activeViewIndex === 2 && (
            <>
              <div className="landing-shot-rail-section">
                <div className="landing-verdict">
                  Market is currently Open.{" "}
                  <em>
                    Regular trading hours for US Equities. Prices on Robinhood
                    Chain update in real-time.
                  </em>
                </div>
              </div>
            </>
          )}
          {activeViewIndex === 3 && (
            <>
              <div className="landing-shot-rail-section">
                <div className="landing-verdict">
                  Upcoming Actions.{" "}
                  <em>
                    There is 1 pending corporate action affecting tokens on
                    Robinhood Chain. Adjustments are handled automatically.
                  </em>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
