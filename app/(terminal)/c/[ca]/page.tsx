import { Address, SplitResponse } from '@/packages/core/types';
import { computeSplit } from '@/packages/core/attribution';
import { StatCell } from '@/components/primitives/StatCell';
import { KVRow } from '@/components/primitives/KVRow';
import { SplitBar } from '@/components/primitives/SplitBar';
import { Gauge } from '@/components/primitives/Gauge';

export default async function ReportPage({ params }: { params: Promise<{ ca: string }> }) {
  const { ca } = await params;
  
  // Hardcode 7d for the initial view as per the HTML
  const splitResponse: SplitResponse = await computeSplit(ca as Address, "7d");

  if (splitResponse.kind !== "success" || !splitResponse.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-mono text-down">Error</h1>
          <p className="mt-2 text-fg2">Status: {splitResponse.kind}</p>
        </div>
      </div>
    );
  }

  const { stock, pool, attribution, grip, prices } = splitResponse.data;
  
  // Formatting helpers
  const formatPct = (val: number) => (val * 100).toFixed(1) + '%';
  const sign = (val: number) => val >= 0 ? '+' : '';
  
  const isUp = attribution.total >= 0;
  
  const totalColor = isUp ? 'text-up' : 'text-down';
  const totalSign = isUp ? '▲' : '▼';

  const memePct = Math.abs(attribution.memeComponent);
  const stockPct = Math.abs(attribution.stockComponent);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-[22px] px-[18px] h-[58px] border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto">
        <div className="flex items-baseline gap-[8px]">
          <span className="font-mono text-[17px] font-semibold">Memecoin</span>
          <span className="text-[11px] text-fg3">quoted in</span>
          <span className="font-mono text-[14px] text-stock">{stock.symbol}</span>
        </div>
        <span className="font-mono text-[22px]">${(prices.stockNow * prices.poolRatioNow / 1e8).toFixed(4)}</span>
        <span className={`font-mono ${totalColor}`}>{totalSign} {Math.abs(attribution.total * 100).toFixed(2)}%</span>
        
        <div className="ml-4">
          <StatCell label="Grip" value={`${grip.gripPct.toFixed(1)}%`} tone={grip.gripPct > 10 ? 'hot' : 'neutral'} />
        </div>
        <div className="ml-4">
          <StatCell label="Liquidity" value={`$${(pool.liquidityUsd / 1e6).toFixed(2)}M`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-line border-b border-line">
        
        {/* Attribution Cell */}
        <div className="bg-bg p-[16px_18px]">
          <div className="flex items-baseline justify-between mb-[13px]">
            <h2 className="text-[12px] font-medium">Attribution</h2>
            <div><span className="font-mono text-[11px] text-fg3 px-[9px] py-[3px]">24h</span><span className="font-mono text-[11px] bg-pane2 text-fg rounded-[3px] px-[9px] py-[3px]">7d</span></div>
          </div>
          <div className="text-[26px] leading-[1.28] font-medium tracking-[-0.02em] max-w-[22ch]">
            {isUp ? 'Up' : 'Down'} {Math.abs(attribution.total * 100).toFixed(1)}%. <em className="not-italic text-fg2 font-normal">The meme did {(attribution.memeComponent * 100).toFixed(1)} of it.</em>
          </div>
          
          <SplitBar memePct={memePct} stockPct={stockPct} size="large" quoteSymbol={stock.symbol} />
          
          <div className="flex justify-between font-mono text-[12px]">
            <span className="text-meme">{sign(attribution.memeComponent)}{formatPct(attribution.memeComponent)}</span>
            <span className="text-stock">{sign(attribution.stockComponent)}{formatPct(attribution.stockComponent)}</span>
          </div>
          <div className="text-[11px] text-fg3 leading-[1.6] mt-[14px]">
            {stock.symbol} changed from ${(prices.stockOld/1e8).toFixed(2)} to ${(prices.stockNow/1e8).toFixed(2)} over the window. Holding the pool ratio flat, that alone lifts this token {formatPct(attribution.stockComponent)}.
          </div>
        </div>

        {/* Float Grip Cell */}
        <div className="bg-bg p-[16px_18px]">
          <div className="flex items-baseline justify-between mb-[13px]">
            <h2 className="text-[12px] font-medium">Float grip</h2>
            <span className="font-mono text-[10px] text-fg3">{stock.symbol} supply on chain</span>
          </div>
          
          <KVRow label="In this pool" value={(Number(grip.lockedRaw)/1e18).toFixed(2)} />
          <KVRow label="Total on chain" value={(Number(stock.totalSupply)/1e18).toFixed(2)} />
          <KVRow label="Share" value={`${grip.gripPct.toFixed(1)}%`} tone={grip.gripPct > 10 ? 'hot' : 'neutral'} last />
          
          <Gauge valuePct={grip.gripPct} />
          
          <div className="text-[11px] text-fg3 leading-[1.6] mt-2">
            Supply is fixed — only the licensed minter can create more. With LP burned, these tokens cannot be withdrawn, so the float stays locked for as long as the pool exists.
          </div>
        </div>

        {/* Math Cell */}
        <div className="bg-bg p-[16px_18px] lg:col-span-2">
          <div className="flex items-baseline justify-between mb-[13px]">
            <h2 className="text-[12px] font-medium">How these numbers were produced</h2>
            <span className="font-mono text-[10px] text-fg3">read it, then run it</span>
          </div>
          <div className="font-mono text-[11.5px] leading-loose text-fg2">
            price_usd &nbsp;&nbsp;&nbsp;&nbsp;= pool_ratio &#215; stock_price<br/>
            <u className="text-stock no-underline">stock_component</u> = stock_price(t) &#247; stock_price(t-n) - 1 &nbsp;&#8594;&nbsp; {(prices.stockNow/1e8).toFixed(2)} &#247; {(prices.stockOld/1e8).toFixed(2)} - 1 = <u className="text-stock no-underline">{sign(attribution.stockComponent)}{formatPct(attribution.stockComponent)}</u><br/>
            <b className="text-meme font-normal">meme_component</b> &nbsp;= pool_ratio(t) &#247; pool_ratio(t-n) - 1 &nbsp;&#8594;&nbsp; {prices.poolRatioNow.toFixed(6)} &#247; {prices.poolRatioOld.toFixed(6)} - 1 = <b className="text-meme font-normal">{sign(attribution.memeComponent)}{formatPct(attribution.memeComponent)}</b><br/>
            total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= (1 + <b className="text-meme font-normal">{attribution.memeComponent.toFixed(3)}</b>) &#215; (1 + <u className="text-stock no-underline">{attribution.stockComponent.toFixed(3)}</u>) - 1 = <span className="text-fg">{sign(attribution.total)}{formatPct(attribution.total)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
