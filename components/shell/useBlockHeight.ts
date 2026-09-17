'use client';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';

let globalBlockHeight = 'syncing...';
let listeners: ((b: string) => void)[] = [];
let interval: any = null;

function notify(b: string) {
  globalBlockHeight = b;
  listeners.forEach(l => l(b));
}

export function useBlockHeight() {
  const [blockHeight, setBlockHeight] = useState<string>(globalBlockHeight);

  useEffect(() => {
    listeners.push(setBlockHeight);
    
    if (typeof window !== 'undefined' && !interval) {
      const client = createPublicClient({
        transport: http('https://rpc.mainnet.chain.robinhood.com')
      });
      
      const fetchBlock = () => {
        client.getBlockNumber()
          .then(b => notify(`block ${b.toLocaleString()}`))
          .catch(() => {});
      };
      
      fetchBlock();
      interval = setInterval(fetchBlock, 10000);
    }
    
    return () => {
      listeners = listeners.filter(l => l !== setBlockHeight);
    };
  }, []);

  return blockHeight;
}
