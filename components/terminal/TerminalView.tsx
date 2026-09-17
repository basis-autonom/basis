"use client";
import React, { useMemo, useState } from "react";
import { BoardTable } from "@/components/board/BoardTable";
import { useTerminalRows } from "@/components/shell/TerminalDataProvider";
import { PairSummary } from "./PairSummary";
import { TerminalChart } from "./TerminalChart";
import { SplitInspector } from "./SplitInspector";
import { TerminalControls } from "./TerminalControls";
import { Group, Panel, Separator } from "react-resizable-panels";

type ActiveTab = "all" | "greenStock" | "highGrip";

export function TerminalView() {
  const { rows } = useTerminalRows();
  const [selectedCa, setSelectedCa] = useState<string>(
    rows[0]?.ca || rows[0]?.poolId || "",
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [filterLiq10k, setFilterLiq10k] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeframe, setTimeframe] = useState<
    "1h" | "4h" | "24h" | "7d" | "30d"
  >("24h");

  const filteredRows = useMemo(() => {
    let result = [...(rows || [])];
    if (activeTab === "greenStock")
      result = result.filter(
        (row) => (row.stock7d ?? 0) > 0 && (row.meme7d ?? 0) <= 0,
      );
    if (activeTab === "highGrip")
      result = result.filter((row) => (row.grip ?? 0) >= 10);
    if (filterLiq10k)
      result = result.filter((row) => (row.liquidity ?? 0) >= 10000);
    return result;
  }, [rows, activeTab, filterLiq10k]);

  const selectedRow = useMemo(
    () =>
      filteredRows.find(
        (row) => row.ca === selectedCa || row.poolId === selectedCa,
      ) ||
      rows.find((row) => row.ca === selectedCa || row.poolId === selectedCa) ||
      filteredRows[0] ||
      rows[0] ||
      null,
    [filteredRows, rows, selectedCa],
  );

  const greenStockCount = (rows || []).filter(
    (row) => (row.stock7d ?? 0) > 0 && (row.meme7d ?? 0) <= 0,
  ).length;
  const highGripCount = (rows || []).filter(
    (row) => (row.grip ?? 0) >= 10,
  ).length;

  const handleCopy = () => {
    if (!selectedRow) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/c/${selectedRow.ca || selectedRow.poolId}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Group orientation="horizontal" className="flex min-w-0 flex-1 overflow-hidden">
      <Panel defaultSize="75%" minSize="50%" className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
        <Group orientation="vertical">
          <Panel defaultSize="50%" minSize="20%" className="flex flex-col min-h-0 relative">
            {selectedRow && <PairSummary row={selectedRow} />}
            <TerminalChart
              seed={selectedCa}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </Panel>
          <Separator className="h-[12px] bg-transparent hover:bg-meme/30 active:bg-meme/50 cursor-row-resize transition-colors z-10 -my-[6px] relative" />
          <Panel defaultSize="50%" minSize="20%" className="flex flex-col min-h-0">
            <TerminalControls
              activeTab={activeTab}
              filterLiq10k={filterLiq10k}
              rowCount={(rows || []).length}
              greenStockCount={greenStockCount}
              highGripCount={highGripCount}
              onTabChange={setActiveTab}
              onLiquidityToggle={() => setFilterLiq10k((value) => !value)}
            />
            <div className="min-h-0 flex-1 overflow-auto bg-bg">
              <BoardTable
                rows={filteredRows}
                selectedCa={selectedRow?.ca || selectedRow?.poolId}
                onSelectRow={(row) => setSelectedCa(row.ca || row.poolId)}
              />
            </div>
          </Panel>
        </Group>
      </Panel>
      <Separator className="w-[12px] bg-transparent hover:bg-meme/30 active:bg-meme/50 cursor-col-resize transition-colors z-10 -mx-[6px] relative" />
      <Panel defaultSize="25%" minSize="15%" maxSize="40%" className="flex flex-col min-h-0 border-l border-line">
        <SplitInspector row={selectedRow} copied={copied} onCopy={handleCopy} />
      </Panel>
    </Group>
  );
}
