/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { FloatTable } from "@/components/board/FloatTable";
import { FloatActions } from "@/components/float/FloatActions";
import { getFloatBoardData } from "@/packages/core/float";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function TerminalFloatPage() {
  let rows: any[] = [];
  try {
    rows = await getFloatBoardData();
  } catch (e: any) {
    return (
      <div className="flex h-full items-center justify-center text-down font-mono">
        Failed to load float data: {e.message || "Unknown error"}
      </div>
    );
  }

  const grippedOver10Count = rows.filter((r) => (r.gripPct ?? 0) >= 10).length;
  const totalLockedTokens = rows.reduce((acc, r) => acc + (r.lockedInPools ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header: matches .phead in design/float.html */}
      <div className="flex items-center border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto flex-shrink-0" style={{ gap: "22px", padding: "0 18px", height: 58, minWidth: "100%" }}>
        <div>
          <h1 className="text-[16px] font-semibold text-fg">Float grip</h1>
          <div className="text-[12px] text-fg3">
            How much of each stock&apos;s on-chain supply is locked inside memecoin pools
          </div>
        </div>

        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          <div className="text-[10px] text-fg3">Tickers on chain</div>
          <div className="font-mono text-[13px] text-fg" style={{ marginTop: 2 }}>{rows.length}</div>
        </div>

        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          <div className="text-[10px] text-fg3">Gripped over 10%</div>
          <div className="font-mono text-[13px] text-down" style={{ marginTop: 2 }}>{grippedOver10Count}</div>
        </div>

        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          <div className="text-[10px] text-fg3">Locked tokens</div>
          <div className="font-mono text-[13px] text-fg" style={{ marginTop: 2 }}>
            {totalLockedTokens > 0
              ? totalLockedTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : '—'}
          </div>
        </div>

        <FloatActions rows={rows} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Main table grid */}
        <div className="grid grid-cols-1 gap-[1px] bg-line border-b border-line">
          <div className="bg-bg p-0">
            <FloatTable rows={rows} />
          </div>
        </div>

        {/* 'Why this number matters' — strictly ONLY this block per instruction #1 and BRIEF 5.2b */}
        <div className="grid grid-cols-1 gap-[1px] bg-line border-b border-line" >
          <div className="bg-bg flex flex-col" style={{ padding: "16px 18px" }}>
            <div className="flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">
                Why this number matters
              </h2>
            </div>
            <p className="text-[11px] text-fg3 leading-[1.6]">
              Stock token supply is fixed. Only the licensed minter can create more, and it mints against real shares held in custody, not on demand from a pool. So when a memecoin pool absorbs a large slice of a ticker&apos;s on-chain supply, that slice leaves circulation.
            </p>
            <p className="text-[11px] text-fg3 leading-[1.6] mt-[11px]">
              If the LP position is burned, it leaves permanently. The pool stops being a participant in that ticker&apos;s on-chain market and becomes the market &#8212; anyone wanting NVDA on chain has to go through a memecoin to get it.
            </p>
          </div>
          
      </div>
    </div>
    </div>
  );
}
