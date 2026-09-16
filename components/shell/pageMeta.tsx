import React, { ReactNode } from 'react';

export interface PageMeta {
  statusText: string[];
  sideExtra?: ReactNode;
}

export const pageMetaMap: Record<string, PageMeta> = {
  '/terminal': {
    statusText: [
      'rpc.mainnet.chain.robinhood.com', 
      'chain 4663', 
      '50 pools indexed', 
      'Nasdaq closed · stock legs frozen'
    ],
  },
  '/float': {
    statusText: [
      'rpc.mainnet.chain.robinhood.com', 
      'chain 4663', 
      '108 stock tokens read', 
      '50 pools scanned'
    ],
    sideExtra: (
      <>
        <div className="text-[10px] tracking-[0.09em] text-fg3 uppercase px-[14px] pt-[12px] pb-[7px]">
          Most gripped
        </div>
        <div className="px-[14px] pt-[4px] pb-[12px]">
          <div className="flex justify-between py-[5px] text-[11px]">
            <span className="text-fg3">HIMS</span><span className="font-mono">53.4%</span>
          </div>
          <div className="flex justify-between py-[5px] text-[11px]">
            <span className="text-fg3">NVDA</span><span className="font-mono">16.2%</span>
          </div>
          <div className="flex justify-between py-[5px] text-[11px]">
            <span className="text-fg3">HOOD</span><span className="font-mono">11.4%</span>
          </div>
          <div className="flex justify-between py-[5px] text-[11px]">
            <span className="text-fg3">AMC</span><span className="font-mono">9.8%</span>
          </div>
          <div className="flex justify-between py-[5px] text-[11px]">
            <span className="text-fg3">SPCX</span><span className="font-mono">7.1%</span>
          </div>
        </div>
      </>
    )
  },
  '/hours': {
    statusText: ['rpc.mainnet.chain.robinhood.com', 'chain 4663', 'market schedules active'],
  },
  '/actions': {
    statusText: ['rpc.mainnet.chain.robinhood.com', 'chain 4663', 'corporate actions sync'],
  },
  '/method': {
    statusText: ['rpc.mainnet.chain.robinhood.com', 'chain 4663', 'documentation mode'],
  }
};
