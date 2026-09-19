'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pageMetaMap } from './pageMeta';
import { useBlockHeight } from './useBlockHeight';

export function StatusBar() {
  const pathname = usePathname();
  const meta = pageMetaMap[pathname] || { statusText: [] };
  const defaultStatus = [
    'rpc.mainnet.chain.robinhood.com',
    'chain 4663',
    'Uniswap v4 state read',
    'Nasdaq closed · stock leg frozen',
  ];
  const statusItems = meta.statusText?.length ? meta.statusText : defaultStatus;
  const blockHeight = useBlockHeight();
  const [lastFindingAt, setLastFindingAt] = useState<string | null>(null);
  const [relativeNow, setRelativeNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    const loadLatestFinding = async () => {
      try {
        const response = await fetch("/api/findings?limit=1", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Latest finding request failed");

        const body = (await response.json()) as {
          kind?: string;
          data?: { findings?: Array<{ detectedAt?: string }> };
        };
        const detectedAt = body.data?.findings?.[0]?.detectedAt;

        if (!cancelled) {
          setLastFindingAt(
            body.kind === "success" && typeof detectedAt === "string"
              ? detectedAt
              : null,
          );
          setRelativeNow(Date.now());
        }
      } catch {
        if (!cancelled) {
          setLastFindingAt(null);
          setRelativeNow(Date.now());
        }
      }
    };

    void loadLatestFinding();
    const interval = window.setInterval(loadLatestFinding, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const poolStatus = statusItems.find((status) => /\d+ pools indexed/.test(status));
  // The terminal metadata already exposes the shared watchlist size as
  // "50 pools indexed". Other shell pages do not repeat that label, so use
  // the same existing watchlist count there rather than inventing a second
  // pool query just for the status bar.
  const poolCount = poolStatus?.match(/\d+/)?.[0] ?? "50";
  const lastFindingLabel = formatRelativeFindingAge(lastFindingAt, relativeNow);

  return (
    <div className="flex items-center gap-0 border-t border-line bg-pane font-mono text-[10px] text-fg3 overflow-hidden flex-shrink-0">
      {statusItems.map((status, i) => {
        // Special case: if the status is "chain 4663", we'll append the live block height after it
        if (status === 'chain 4663') {
          return (
            <React.Fragment key={i}>
              <div style={{ padding: "0 12px", borderRight: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap">{status}</div>
              <div style={{ padding: "0 12px", borderRight: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap">{blockHeight}</div>
            </React.Fragment>
          );
        }
        if (/\d+ pools indexed/.test(status)) {
          return (
            <div key={i} style={{ padding: "0 12px", borderRight: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap">
              watching {poolCount} pools
            </div>
          );
        }
        return (
          <div key={i} style={{ padding: "0 12px", borderRight: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap">
            {status}
          </div>
        );
      })}
      {!poolStatus && (
        <div style={{ padding: "0 12px", borderRight: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap">
          watching {poolCount} pools
        </div>
      )}
      <div style={{ padding: "0 12px", borderRight: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap">
        last finding {lastFindingLabel}
      </div>
      <div style={{ padding: "0 12px", borderLeft: "1px solid var(--color-line)" }} className="leading-[25px] whitespace-nowrap ml-auto">
        live
      </div>
    </div>
  );
}

function formatRelativeFindingAge(value: string | null, now: number) {
  if (!value) return "no findings yet";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "no findings yet";

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  return `${Math.floor(elapsedHours / 24)}d ago`;
}
