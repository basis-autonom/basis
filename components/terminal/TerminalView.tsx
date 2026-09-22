"use client";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { BoardTable } from "@/components/board/BoardTable";
import { useTerminalRows } from "@/components/shell/TerminalDataProvider";
import { PairSummary } from "./PairSummary";
import { TerminalChart } from "./TerminalChart";
import { SplitInspector } from "./SplitInspector";
import { TerminalControls } from "./TerminalControls";
import { FindingsPanel } from "@/components/findings/FindingsPanel";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
};

type ActiveTab = "all" | "greenStock" | "highGrip";

export function TerminalView() {
  const { rows, isRpcError } = useTerminalRows();
  const [selectedCa, setSelectedCa] = useState<string>(
    rows[0]?.ca || rows[0]?.poolId || "",
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [filterLiq10k, setFilterLiq10k] = useState(false);
  const [hideLpLive, setHideLpLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeframe, setTimeframe] = useState<
    "1h" | "4h" | "24h" | "7d" | "30d"
  >("24h");
  const [findingsContentHeight, setFindingsContentHeight] = useState(42);
  const [tableContentHeight, setTableContentHeight] = useState(160);

  const filterRows = useMemo(() => {
    let result = [...(rows || [])];
    if (filterLiq10k)
      result = result.filter((row) => (row.liquidity ?? 0) >= 10000);
    if (hideLpLive)
      result = result.filter((row) => row.lpBurned !== false);
    return result;
  }, [rows, filterLiq10k, hideLpLive]);

  const filteredRows = useMemo(() => {
    if (activeTab === "greenStock")
      return filterRows.filter(
        (row) => (row.stock7d ?? 0) > 0 && (row.meme7d ?? 0) <= 0,
      );
    if (activeTab === "highGrip")
      return filterRows.filter((row) => (row.grip ?? 0) >= 10);
    return filterRows;
  }, [filterRows, activeTab]);

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

  const greenStockCount = filterRows.filter(
    (row) => (row.stock7d ?? 0) > 0 && (row.meme7d ?? 0) <= 0,
  ).length;
  const highGripCount = filterRows.filter(
    (row) => (row.grip ?? 0) >= 10,
  ).length;
  const liveLpCount = (rows || []).filter(
    (row) => row.lpBurned === false && (!filterLiq10k || (row.liquidity ?? 0) >= 10000),
  ).length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const storage = mounted && typeof window !== "undefined" ? window.localStorage : memoryStorage;
  const rootLayout = useDefaultLayout({
    id: "basis-terminal-root",
    panelIds: ["basis-main", "basis-inspector"],
    storage,
    onlySaveAfterUserInteractions: true,
  });
  const mainLayout = useDefaultLayout({
    id: "basis-terminal-main",
    panelIds: ["basis-chart", "basis-lower"],
    storage,
    onlySaveAfterUserInteractions: true,
  });
  const lowerLayout = useDefaultLayout({
    id: "basis-terminal-lower",
    panelIds: ["basis-findings", "basis-board"],
    storage,
    onlySaveAfterUserInteractions: true,
  });

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
    <Group id="basis-terminal-root" defaultLayout={rootLayout.defaultLayout} onLayoutChanged={rootLayout.onLayoutChanged} orientation="horizontal" className="flex min-w-0 flex-1 overflow-hidden">
      <Panel id="basis-main" defaultSize="75%" minSize="50%" className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
        <Group id="basis-terminal-main" defaultLayout={mainLayout.defaultLayout} onLayoutChanged={mainLayout.onLayoutChanged} orientation="vertical">
          <Panel id="basis-chart" defaultSize="50%" minSize="20%" className="flex flex-col min-h-0 relative">
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
          <Panel id="basis-lower"
            defaultSize="50%"
            minSize="20%"
            maxSize={lowerContentHeight}
            className="flex flex-col min-h-0"
          >
            <Group id="basis-terminal-lower" defaultLayout={lowerLayout.defaultLayout} onLayoutChanged={lowerLayout.onLayoutChanged} orientation="vertical" className="min-h-0 flex-1">
              <Panel id="basis-findings"
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
              <Panel id="basis-board"
                defaultSize="84%"
                minSize={160}
                maxSize={tableContentHeight}
                className="flex min-h-0 flex-col"
              >
                <TerminalControls
                  activeTab={activeTab}
                  filterLiq10k={filterLiq10k}
                  hideLpLive={hideLpLive}
                  liveLpCount={liveLpCount}
                  rowCount={filterRows.length}
                  greenStockCount={greenStockCount}
                  highGripCount={highGripCount}
                  onTabChange={setActiveTab}
                  onLiquidityToggle={() => setFilterLiq10k((value) => !value)}
                  onHideLpLiveToggle={() => setHideLpLive((value) => !value)}
                />
                <div className="min-h-0 flex-1 overflow-auto bg-bg">
                  <BoardTable
                    isRpcError={isRpcError}
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
      <Panel id="basis-inspector" defaultSize="25%" minSize="15%" maxSize="40%" className="flex flex-col min-h-0 border-l border-line">
        <SplitInspector row={selectedRow} isRpcError={isRpcError} copied={copied} onCopy={handleCopy} />
      </Panel>
    </Group>
  );
}
