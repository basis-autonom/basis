'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pageMetaMap } from './pageMeta';
import { createPublicClient, http } from 'viem';

export function StatusBar() {
  const pathname = usePathname();
  const meta = pageMetaMap[pathname] || { statusText: [] };
  const [blockHeight, setBlockHeight] = useState<string>('syncing...');
  
  useEffect(() => {
    // Only fetch block height in browser
    if (typeof window === 'undefined') return;

    // Use a public RPC to avoid rate limits on the backend ALCHEMY key just for the status bar
    const client = createPublicClient({
      transport: http('https://rpc.mainnet.chain.robinhood.com')
    });
    
    client.getBlockNumber()
      .then(b => setBlockHeight(`block ${b.toLocaleString()}`))
      .catch(() => setBlockHeight('block unknown'));
      
    // Fetch every 10s
    const int = setInterval(() => {
      client.getBlockNumber()
        .then(b => setBlockHeight(`block ${b.toLocaleString()}`))
        .catch(() => {});
    }, 10000);
    
    return () => clearInterval(int);
  }, []);

  return (
    <div className="flex items-center gap-0 border-t border-line bg-pane font-mono text-[10px] text-fg3 overflow-hidden flex-shrink-0">
      {meta.statusText.map((status, i) => {
        // Special case: if the status is "chain 4663", we'll append the live block height after it
        if (status === 'chain 4663') {
          return (
            <React.Fragment key={i}>
              <div className="px-[12px] border-r border-line leading-[25px] whitespace-nowrap">{status}</div>
              <div className="px-[12px] border-r border-line leading-[25px] whitespace-nowrap">{blockHeight}</div>
            </React.Fragment>
          );
        }
        return (
          <div key={i} className="px-[12px] border-r border-line leading-[25px] whitespace-nowrap">
            {status}
          </div>
        );
      })}
      <div className="px-[12px] leading-[25px] whitespace-nowrap ml-auto border-l border-line">
        live
      </div>
    </div>
  );
}
