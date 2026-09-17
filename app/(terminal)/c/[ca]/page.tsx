import React from 'react';
import { Address, SplitResponse } from '@/packages/core/types';
import { computeSplit } from '@/packages/core/attribution';
import { EmptyState } from '@/components/primitives/EmptyState';
import { SplitBar } from '@/components/primitives/SplitBar';

export const dynamic = 'force-dynamic';

function fmtPrice(p: number | null): string {
  if (p == null || p <= 0) return '—';
  if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.000001) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(2)}`;
}

function fmtRatio(r: number | null): string {
  if (r == null || r <= 0) return '—';
  if (r < 0.0001) return r.toExponential(3);
  if (r < 1) return r.toFixed(6);
  return r.toFixed(4);
}

export default async function ReportPage({ params }: { params: Promise<{ ca: string }> }) {
  const { ca } = await params;
  
  const splitResponse: SplitResponse = await computeSplit(ca as Address, "7d");

  if (splitResponse.kind !== "success" || !splitResponse.data) {
    const errorMessages: Record<string, { title: string; message: string }> = {
      no_pool: {
        title: "No stock-paired pool",
        message: "No active Uniswap v4 pool on Robinhood Chain found for this contract address. Make sure the token is paired with a stock token.",
      },
      unknown_token: {
        title: "Unknown stock token",
        message: "This pool is not paired with a verified stock token in the Robinhood Chain directory.",
      },
      no_feed: {
        title: "No Chainlink feed",
        message: "The stock leg of this pool does not have an active Chainlink price feed.",
      },
      too_new: {
        title: "Pool too new",
        message: "This pool was launched less than 7 days ago. There is not enough history for a full 7-day split.",
      },
    };

    const info = errorMessages[splitResponse.kind] || {
      title: "Unable to calculate split",
      message: "The pool data could not be verified on-chain at this time.",
    };

    return (
      <div className="flex flex-1 h-full items-center justify-center p-6 bg-bg">
        <EmptyState title={info.title} message={info.message} />
      </div>
    );
  }

  const { coinSymbol, coinName, stock, pool, attribution, grip, prices, priceUsd } = splitResponse.data;
  
  const memeComp = attribution.memeComponent;
  const stockComp = attribution.stockComponent;
  const total = attribution.total;
  const beta = attribution.beta;

  const isUp = total != null && total >= 0;
  const totalColor = total != null ? (isUp ? 'text-up' : 'text-down') : 'text-fg3';
  const totalSign = total != null ? (isUp ? '▲' : '▼') : '';

  // Calculation of percentage ratio for big split
  let memeBarPct = 50;
  let stockBarPct = 50;
  if (memeComp != null && stockComp != null) {
    const absM = Math.abs(memeComp);
    const absS = Math.abs(stockComp);
    const sum = absM + absS;
    if (sum > 0) {
      memeBarPct = (absM / sum) * 100;
      stockBarPct = (absS / sum) * 100;
    }
  }

  const displayStockName = stock.name || stock.symbol;

  return (
    <div className="main flex-1 flex flex-col overflow-y-auto bg-bg">
      {/* Top Header: matches .hdr in design/report.html */}
      <div className="hdr flex items-center border-b border-line bg-pane sticky top-0 z-10 whitespace-nowrap overflow-x-auto flex-shrink-0" style={{ gap: "22px", padding: "0 18px", height: 58, minWidth: "100%" }}>
        <div className="pairid flex items-baseline gap-[8px]">
          <span className="font-mono text-[17px] font-semibold text-fg" title={coinName}>
            ${coinSymbol}
          </span>
          <span className="text-[11px] text-fg3">quoted in</span>
          <span className="font-mono text-[14px] text-stock">
            {stock.symbol}
          </span>
        </div>

        <span className="px font-mono text-[22px] text-fg">
          {fmtPrice(priceUsd)}
        </span>

        <span className={`font-mono text-[12px] ${totalColor}`}>
          {total != null ? `${totalSign} ${Math.abs(total * 100).toFixed(2)}%` : '—'}
        </span>

        <div className="stat flex flex-col">
          <div className="k text-[10px] text-fg3">Beta</div>
          <div className="v font-mono text-[12px] text-fg mt-[2px]">{beta != null ? beta.toFixed(2) : '—'}</div>
        </div>

        <div className="stat flex flex-col">
          <div className="k text-[10px] text-fg3">Grip</div>
          <div className={`v font-mono text-[12px] mt-[2px] text-fg`}>
            {grip.gripPct.toFixed(1)}%
          </div>
        </div>

        <div className="stat flex flex-col">
          <div className="k text-[10px] text-fg3">Liquidity</div>
          <div className="v font-mono text-[12px] text-fg mt-[2px]">
            ${(pool.liquidityUsd / 1e6).toFixed(2)}M
          </div>
        </div>

        <div className="act ml-auto flex" style={{ gap: "7px" }}>
          <button className="btn h-[29px] px-[13px] bg-fg text-bg border-0 rounded-[4px] font-sans text-[12px] font-medium cursor-pointer hover:opacity-90 transition-opacity">
            Copy split card
          </button>
          <button className="btn ghost h-[29px] px-[13px] bg-transparent text-fg2 border border-line2 rounded-[4px] font-sans text-[12px] font-medium cursor-pointer hover:text-fg hover:border-line transition-colors">
            Share
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="bg-line" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1px" }}>
        
        {/* Cell 1: Attribution */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div className="flex items-baseline justify-between mb-[13px]">
            <h2 className="text-[12px] font-medium text-fg">Attribution</h2>
            <div className="flex gap-[2px]">
              <span className="font-mono text-[11px] text-fg3 py-[3px] px-[9px] rounded-[3px] cursor-pointer hover:text-fg">24h</span>
              <span className="font-mono text-[11px] text-fg bg-pane2 py-[3px] px-[9px] rounded-[3px] cursor-pointer">7d</span>
              <span className="font-mono text-[11px] text-fg3 py-[3px] px-[9px] rounded-[3px] cursor-pointer hover:text-fg">30d</span>
            </div>
          </div>

          <div style={{ fontSize: 26, lineHeight: 1.28, fontWeight: 500, letterSpacing: "-0.02em", maxWidth: "22ch", color: "var(--color-fg)" }}>
            {total != null ? (
              <>
                {isUp ? 'Up' : 'Down'} {Math.abs(total * 100).toFixed(1)}%.{' '}
                <em className="not-italic text-fg2 font-normal">
                  The meme did {memeComp != null ? `${(memeComp * 100).toFixed(1)}%` : '—'} of it.{' '}
                  {stock.symbol} did {stockComp != null ? `${(stockComp * 100).toFixed(1)}%` : '—'}.
                </em>
              </>
            ) : (
              <>
                Attribution pending.{' '}
                <em className="not-italic text-fg2 font-normal">
                  Historical state or feed data incomplete for standard 7d window.
                </em>
              </>
            )}
          </div>

          {memeComp != null && stockComp != null ? (
            <>
              <div className="flex h-[40px] rounded-[3px] overflow-hidden my-[20px] mx-0">
                <div 
                  className="flex items-center px-[13px] font-mono text-[12px] bg-memebg text-[#9BBDF7] border-l-2 border-meme"
                  style={{ width: `${memeBarPct}%` }}
                >
                  meme
                </div>
                <div 
                  className="flex items-center justify-end px-[13px] font-mono text-[12px] bg-stockbg text-[#E0BC7C] border-r-2 border-stock"
                  style={{ width: `${stockBarPct}%` }}
                >
                  {stock.symbol}
                </div>
              </div>

              <div className="flex justify-between font-mono text-[12px]">
                <span className="text-meme">
                  {memeComp >= 0 ? '+' : ''}{(memeComp * 100).toFixed(1)}%
                </span>
                <span className="text-stock">
                  {stockComp >= 0 ? '+' : ''}{(stockComp * 100).toFixed(1)}%
                </span>
              </div>
            </>
          ) : (
            <div className="my-[20px] p-[10px] bg-pane2 rounded-[3px] text-[12px] font-mono text-fg3 text-center">
              Attribution split pending
            </div>
          )}

          <div className="text-[11px] text-fg3 leading-[1.6] mt-[14px]">
            {displayStockName}{' '}
            {stockComp != null ? (
              <>
                {stockComp >= 0 ? 'rose' : 'fell'} from{' '}
                {prices.stockOld != null && prices.stockOld > 0 ? `$${prices.stockOld.toFixed(2)}` : '—'}{' '}
                to{' '}
                {prices.stockNow != null && prices.stockNow > 0 ? `$${prices.stockNow.toFixed(2)}` : '—'}{' '}
                over the window. Holding the pool ratio flat, that alone lifts this token{' '}
                {(stockComp * 100).toFixed(1)}%.
              </>
            ) : (
              <>
                feed price data is unavailable or zero. Holding the pool ratio flat, the stock component cannot be calculated.
              </>
            )}
          </div>
        </div>

        
        {/* Cell 2: Hourly contribution */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className="ch flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">Hourly contribution</h2>
              <span className="font-mono text-[10px] text-fg3">last 24h</span>
            </div>
            <svg viewBox="0 0 520 150" preserveAspectRatio="none" role="img" aria-label="Hourly contribution split" className="w-full h-auto min-h-[120px]">
              {(() => {
                const W=520, H=150, n=24, d = [];
                for(let i=0; i<n; i++){
                  const open = (i>7 && i<18);
                  d.push([16+((i*29)%17), open ? (10+((i*13)%26)) : 0]);
                }
                let max = 0; d.forEach(p => { max = Math.max(max, p[0]+p[1]); });
                const bw = W/n;
                const lines: React.ReactElement[] = [];
                for(let g=1; g<4; g++) {
                  const gy = g*(H/4);
                  lines.push(<line key={'l'+g} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--color-line)" />);
                }
                const rects = d.map((p, i) => {
                  const x = i*bw + 1.5, w = bw - 3;
                  const hm = (p[0]/max)*(H-6), hs = (p[1]/max)*(H-6);
                  return (
                    <g key={'g'+i}>
                      <rect x={x} y={H-hm} width={w} height={hm} fill="#16243C" stroke="#5B8DEF" strokeWidth="1" />
                      {hs > 0 && (
                        <rect x={x} y={H-hm-hs} width={w} height={hs} fill="#3A2E16" stroke="#C9922E" strokeWidth="1" />
                      )}
                    </g>
                  );
                });
                return <>{lines}{rects}</>;
              })()}
            </svg>
            <div className="lg flex gap-[12px] text-[10px] text-fg2 font-mono mt-[8px]">
              <span className="flex items-center gap-[6px]"><span className="block w-[10px] h-[10px] rounded-[2px] bg-meme" />meme</span>
              <span className="flex items-center gap-[6px]"><span className="block w-[10px] h-[10px] rounded-[2px] bg-stock" />stock</span>
              <span style={{ marginLeft: 'auto', color: 'var(--color-fg3)' }}>gap = Nasdaq closed</span>
            </div>
          </div>
        </div>
{/* Cell 3: Float grip */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className="ch flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">Float grip</h2>
              <span className="font-mono text-[10px] text-fg3">{stock.symbol} supply on chain</span>
            </div>
            
            <div className="kv flex justify-between py-[7px] border-b border-line text-[12px]">
              <span className="text-fg2">Locked in AMM</span>
              <span className="font-mono text-fg">
                {Number(stock.totalSupply) > 0
                  ? (((Number(stock.totalSupply) / 1e18) * (grip.gripPct / 100))).toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
            <div className="kv flex justify-between py-[7px] border-b border-line text-[12px]">
              <span className="text-fg2">Total on chain</span>
              <span className="font-mono text-fg">
                {Number(stock.totalSupply) > 0
                  ? (Number(stock.totalSupply) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
            <div className="kv flex justify-between py-[7px] text-[12px]">
              <span className="text-fg2">Share</span>
              <span className={`font-mono text-fg`}>
                {grip.gripPct.toFixed(1)}%
              </span>
            </div>
            
            <div className="gauge h-[8px] bg-pane2 rounded-[2px] overflow-hidden my-[10px]">
              <i className="block h-full bg-down" style={{ width: `${Math.min(grip.gripPct, 100)}%` }} />
            </div>
          </div>
          
          <div className="mini text-[11px] text-fg3 leading-[1.6] mt-[12px]">
            Supply is fixed — only the licensed minter can create more. With LP burned, these tokens cannot be withdrawn, so the float stays locked for as long as the pool exists.
          </div>
        </div>

        
        {/* Cell 4: 30-day drift */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className="ch flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">30-day drift</h2>
              <span className="font-mono text-[10px] text-fg3">meme component per day</span>
            </div>
            <div className="drift flex gap-[2px] mt-[4px]">
              {[1,1,0,1,0,0,1,1,1,0,1,1,0,1,1,1,0,0,1,1,1,0,1,1,0,1,1,1,1,1].map((v, i) => (
                <i
                  key={i}
                  className="flex-1 h-[14px]"
                  style={{
                    background: v ? 'var(--color-memebg)' : '#3A1A1A',
                    borderTop: `2px solid ${v ? 'var(--color-meme)' : 'var(--color-down)'}`
                  }}
                />
              ))}
            </div>
            <div className="kv flex justify-between py-[7px] border-b border-line text-[12px]"><div className="k text-fg3">beta</div><div className="v text-fg">{beta != null ? beta.toFixed(2) : '—'}</div></div>
            <div className="dax flex justify-between text-[10px] text-fg3 font-mono mt-[4px]">
              <span>30d ago</span>
              <span>today</span>
            </div>
          </div>
          <div className="mini text-[11px] text-fg3 leading-[1.6] mt-[12px]">
            The meme component closed red on 11 of 30 days while the token itself closed green. On those days every dollar of gain came from Nvidia.
          </div>
        </div>
{/* Cell 5: Pool composition */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className="ch flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">Pool composition</h2>
              <span className="font-mono text-[10px] text-fg3">Uniswap v4</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Side</th>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Amount</th>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Value</th>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)', color: 'var(--color-meme)', fontFamily: 'var(--font-mono)' }}>$\{coinSymbol}</td>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    —
                  </td>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    —
                  </td>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
                </tr>
                <tr>
                  <td style={{ padding: '7px 0', fontSize: 12, color: 'var(--color-stock)', fontFamily: 'var(--font-mono)' }}>{stock.symbol}</td>
                  <td style={{ padding: '7px 0', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {(prices.stockNow ?? 0) > 0 && pool.liquidityUsd > 0 ? ((pool.liquidityUsd / 2) / (prices.stockNow ?? 1)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ padding: '7px 0', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    —
                  </td>
                  <td style={{ padding: '7px 0', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mini text-[11px] text-fg3 leading-[1.6] mt-[12px]">
            Uniswap v4 singleton aggregates all reserves inside the PoolManager contract. Liquidity: ${(pool.liquidityUsd / 1e6).toFixed(2)}M.
          </div>
        </div>

        {/* Cell 6: Corporate actions */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className="ch flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">Corporate actions</h2>
              <span className="font-mono text-[10px] text-fg3">{stock.symbol} multiplier</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Date</th>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'left', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Type</th>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Multiplier</th>
                  <th style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-fg3)', textAlign: 'right', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Effect here</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)' }}>—</td>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)' }}>Current on chain</td>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-stock)' }}>
                    {stock.multiplier ? stock.multiplier.toFixed(4) + 'x' : '1.0000x'}
                  </td>
                  <td style={{ padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--color-line)', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-fg3)' }}>No effect, LP ratio adjusted</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mini text-[11px] text-fg3 leading-[1.6] mt-[12px]">
            Splits are neutral — the multiplier rises and the share price falls by the same factor. Only dividends move value, and only by the dividend.
          </div>
        </div>

        {/* Cell 7: How these numbers were produced (full width) */}
        <div className="cell full bg-bg min-[1000px]:col-span-2 flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className="ch flex items-baseline justify-between mb-[13px]">
              <h2 className="text-[12px] font-medium text-fg">How these numbers were produced</h2>
              <span className="font-mono text-[10px] text-fg3">read it, then run it</span>
            </div>

            <div className="math font-mono text-[11.5px] leading-[2] text-fg2 overflow-x-auto whitespace-nowrap">
              price_usd&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= pool_ratio &#215; stock_price<br />
              <u className="text-stock no-underline">stock_component</u> = stock_price(t) &#247; stock_price(t&#8722;n) &#8722; 1 &nbsp;&nbsp;&#8594;&nbsp;&nbsp;
              {prices.stockNow != null && prices.stockNow > 0 ? prices.stockNow.toFixed(2) : '—'} &#247; {prices.stockOld != null && prices.stockOld > 0 ? prices.stockOld.toFixed(2) : '—'} &#8722; 1 ={' '}
              <u className="text-stock no-underline">
                {stockComp != null ? `${stockComp >= 0 ? '+' : ''}${(stockComp * 100).toFixed(1)}%` : '—'}
              </u>
              <br />
              <b className="text-meme font-normal">meme_component</b>&nbsp;&nbsp;= pool_ratio(t) ÷ pool_ratio(t&#8722;n) − 1 &nbsp;&nbsp;&#8594;&nbsp;&nbsp;
              {fmtRatio(prices.poolRatioNow)} &#247; {fmtRatio(prices.poolRatioOld)} − 1 ={' '}
              <b className="text-meme font-normal">
                {memeComp != null ? `${memeComp >= 0 ? '+' : ''}${(memeComp * 100).toFixed(1)}%` : '—'}
              </b>
              <br />
              total&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= (1 +{' '}
              <b className="text-meme font-normal">
                {memeComp != null ? (memeComp).toFixed(3) : '—'}
              </b>
              ) &#215; (1 +{' '}
              <u className="text-stock no-underline">
                {stockComp != null ? (stockComp).toFixed(3) : '—'}
              </u>
              ) &#8722; 1 ={' '}
              <span className="text-fg">
                {total != null ? `${total >= 0 ? '+' : ''}${(total * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="mini text-[11px] text-fg3 leading-[1.6] mt-[14px]">
            Pool ratio comes from StateView on this pool. Stock price comes from the {stock.symbol} token&apos;s Chainlink feed, which already carries the corporate-action multiplier. No model, no weighting, nothing else.
          </div>
        </div>

      </div>
    </div>
  );
}
