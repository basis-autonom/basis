import React from 'react';
import Link from 'next/link';

export function Topbar() {
  return (
    <div className="flex items-center gap-[14px] px-[14px] border-b border-line bg-pane flex-shrink-0 h-[46px]">
      <Link href="/" className="font-mono text-[14px] font-semibold tracking-[-0.02em] pr-[12px] border-r border-line2">
        ba<b className="text-meme font-semibold">/</b>sis
      </Link>
      
      <div className="flex-1 max-w-[520px] flex items-center gap-[9px] bg-bg border border-line2 rounded-[5px] h-[29px] px-[11px] text-fg3">
        <span className="font-mono text-[13px]">&#9906;</span>
        <input 
          placeholder="Paste a contract, or search a ticker" 
          className="flex-1 bg-transparent border-0 text-fg font-mono text-[12px] outline-none placeholder:text-fg3" 
        />
        <span className="font-mono text-[10px] border border-line2 rounded-[3px] py-[1px] px-[5px] text-fg3">
          &#8984;K
        </span>
      </div>
      
      <div className="ml-auto flex items-center gap-[16px] text-[12px] text-fg2 hidden sm:flex">
        <div className="flex items-center gap-[7px] border border-line2 rounded-[4px] py-[4px] px-[9px]">
          <span className="w-[5px] h-[5px] rounded-full bg-up shadow-[0_0_6px_var(--up)]"></span>
          Robinhood Chain
        </div>
        <span className="font-mono">block syncing</span>
        <span>Repo</span>
      </div>
    </div>
  );
}
