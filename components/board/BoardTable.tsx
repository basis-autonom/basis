/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { DataTable, Column } from "@/components/primitives/DataTable";
import { SplitBar } from "@/components/primitives/SplitBar";
import { Sparkline } from "@/components/primitives/Sparkline";
import { useRouter } from "next/navigation";

export function BoardTable({ rows }: { rows: any[] }) {
  const router = useRouter();

  const columns: Column<any>[] = [
    {
      key: "coin",
      label: "Coin",
      render: (r) => <span className="font-mono font-medium">{r.coin}</span>,
    },
    {
      key: "quote",
      label: "Quote",
      render: (r) => (
        <span className="font-mono text-[11px] text-stock">{r.quote}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      align: "right",
      render: (r) => `$${r.priceUsd.toFixed(4)}`,
    },
    {
      key: "24h",
      label: "24h",
      align: "right",
      render: (r) => (
        <span className={r.chg24h >= 0 ? "text-up" : "text-down"}>
          {r.chg24h >= 0 ? "+" : ""}
          {r.chg24h.toFixed(2)}%
        </span>
      ),
    },
    {
      key: "memeStock",
      label: "Meme / stock",
      render: (r) => (
        <SplitBar
          memePct={r.memeRatioPct}
          stockPct={100 - r.memeRatioPct}
          size="small"
        />
      ),
    },
    {
      key: "meme",
      label: "Meme",
      align: "right",
      render: (r) => (
        <span className="text-meme">
          {r.meme7d >= 0 ? "+" : ""}
          {r.meme7d.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      align: "right",
      render: (r) => (
        <span className="text-stock">
          {r.stock7d >= 0 ? "+" : ""}
          {r.stock7d.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "7d",
      label: "7d",
      render: (r) => <Sparkline seed={r.ca.length} />,
    },
    {
      key: "grip",
      label: "Grip",
      align: "right",
      render: (r) => (
        <span className={r.grip >= 10 ? "text-down" : ""}>
          {r.grip.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "liquidity",
      label: "Liquidity",
      align: "right",
      render: (r) => `$${(r.liquidity / 1e6).toFixed(2)}M`,
    },
    {
      key: "vol24h",
      label: "Vol 24h",
      align: "right",
      render: (r) => `$${(r.vol24h / 1e6).toFixed(1)}M`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(r) => router.push(`/c/${r.ca}`)}
    />
  );
}
