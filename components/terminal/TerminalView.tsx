"use client";
import React, { useCallback, useMemo, useState } from "react";
import { BoardTable } from "@/components/board/BoardTable";
import { useTerminalRows } from "@/components/shell/TerminalDataProvider";
import { PairSummary } from "./PairSummary";
import { TerminalChart } from "./TerminalChart";
import { SplitInspector } from "./SplitInspector";
import { TerminalControls } from "./TerminalControls";
import { FindingsPanel } from "@/components/findings/FindingsPanel";
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
  const [findingsContentHeight, setFindingsContentHeight] = useState(42);
  const [tableContentHeight, setTableContentHeight] = useState(160);

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

  const handleFindingsContentHeightChange = useCallback((height: number) => {
    setFindingsContentHeight(height);
  }, []);

  const handleTableContentHeightChange = useCallback((height: number) => {
    setTableContentHeight(Math.max(160, height + 48));
  }, []);

  const lowerContentHeight = findingsContentHeight + tableContentHeight + 1;

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
          <Separator
            className="relative z-10 h-px flex-shrink-0 cursor-row-resize bg-line transition-colors hover:bg-meme active:bg-meme after:absolute after:-inset-y-[6px] after:inset-x-0 after:content-['']"
          />
          <Panel
            defaultSize="50%"
            minSize="20%"
            maxSize={lowerContentHeight}
            className="flex flex-col min-h-0"
          >
            <Group orientation="vertical" className="min-h-0 flex-1">
              <Panel
                defaultSize="16%"
                minSize={42}
                maxSize={findingsContentHeight}
                className="min-h-0"
              >
                <FindingsPanel
                  poolCount={rows.length}
                  onContentHeightChange={handleFindingsContentHeightChange}
                />
              </Panel>
              <Separator
                aria-label="Resize findings and stock-paired pools"
                className="relative z-10 h-px flex-shrink-0 cursor-row-resize bg-line transition-colors hover:bg-meme active:bg-meme after:absolute after:-inset-y-[6px] after:inset-x-0 after:content-['']"
              />
              <Panel
                defaultSize="84%"
                minSize={160}
                maxSize={tableContentHeight}
                className="flex min-h-0 flex-col"
              >
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
                    onContentHeightChange={handleTableContentHeightChange}
                  />
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </Panel>
      <Separator
        className="relative z-10 w-px flex-shrink-0 cursor-col-resize bg-line transition-colors hover:bg-meme active:bg-meme after:absolute after:-inset-x-[6px] after:inset-y-0 after:content-['']"
      />
      <Panel defaultSize="25%" minSize="15%" maxSize="40%" className="flex flex-col min-h-0 border-l border-line">
        <SplitInspector row={selectedRow} copied={copied} onCopy={handleCopy} />
      </Panel>
    </Group>
  );
}
