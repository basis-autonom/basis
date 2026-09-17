/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { DataTable, Column } from "@/components/primitives/DataTable";

const Dash = () => <span className="text-fg3 select-none">—</span>;

export function FloatTable({ rows }: { rows: any[] }) {
  const columns: Column<any>[] = [
    {
      key: "ticker",
      label: "Ticker",
      render: (r) => (
        <span className="font-mono text-stock text-[11px] font-medium">
          {r.ticker}
        </span>
      ),
    },
    {
      key: "floatOnChain",
      label: "Float on chain",
      align: "right",
      render: (r) =>
        r.floatOnChain != null ? (
          r.floatOnChain.toLocaleString(undefined, { maximumFractionDigits: 0 })
        ) : (
          <Dash />
        ),
    },
    {
      key: "lockedInPools",
      label: "Locked in pools",
      align: "right",
      render: (r) =>
        r.lockedInPools != null ? (
          r.lockedInPools.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })
        ) : (
          <Dash />
        ),
    },
    {
      key: "shareGripped",
      label: "Share gripped",
      render: (r) =>
        r.gripPct != null ? (
          <div className="h-[8px] bg-pane2 rounded-[2px] overflow-hidden w-[120px]">
            <i
              className="block h-full"
              style={{ width: `${Math.min(r.gripPct, 100)}%`, backgroundColor: "var(--color-fg3)" }}
            />
          </div>
        ) : (
          <Dash />
        ),
    },
    {
      key: "grip",
      label: "Grip",
      align: "right",
      render: (r) =>
        r.gripPct != null ? (
          <span >
            {r.gripPct.toFixed(1)}%
          </span>
        ) : (
          <Dash />
        ),
    },
        {
      key: "poolsCount",
      label: "Pools",
      align: "right",
      render: (r) => r.poolsCount ?? <Dash />,
    },
    {
      key: "lpBurned",
      label: "LP burned",
      align: "right",
      render: () => <span className="text-down font-mono">yes</span>,
    },
  ];

  return <DataTable columns={columns} rows={rows} />;
}
