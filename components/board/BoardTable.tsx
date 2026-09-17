/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { DataTable, Column } from "@/components/primitives/DataTable";
import { SplitBar } from "@/components/primitives/SplitBar";
import { Sparkline } from "@/components/primitives/Sparkline";
import { useRouter } from "next/navigation";
import { startBasisRouteTransition } from "@/components/shell/routeTransition";

// Em dash displayed in muted color when a value cannot be calculated
const Dash = () => <span className="text-fg3 select-none">—</span>;

// Format pct with sign, or dash if null
function FmtPct({ v, cls }: { v: number | null; cls?: string }) {
  if (v === null) return <Dash />;
  return (
    <span className={cls}>
      {v >= 0 ? "+" : ""}
      {v.toFixed(1)}%
    </span>
  );
}

function fmtPrice(p: number | null): React.ReactNode {
  if (p == null) return <Dash />;
  if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.000001) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(2)}`;
}

interface BoardTableProps {
  rows: any[];
  selectedCa?: string;
  onSelectRow?: (row: any) => void;
}

export function BoardTable({ rows, selectedCa, onSelectRow }: BoardTableProps) {
  const router = useRouter();

  const columns: Column<any>[] = [
    {
      key: "coin",
      label: "Coin",
      render: (r) => (
        <span className="font-mono font-medium hover:text-meme transition-colors" title={r.coinName || r.coin}>
          {r.coin ?? <Dash />}
        </span>
      ),
    },
    {
      key: "quote",
      label: "Quote",
      render: (r) =>
        r.quote ? (
          <span className="font-mono text-[11px] text-stock">{r.quote}</span>
        ) : (
          <Dash />
        ),
    },
    {
      key: "price",
      label: "Price",
      align: "right",
      render: (r) => fmtPrice(r.priceUsd),
    },
    {
      key: "24h",
      label: "24h",
      align: "right",
      render: (r) => (
        <FmtPct
          v={r.chg24h ?? null}
          cls={
            r.chg24h != null
              ? r.chg24h >= 0
                ? "text-up"
                : "text-down"
              : undefined
          }
        />
      ),
    },
    {
      key: "memeStock",
      label: "Meme / stock",
      render: (r) =>
        r.memeRatioPct != null ? (
          <SplitBar
            memePct={r.memeRatioPct}
            stockPct={100 - r.memeRatioPct}
            size="small"
          />
        ) : (
          <Dash />
        ),
    },
    {
      key: "meme",
      label: "Meme",
      align: "right",
      render: (r) => (
        <span className="flex flex-col items-end gap-[1px]">
          <FmtPct v={r.meme7d ?? null} cls="text-meme" />
          {r.clamped && r.meme7d != null && (
            <span className="text-[9px] text-fg3">{r.windowLabel}</span>
          )}
        </span>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      align: "right",
      render: (r) => <FmtPct v={r.stock7d ?? null} cls="text-stock" />,
    },
    {
      key: "7d",
      label: "7d",
      render: (r) => <Sparkline seed={r.ca?.length ?? 0} />,
    },
    {
      key: "grip",
      label: "Locked in AMM",
      align: "right",
      render: (r) =>
        r.grip != null ? `${r.grip.toFixed(1)}%` : <Dash />,
    },
    {
      key: "liquidity",
      label: "Liquidity",
      align: "right",
      render: (r) =>
        r.liquidity != null
          ? `$${(r.liquidity / 1e6).toFixed(2)}M`
          : <Dash />,
    },
    {
      key: "vol24h",
      label: "Vol 24h",
      align: "right",
      render: (r) =>
        r.vol24h != null
          ? `$${(r.vol24h / 1e6).toFixed(1)}M`
          : <Dash />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(r) => {
        if (onSelectRow) {
          onSelectRow(r);
          return;
        }

        const pathname = `/c/${r.ca || r.poolId}`;
        startBasisRouteTransition(pathname);
        router.push(pathname);
      }}
      activeRowFn={(r) => (selectedCa ? r.ca === selectedCa || r.poolId === selectedCa : false)}
    />
  );
}
