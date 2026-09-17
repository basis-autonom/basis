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
    <div className="flex items-center overflow-x-auto whitespace-nowrap border-b border-line bg-pane" style={{ padding: '0 14px' }}>
      <div className="flex" style={{ gap: '0' }}>
        {tabs.map((tab) => {
          const isOn = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="tb"
              style={{
                fontSize: '12px',
                padding: '9px 12px',
                cursor: 'pointer',
                borderBottom: '2px solid',
                borderBottomColor: isOn ? 'var(--color-meme)' : 'transparent',
                color: isOn ? 'var(--color-fg)' : 'var(--color-fg3)',
                background: 'transparent',
              }}
            >
              {tab.label}
              <span className="tbcount font-mono" style={{ fontSize: '10px', color: 'var(--color-fg3)', marginLeft: '5px' }}>
                {counts[tab.countKey]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="filters" style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--color-fg3)' }}>
        <button
          type="button"
          onClick={onLiquidityToggle}
          className="chip"
          style={{
            border: '1px solid',
            borderColor: filterLiq10k ? 'var(--color-meme)' : 'var(--color-line2)',
            color: filterLiq10k ? 'var(--color-meme)' : 'var(--color-fg3)',
            borderRadius: '3px',
            padding: '3px 8px',
            cursor: 'pointer',
            background: 'transparent',
          }}
        >
          Liq &gt; $10K
        </button>
        <button
          type="button"
          className="chip"
          style={{
            border: '1px solid var(--color-line2)',
            color: 'var(--color-fg3)',
            borderRadius: '3px',
            padding: '3px 8px',
            cursor: 'pointer',
            background: 'transparent',
          }}
        >
          Hide LP live
        </button>
      </div>
    </div>
  );
}
