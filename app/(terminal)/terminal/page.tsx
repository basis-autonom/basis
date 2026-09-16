import React from 'react';
import { BoardTable } from '@/components/board/BoardTable';

export default async function TerminalBoardPage() {
  const res = await fetch('http://localhost:3000/api/board', { cache: 'no-store' });
  const data = await res.json();
  
  if (data.kind !== 'success') {
    return (
      <div className="flex h-full items-center justify-center text-down font-mono">
        Failed to load board data: {data.error || 'Unknown error'}
      </div>
    );
  }

  const rows = data.data || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-[2px] px-[14px] bg-pane border-b border-line flex-shrink-0 overflow-x-auto whitespace-nowrap">
        <span className="text-[12px] text-fg border-b-2 border-meme py-[9px] px-[12px] cursor-pointer">
          Stock-paired pools<span className="font-mono text-[10px] text-fg3 ml-[5px]">{rows.length}</span>
        </span>
        <span className="text-[12px] text-fg3 border-b-2 border-transparent py-[9px] px-[12px] cursor-pointer">
          Green on stock alone<span className="font-mono text-[10px] text-fg3 ml-[5px]">7</span>
        </span>
        <span className="text-[12px] text-fg3 border-b-2 border-transparent py-[9px] px-[12px] cursor-pointer">
          Grip over 10%<span className="font-mono text-[10px] text-fg3 ml-[5px]">12</span>
        </span>
        
        <div className="ml-auto flex gap-[6px] items-center text-[11px] text-fg3">
          <span className="border border-meme text-meme rounded-[3px] py-[3px] px-[8px] cursor-pointer">Liq &gt; $10K</span>
          <span className="border border-line2 rounded-[3px] py-[3px] px-[8px] cursor-pointer">Hide LP live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <BoardTable rows={rows} />
      </div>
    </div>
  );
}
