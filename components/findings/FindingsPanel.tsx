"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Finding = {
  id: number;
  detectedAt: string;
  tokenAddress: string;
  symbol: string | null;
  stockPair: string | null;
  priceMovement: number | null;
  memeComponent: number | null;
  stockComponent: number | null;
  liquidity: number | null;
};

type FindingsState =
  | { status: "loading"; findings: Finding[] }
  | { status: "ready"; findings: Finding[] }
  | { status: "error"; findings: Finding[] };

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return value.toFixed(Math.abs(value) < 0.1 ? 2 : 1);
}

export function FindingsPanel({ poolCount }: { poolCount: number }) {
  const [state, setState] = useState<FindingsState>({
    status: "loading",
    findings: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadFindings = async () => {
      try {
        const response = await fetch("/api/findings?limit=20", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Findings request failed");

        const body = (await response.json()) as {
          kind?: string;
          data?: { findings?: Finding[] };
        };
        if (body.kind !== "success" || !Array.isArray(body.data?.findings)) {
          throw new Error("Findings response was invalid");
        }

        if (!cancelled) {
          setState({ status: "ready", findings: body.data.findings });
        }
      } catch {
        if (!cancelled) setState({ status: "error", findings: [] });
      }
    };

    void loadFindings();
    const interval = window.setInterval(loadFindings, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section
      aria-labelledby="findings-heading"
      className="border-b border-line bg-pane"
    >
      <div className="flex items-center justify-between border-b border-line px-[14px] py-[8px]">
        <h2
          id="findings-heading"
          className="font-mono text-[10px] uppercase tracking-[0.09em] text-fg3"
        >
          Findings
        </h2>
        <span className="font-mono text-[10px] text-fg3">
          {state.status === "ready" ? state.findings.length : "—"}
        </span>
      </div>

      {state.status === "error" ? (
        <p className="px-[14px] py-[10px] font-mono text-[10px] text-fg3">
          Findings unavailable right now.
        </p>
      ) : state.status === "ready" && state.findings.length === 0 ? (
        <p className="px-[14px] py-[10px] font-mono text-[10px] text-fg3">
          Watching {poolCount} stock-paired pools. Nothing moving on its stock right now.
        </p>
      ) : state.status === "loading" ? (
        <p className="px-[14px] py-[10px] font-mono text-[10px] text-fg3">
          Reading latest findings…
        </p>
      ) : (
        <ul aria-label="Latest findings" className="divide-y divide-line/70">
          {state.findings.map((finding) => (
            <li key={finding.id}>
              <Link
                href={`/c/${finding.tokenAddress}`}
                className="grid grid-cols-[42px_minmax(0,1fr)] gap-[10px] px-[14px] py-[8px] transition-colors hover:bg-pane2 focus-visible:bg-pane2"
              >
                <time
                  dateTime={finding.detectedAt}
                  className="font-mono text-[10px] tabular-nums text-fg3"
                >
                  {formatTime(finding.detectedAt)}
                </time>
                <span className="min-w-0 font-mono text-[11px] leading-[1.45] text-fg2">
                  <span className="text-fg">${finding.symbol ?? "—"}</span>{" "}
                  moved {formatPercent(finding.priceMovement)}%. Its meme did{" "}
                  <span className="text-meme">
                    {formatPercent(finding.memeComponent)}
                  </span>
                  %. The rest is{" "}
                  <span className="text-stock">{finding.stockPair ?? "—"}</span>.
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
