import { Address, SplitResponse } from '../../../../../packages/core/types';
import { computeSplit } from '../../../../../packages/core/attribution';
import Link from 'next/link';

export default async function ReportPage({ params }: { params: Promise<{ ca: string }> }) {
  const { ca } = await params;
  
  // Hardcode 7d for the initial view as per the HTML
  const splitResponse: SplitResponse = await computeSplit(ca as Address, "7d");

  if (splitResponse.kind !== "success" || !splitResponse.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E12] text-[#DFE5EC]">
        <div className="text-center">
          <h1 className="text-2xl font-mono text-[#D9534F]">Error</h1>
          <p className="mt-2 text-[#8792A0]">Status: {splitResponse.kind}</p>
        </div>
      </div>
    );
  }

  const { stock, pool, attribution, grip, prices } = splitResponse.data;
  
  // Formatting helpers
  const formatPct = (val: number) => (val * 100).toFixed(1) + '%';
  const sign = (val: number) => val >= 0 ? '+' : '';
  
  const isUp = attribution.total >= 0;
  
  const totalColor = isUp ? 'text-[#3FB27F]' : 'text-[#D9534F]';
  const totalSign = isUp ? '▲' : '▼';

  return (
    <div className="app bg-[#0B0E12] text-[#DFE5EC] h-screen overflow-hidden flex flex-col font-sans text-[13px]">
      
      {/* Topbar (temp rough port from HTML) */}
      <div className="top flex items-center gap-[14px] px-[14px] border-b border-[#1E252E] bg-[#11151B] min-h-[46px]">
        <Link href="/" className="brand font-mono text-[14px] font-semibold pr-[12px] border-r border-[#2A323D]">
          ba<b className="text-[#5B8DEF]">/</b>sis
        </Link>
        <div className="search flex-1 max-w-[520px] flex items-center gap-[9px] bg-[#0B0E12] border border-[#2A323D] rounded-[5px] h-[29px] px-[11px] text-[#59636F]">
          <span>&#9906;</span>
          <input defaultValue={ca} className="flex-1 bg-transparent border-0 text-[#DFE5EC] font-mono text-[12px] outline-none" />
        </div>
        <div className="topright ml-auto flex items-center gap-[16px] text-[12px] text-[#8792A0]">
          <div className="chainpill flex items-center gap-[7px] border border-[#2A323D] rounded-[4px] px-[9px] py-[4px]">
            <span className="w-[5px] h-[5px] rounded-full bg-[#3FB27F] shadow-[0_0_6px_#3FB27F]"></span>
            Robinhood Chain
          </div>
        </div>
      </div>

      <div className="mid flex flex-1 overflow-hidden">
        
        {/* Sidebar (temp) */}
        <aside className="side border-r border-[#1E252E] bg-[#11151B] overflow-y-auto w-[212px] hidden md:block">
          <div className="text-[10px] tracking-[0.09em] text-[#59636F] px-[14px] pt-[12px] pb-[7px] uppercase">Views</div>
          <div className="flex items-center gap-[10px] px-[14px] py-[7px] text-[#DFE5EC] border-l-2 border-[#5B8DEF] bg-[#161B22] cursor-pointer">
            <span className="w-[14px] text-center font-mono text-[12px] text-[#5B8DEF]">&#9673;</span>
            Report
          </div>
          
          <div className="border-t border-[#1E252E] mt-2">
            <div className="text-[10px] tracking-[0.09em] text-[#59636F] px-[14px] pt-[12px] pb-[7px] uppercase">Contract</div>
            <div className="px-[14px] pb-[12px]">
              <div className="flex justify-between py-[5px] text-[11px]"><span className="text-[#59636F]">Token</span><span className="font-mono">{ca.slice(0,6)}&hellip;{ca.slice(-4)}</span></div>
              <div className="flex justify-between py-[5px] text-[11px]"><span className="text-[#59636F]">Pool</span><span className="font-mono">{pool.address.slice(0,6)}&hellip;{pool.address.slice(-4)}</span></div>
              <div className="flex justify-between py-[5px] text-[11px]"><span className="text-[#59636F]">Quote</span><span className="font-mono text-[#C9922E]">{stock.symbol}</span></div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main flex-1 overflow-y-auto">
          <div className="hdr flex items-center gap-[22px] px-[18px] h-[58px] border-b border-[#1E252E] bg-[#11151B] sticky top-0 z-10 whitespace-nowrap">
            <div className="pairid flex items-baseline gap-[8px]">
              <span className="font-mono text-[17px] font-semibold">Memecoin</span>
              <span className="text-[11px] text-[#59636F]">quoted in</span>
              <span className="font-mono text-[14px] text-[#C9922E]">{stock.symbol}</span>
            </div>
            <span className="px font-mono text-[22px]">${(prices.stockNow * prices.poolRatioNow / 1e8).toFixed(4)}</span>
            <span className={`font-mono ${totalColor}`}>{totalSign} {Math.abs(attribution.total * 100).toFixed(2)}%</span>
            
            <div className="stat ml-4"><div className="text-[10px] text-[#59636F]">Grip</div><div className={`font-mono text-[12px] mt-[2px] ${grip.gripPct > 10 ? 'text-[#D9534F]' : ''}`}>{grip.gripPct.toFixed(1)}%</div></div>
            <div className="stat ml-4"><div className="text-[10px] text-[#59636F]">Liquidity</div><div className="font-mono text-[12px] mt-[2px]">${(pool.liquidityUsd / 1e6).toFixed(2)}M</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-[#1E252E] border-b border-[#1E252E]">
            
            {/* Attribution Cell */}
            <div className="cell bg-[#0B0E12] p-[16px_18px]">
              <div className="flex items-baseline justify-between mb-[13px]">
                <h2 className="text-[12px] font-medium">Attribution</h2>
                <div><span className="font-mono text-[11px] text-[#59636F] px-[9px] py-[3px]">24h</span><span className="font-mono text-[11px] bg-[#161B22] text-[#DFE5EC] rounded-[3px] px-[9px] py-[3px]">7d</span></div>
              </div>
              <div className="text-[26px] leading-[1.28] font-medium tracking-[-0.02em] max-w-[22ch]">
                {isUp ? 'Up' : 'Down'} {Math.abs(attribution.total * 100).toFixed(1)}%. <em className="not-italic text-[#8792A0] font-normal">The meme did {(attribution.memeComponent * 100).toFixed(1)} of it.</em>
              </div>
              
              <div className="flex h-[40px] rounded-[3px] overflow-hidden my-[20px_8px]">
                {/* Simplified visual bar based on absolute contribution */}
                <div className="bg-[#16243C] text-[#9BBDF7] border-l-2 border-[#5B8DEF] flex items-center px-[13px] font-mono text-[12px]" style={{width: '50%'}}>meme</div>
                <div className="bg-[#3A2E16] text-[#E0BC7C] border-r-2 border-[#C9922E] flex items-center px-[13px] font-mono text-[12px] justify-end" style={{width: '50%'}}>{stock.symbol}</div>
              </div>
              <div className="flex justify-between font-mono text-[12px]">
                <span className="text-[#5B8DEF]">{sign(attribution.memeComponent)}{formatPct(attribution.memeComponent)}</span>
                <span className="text-[#C9922E]">{sign(attribution.stockComponent)}{formatPct(attribution.stockComponent)}</span>
              </div>
              <div className="text-[11px] text-[#59636F] leading-[1.6] mt-[14px]">
                {stock.symbol} changed from ${(prices.stockOld/1e8).toFixed(2)} to ${(prices.stockNow/1e8).toFixed(2)} over the window. Holding the pool ratio flat, that alone lifts this token {formatPct(attribution.stockComponent)}.
              </div>
            </div>

            {/* Float Grip Cell */}
            <div className="cell bg-[#0B0E12] p-[16px_18px]">
              <div className="flex items-baseline justify-between mb-[13px]">
                <h2 className="text-[12px] font-medium">Float grip</h2>
                <span className="font-mono text-[10px] text-[#59636F]">{stock.symbol} supply on chain</span>
              </div>
              <div className="flex justify-between py-[7px] border-b border-[#1E252E] text-[12px]">
                <span className="text-[#8792A0]">In this pool</span><span className="font-mono">{(Number(grip.lockedRaw)/1e18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-[7px] border-b border-[#1E252E] text-[12px]">
                <span className="text-[#8792A0]">Total on chain</span><span className="font-mono">{(Number(stock.totalSupply)/1e18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-[7px] text-[12px]">
                <span className="text-[#8792A0]">Share</span><span className={`font-mono ${grip.gripPct > 10 ? 'text-[#D9534F]' : ''}`}>{grip.gripPct.toFixed(1)}%</span>
              </div>
              <div className="h-[8px] bg-[#161B22] rounded-[2px] overflow-hidden my-[10px_7px]">
                <i className="block h-full bg-[#D9534F]" style={{width: `${grip.gripPct}%`}}></i>
              </div>
              <div className="text-[11px] text-[#59636F] leading-[1.6] mt-2">
                Supply is fixed — only the licensed minter can create more. With LP burned, these tokens cannot be withdrawn, so the float stays locked for as long as the pool exists.
              </div>
            </div>

            {/* Math Cell */}
            <div className="cell bg-[#0B0E12] p-[16px_18px] lg:col-span-2">
              <div className="flex items-baseline justify-between mb-[13px]">
                <h2 className="text-[12px] font-medium">How these numbers were produced</h2>
                <span className="font-mono text-[10px] text-[#59636F]">read it, then run it</span>
              </div>
              <div className="font-mono text-[11.5px] leading-loose text-[#8792A0]">
                price_usd &nbsp;&nbsp;&nbsp;&nbsp;= pool_ratio &#215; stock_price<br/>
                <u className="text-[#C9922E] no-underline">stock_component</u> = stock_price(t) &#247; stock_price(t-n) - 1 &nbsp;&#8594;&nbsp; {(prices.stockNow/1e8).toFixed(2)} &#247; {(prices.stockOld/1e8).toFixed(2)} - 1 = <u className="text-[#C9922E] no-underline">{sign(attribution.stockComponent)}{formatPct(attribution.stockComponent)}</u><br/>
                <b className="text-[#5B8DEF] font-normal">meme_component</b> &nbsp;= pool_ratio(t) &#247; pool_ratio(t-n) - 1 &nbsp;&#8594;&nbsp; {prices.poolRatioNow.toFixed(6)} &#247; {prices.poolRatioOld.toFixed(6)} - 1 = <b className="text-[#5B8DEF] font-normal">{sign(attribution.memeComponent)}{formatPct(attribution.memeComponent)}</b><br/>
                total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= (1 + <b className="text-[#5B8DEF] font-normal">{attribution.memeComponent.toFixed(3)}</b>) &#215; (1 + <u className="text-[#C9922E] no-underline">{attribution.stockComponent.toFixed(3)}</u>) - 1 = <span className="text-[#DFE5EC]">{sign(attribution.total)}{formatPct(attribution.total)}</span>
              </div>
            </div>

          </div>
        </main>
      </div>

    </div>
  );
}
