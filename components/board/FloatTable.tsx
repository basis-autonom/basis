/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { DataTable, Column } from "@/components/primitives/DataTable";

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
        r.floatOnChain.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    },
    {
      key: "lockedInPools",
      label: "Locked in pools",
      align: "right",
      render: (r) =>
        r.lockedInPools.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    },
    {
      key: "shareGripped",
      label: "Share gripped",
      render: (r) => (
        <div className="h-[8px] bg-pane2 rounded-[2px] overflow-hidden w-[120px]">
          <i
            className="block h-full bg-down"
            style={{ width: `${r.gripPct}%` }}
          ></i>
        </div>
      ),
    },
    {
      key: "grip",
      label: "Grip",
      align: "right",
      render: (r) => (
        <span>
          {r.gripPct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "poolsCount",
      label: "Pools",
      align: "right",
      render: (r) => r.poolsCount,
    },
    {
      key: "largestHolder",
      label: "Largest holder",
      render: (r) => (
        <span className="font-mono font-medium">{r.largestHolder}</span>
      ),
    },
    {
      key: "largestShare",
      label: "Its share",
      align: "right",
      render: (r) => `${r.largestShare.toFixed(1)}%`,
    },
    {
      key: "lpBurned",
      label: "LP burned",
      align: "right",
      render: (r) => (
        <span className={r.lpBurned ? "text-down" : "text-fg3"}>
          {r.lpBurned ? "yes" : "no"}
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} rows={rows} />;
}
