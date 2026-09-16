import React from 'react';

type ActiveTab = 'all' | 'greenStock' | 'highGrip';

interface TerminalControlsProps {
  activeTab: ActiveTab;
  filterLiq10k: boolean;
  rowCount: number;
  greenStockCount: number;
  highGripCount: number;
  onTabChange: (tab: ActiveTab) => void;
  onLiquidityToggle: () => void;
}

const tabs: Array<{ id: ActiveTab; label: string; countKey: 'rowCount' | 'greenStockCount' | 'highGripCount' }> = [
  { id: 'all', label: 'Stock-paired pools', countKey: 'rowCount' },
  { id: 'greenStock', label: 'Green on stock alone', countKey: 'greenStockCount' },
  { id: 'highGrip', label: 'Grip over 10%', countKey: 'highGripCount' },
];

export function TerminalControls({
  activeTab,
  filterLiq10k,
  rowCount,
  greenStockCount,
  highGripCount,
  onTabChange,
  onLiquidityToggle,
}: TerminalControlsProps) {
  const counts = { rowCount, greenStockCount, highGripCount };

  return (
    <div className="flex min-h-[38px] flex-shrink-0 items-center gap-[12px] overflow-x-auto whitespace-nowrap border-b border-line bg-pane px-[14px]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`border-b-2 bg-transparent px-[6px] py-[9px] text-[12px] transition-colors ${
            activeTab === tab.id ? 'border-meme font-medium text-fg' : 'border-transparent text-fg3 hover:text-fg2'
          }`}
        >
          {tab.label}
          <span className="ml-[5px] font-mono text-[10px] text-fg3">{counts[tab.countKey]}</span>
        </button>
      ))}

      <div className="ml-auto flex items-center gap-[6px] pl-[8px] text-[11px] text-fg3">
        <button
          type="button"
          onClick={onLiquidityToggle}
          className={`rounded-[3px] border px-[8px] py-[3px] transition-colors ${
            filterLiq10k ? 'border-meme text-meme' : 'border-line2 text-fg3 hover:text-fg2'
          }`}
        >
          Liq &gt; $10K
        </button>
        <button
          type="button"
          className="rounded-[3px] border border-line2 px-[8px] py-[3px] text-fg3 transition-colors hover:text-fg2"
        >
          Hide LP live
        </button>
      </div>
    </div>
  );
}
