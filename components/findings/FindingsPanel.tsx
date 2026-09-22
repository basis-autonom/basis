"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

function formatNarrativeNumber(value: number | null) {
  if (value == null) return "—";
  return value.toFixed(Math.abs(value) < 0.1 ? 2 : 1);
}

function movementClass(value: number | null) {
  if (value == null || value === 0) return "text-fg2";
  return value > 0 ? "text-up" : "text-down";
}

type FindingsPanelProps = {
  poolCount: number;
  onContentHeightChange?: (height: number) => void;
};

export function FindingsPanel({ poolCount, onContentHeightChange }: FindingsPanelProps) {
  const [state, setState] = useState<FindingsState>({
    status: "loading",
    findings: [],
  });
  const listRef = useRef<HTMLUListElement>(null);

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

  const sortedFindings = useMemo(
    () =>
      [...state.findings].sort(
        (a, b) =>
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
      ),
    [state.findings],
  );

  useEffect(() => {
    if (!onContentHeightChange) return;
    const listHeight = listRef.current?.scrollHeight ?? 0;
    onContentHeightChange(Math.max(42, listHeight + 6));
  }, [onContentHeightChange, sortedFindings.length, state.status]);

  return (
    <section
      aria-labelledby="findings-heading"
      className="flex h-full min-h-[42px] min-w-0 flex-shrink-0 border-b border-line bg-pane"
    >
      <div className="flex w-[190px] flex-shrink-0 flex-col justify-center border-r border-up/20 bg-up/[0.02] pl-[20px] pr-[14px] py-[10px]">
        <div className="flex items-center justify-between mb-[3px]">
          <div className="flex items-center gap-[6px]">
            <span className="block rounded-full bg-up flex-shrink-0" style={{ width: 4, height: 4, boxShadow: "0 0 6px var(--color-up)" }} />
            <h2 id="findings-heading" className="font-mono text-[10px] uppercase tracking-[0.09em] text-up font-semibold">
              Live Findings
            </h2>
          </div>
          <span className="font-mono text-[10px] text-up/70 font-semibold pl-[8px]">
            {state.status === "ready" ? state.findings.length : "—"}
          </span>
        </div>
        <span className="font-mono text-[9px] text-fg2 leading-tight">
          Auto-detected from chain
        </span>
      </div>

      {state.status === "error" ? (
        <p className="flex min-w-0 items-center px-[16px] py-[12px] font-mono text-[11px] text-fg3">
          Findings unavailable right now.
        </p>
      ) : state.status === "ready" && state.findings.length === 0 ? (
        <p className="flex min-w-0 items-center px-[16px] py-[12px] font-mono text-[11px] text-fg3">
          Watching {poolCount} stock-paired pools. Nothing moving on its stock
          right now.
        </p>
      ) : state.status === "loading" ? (
        <p className="flex min-w-0 items-center px-[16px] py-[12px] font-mono text-[11px] text-fg3">
          Reading latest findings…
        </p>
      ) : (
        <ul
          ref={listRef}
          aria-label="Latest findings"
          className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-[4px]"
        >
          {sortedFindings.map((finding) => (
            <li
              key={finding.id}
              className="border-b border-line/40 last:border-b-0"
            >
              <Link
                href={`/c/${finding.tokenAddress.trim().toLowerCase()}`}
                aria-label={`${finding.symbol ?? "Unknown coin"} finding report`}
                className="flex min-w-0 items-center gap-[16px] px-[16px] py-[10px] font-mono text-[11px] transition-colors hover:bg-pane2 focus-visible:bg-pane2"
              >
                <time
                  dateTime={finding.detectedAt}
                  className="w-[42px] flex-shrink-0 text-[10px] tabular-nums text-fg3"
                >
                  {formatTime(finding.detectedAt)}
                </time>
                <span className="min-w-0 text-fg">
                  ${finding.symbol ?? "—"} moved{" "}
                  <strong className={movementClass(finding.priceMovement)}>
                    {formatNarrativeNumber(finding.priceMovement)}%
                  </strong>
                  . Its meme did{" "}
                  <strong className="text-meme font-medium">
                    {formatNarrativeNumber(finding.memeComponent)}
                  </strong>
                  . The rest is{" "}
                  <strong className="text-stock font-medium">
                    {finding.stockPair ?? "—"}
                  </strong>
                  .
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
