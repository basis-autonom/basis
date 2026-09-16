/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { FloatTable } from "@/components/board/FloatTable";
import { KVRow } from "@/components/primitives/KVRow";

export default async function TerminalFloatPage() {
  const res = await fetch("http://localhost:3000/api/float", {
    cache: "no-store",
  });
  const data = await res.json();

  if (data.kind !== "success") {
    return (
      <div className="flex h-full items-center justify-center text-down font-mono">
        Failed to load float data: {data.error || "Unknown error"}
      </div>
    );
  }

  const rows = data.data || [];

  const hotCount = rows.filter((r: any) => r.gripPct > 10).length;
  const lockedValue = 41.8; // We could calculate this from chainlink prices in API, but keeping simple for now

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-[22px] px-[18px] h-[58px] border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto">
        <div>
          <h1 className="text-[16px] font-semibold">Float grip</h1>
          <div className="text-[12px] text-fg3">
            How much of each stock&apos;s on-chain supply is locked inside
            memecoin pools
          </div>
        </div>

        <div className="ml-4">
          <div className="text-[10px] text-fg3">Tickers on chain</div>
          <div className="font-mono text-[13px] mt-[2px]">{rows.length}</div>
        </div>

        <div className="ml-4">
          <div className="text-[10px] text-fg3">Gripped over 10%</div>
          <div className="font-mono text-[13px] mt-[2px] text-down">
            {hotCount}
          </div>
        </div>

        {/* Placeholder for locked value */}
        <div className="ml-4">
          <div className="text-[10px] text-fg3">Locked value</div>
          <div className="font-mono text-[13px] mt-[2px]">${lockedValue}M</div>
        </div>

        <div className="ml-auto flex gap-[7px]">
          <button className="h-[29px] px-[13px] bg-transparent text-fg2 border border-line2 rounded-[4px] font-sans text-[12px] font-medium cursor-pointer">
            Export CSV
          </button>
          <button className="h-[29px] px-[13px] bg-fg text-bg border-0 rounded-[4px] font-sans text-[12px] font-medium cursor-pointer">
            Copy board
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-[1px] bg-line border-b border-line">
          <div className="bg-bg col-span-full">
            <FloatTable rows={rows} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-line border-b border-line mt-4">
          <div className="bg-bg p-[16px_18px]">
            <div className="flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium">
                Why this number matters
              </h2>
            </div>
            <p className="text-[11px] text-fg3 leading-[1.6]">
              Stock token supply is fixed. Only the licensed minter can create
              more, and it mints against real shares held in custody, not on
              demand from a pool. So when a memecoin pool absorbs a large slice
              of a ticker&apos;s on-chain supply, that slice leaves circulation.
            </p>
            <p className="text-[11px] text-fg3 leading-[1.6] mt-[11px]">
              If the LP position is burned, it leaves permanently. The pool
              stops being a participant in that ticker&apos;s on-chain market
              and becomes the market — anyone wanting NVDA on chain has to go
              through a memecoin to get it.
            </p>
          </div>

          <div className="bg-bg p-[16px_18px]">
            <div className="flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium">Thresholds</h2>
              <span className="font-mono text-[10px] text-fg3">
                how the colour is set
              </span>
            </div>
            <KVRow label="Under 5%" value="normal" />
            <KVRow
              label="5–10%"
              value="watch — one pool is a large fraction of the book"
            />
            <KVRow
              label="Over 10%"
              value="flagged — the pool sets the on-chain price"
              tone="hot"
            />
            <KVRow
              label="Over 50%"
              value="the pool is the float"
              tone="hot"
              last
            />
            <p className="text-[11px] text-fg3 leading-[1.6] mt-[12px]">
              Thresholds are fixed and stated here so nothing is hidden behind a
              score.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
