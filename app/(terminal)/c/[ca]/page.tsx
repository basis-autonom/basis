import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Address, SplitResponse, type Window } from '@/packages/core/types';
import { computeSplit } from '@/packages/core/attribution';
import { EmptyState } from '@/components/primitives/EmptyState';
import { HourlyContributionChart } from '@/components/charts/HourlyContributionChart';
import { DriftStrip } from '@/components/charts/DriftStrip';
import { ReportActions } from '@/components/report/ReportActions';
import styles from './ReportPage.module.css';

export const dynamic = 'force-dynamic';

type ReportRouteProps = {
  params: Promise<{ ca: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
};

function getWindow(value: string | string[] | undefined): Window {
  const requested = Array.isArray(value) ? value[0] : value;
  return requested === '24h' || requested === '30d' || requested === '7d'
    ? requested
    : '7d';
}

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

async function requestOrigin(): Promise<string | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto');
  return host && protocol ? `${protocol}://${host}` : null;
}

export async function generateMetadata({ params, searchParams }: ReportRouteProps): Promise<Metadata> {
  const { ca } = await params;
  const query = await searchParams;
  const window = getWindow(query.window);
  const origin = await requestOrigin();
  const imagePath = `/api/og/${encodeURIComponent(ca)}`;
  const imageUrl = origin ? `${origin}${imagePath}` : undefined;

  try {
    const splitResponse = await computeSplit(ca as Address, window);
    const data = splitResponse.kind === 'success' ? splitResponse.data : null;
    const coinLabel = data ? `$${data.coinSymbol}` : shortAddress(ca);
    const title = data
      ? `${coinLabel} / ${data.stock.symbol} split report | Basis`
      : `${coinLabel} report | Basis`;
    const description = data
      ? `${coinLabel} quoted in ${data.stock.symbol}. On-chain split attribution for ${data.windowLabel}.`
      : splitResponse.kind === 'no_stock_leg'
        ? `${coinLabel} is quoted in ${splitResponse.quoteSymbol ?? 'a cash asset'}. There is no stock leg to separate.`
        : 'On-chain split attribution for a Robinhood Chain pool.';
    const images = imageUrl ? [{ url: `${imageUrl}?window=${window}`, width: 1200, height: 630, alt: `${title} preview` }] : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [`${imageUrl}?window=${window}`] : undefined,
      },
    };
  } catch {
    return {
      title: `${shortAddress(ca)} report | Basis`,
      description: 'On-chain split attribution for a Robinhood Chain pool.',
      openGraph: imageUrl ? { images: [`${imageUrl}?window=${window}`] } : undefined,
      twitter: imageUrl ? { card: 'summary_large_image', images: [`${imageUrl}?window=${window}`] } : undefined,
    };
  }
}

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

function fmtAmount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function fmtUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtWeight(value: number | null, total: number): string {
  if (value == null || !Number.isFinite(value) || total <= 0) return '—';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export default async function ReportPage({
  params,
  searchParams,
}: ReportRouteProps) {
  const { ca } = await params;
  const query = await searchParams;
  const window = getWindow(query.window);
  
  const splitResponse: SplitResponse = await computeSplit(ca as Address, window);

  if (splitResponse.kind === "no_stock_leg") {
    return (
      <div className={styles.noStockPage}>
        <div className={styles.noStockCard}>
          <div className={styles.noStockEyebrow}>REPORT / NO STOCK LEG</div>
          <h1 className={styles.noStockTitle}>Nothing to split from the stock side</h1>
          <p className={styles.noStockMessage}>
            This coin is quoted in <strong>{splitResponse.quoteSymbol ?? "—"}</strong>. There&apos;s no stock leg to separate.
          </p>
          {splitResponse.suggestions && splitResponse.suggestions.length > 0 && (
            <div className={styles.noStockSuggestions}>
              <div className={styles.noStockSuggestionsLabel}>
                Try a busy stock-paired coin instead.
              </div>
              <div className={styles.noStockSuggestionList}>
                {splitResponse.suggestions.map((suggestion) => (
                  <a
                    key={suggestion.tokenAddress}
                    href={`/c/${suggestion.tokenAddress}`}
                    className={styles.noStockSuggestion}
                  >
                    <span className={styles.noStockSuggestionCoin}>${suggestion.coinSymbol}</span>
                    <span className={styles.noStockSuggestionStock}>{suggestion.stockPair}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (splitResponse.kind !== "success" || !splitResponse.data) {
    const errorMessages: Record<string, { title: string; message: string }> = {
      no_pool: {
        title: "No stock-paired pool",
        message: "No active Uniswap v4 pool on Robinhood Chain found for this contract address. Make sure the token is paired with a stock token.",
      },
      pool_lookup_unavailable: {
        title: "Pool lookup unavailable",
        message: "The pool indexers or chain read did not respond after retries. This is not evidence that the pool is absent; try again shortly.",
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
  const windowLabel = splitResponse.data.windowLabel;
  const stockAttributionReady = stockComp != null
    && prices.stockOld != null
    && prices.stockNow != null
    && prices.stockOld > 0
    && prices.stockNow > 0;
  const attributionReady = stockAttributionReady && memeComp != null && total != null;

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
  const memeAmount = pool.stockSide === 0 ? pool.liquidityQuote : pool.liquidityBase;
  const stockAmount = pool.stockSide === 0 ? pool.liquidityBase : pool.liquidityQuote;
  const memeValue = memeAmount != null && priceUsd != null ? memeAmount * priceUsd : null;
  const stockValue = stockAmount != null && prices.stockNow != null
    ? stockAmount * prices.stockNow
    : null;
  const compositionTotalValue = [memeValue, stockValue]
    .filter((value): value is number => value != null && Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);
  const compositionRows = [
    { label: `$${coinSymbol}`, amount: memeAmount, value: memeValue, tone: 'meme' },
    { label: stock.symbol, amount: stockAmount, value: stockValue, tone: 'stock' },
  ];

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

        <div className={`stat flex flex-col ${styles.headerStat}`}>
          <div className="k text-[10px] text-fg3">Beta</div>
          <div className={`v font-mono text-[12px] text-fg ${styles.headerStatValue}`}>{beta != null ? beta.toFixed(2) : '—'}</div>
        </div>

        <div className={`stat flex flex-col ${styles.headerStat}`}>
          <div className="k text-[10px] text-fg3">Grip</div>
          <div className={`v font-mono text-[12px] ${styles.headerStatValue} ${grip.gripPct != null && grip.gripPct >= 10 ? 'text-down' : 'text-fg'}`}>
            {grip.gripPct == null ? '—' : `${grip.gripPct.toFixed(1)}%`}
          </div>
        </div>

        <div className={`stat flex flex-col ${styles.headerStat}`}>
          <div className="k text-[10px] text-fg3">Liquidity</div>
          <div className={`v font-mono text-[12px] text-fg ${styles.headerStatValue}`}>
            ${(pool.liquidityUsd / 1e6).toFixed(2)}M
          </div>
        </div>

        <ReportActions
          ca={ca}
          coinSymbol={coinSymbol}
          stockSymbol={stock.symbol}
          windowLabel={windowLabel}
          memeComponent={memeComp}
          stockComponent={stockComp}
          total={total}
        />
      </div>

      {/* Grid container */}
      <div className="bg-line" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1px" }}>
        
        {/* Cell 1: Attribution */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div className={`flex items-baseline justify-between ${styles.sectionHeader}`}>
            <h2 className="text-[12px] font-medium text-fg">Attribution</h2>
            <nav className="flex gap-[2px]" aria-label="Attribution window">
              {(['24h', '7d', '30d'] as Window[]).map((option) => {
                const active = window === option;
                return (
                  <a
                    key={option}
                    href={`/c/${encodeURIComponent(ca)}?window=${option}`}
                    aria-current={active ? 'page' : undefined}
                    className={`font-mono text-[11px] rounded-[3px] ${styles.timeframe} ${active ? 'text-fg bg-pane2' : 'text-fg3 hover:text-fg'}`}
                  >
                    {option}
                  </a>
                );
              })}
              {splitResponse.data.clamped && (
                <span className="ml-[6px] font-mono text-[10px] text-fg3" aria-label="Measured window">
                  {windowLabel}
                </span>
              )}
            </nav>
          </div>

          <div style={{ fontSize: 26, lineHeight: 1.28, fontWeight: 500, letterSpacing: "-0.02em", maxWidth: "22ch", color: "var(--color-fg)" }}>
            {attributionReady ? (
              <>
                {isUp ? 'Up' : 'Down'} {Math.abs(total * 100).toFixed(1)}%.{' '}
                <em className="not-italic text-fg2 font-normal">
                  The meme did {memeComp != null ? `${(memeComp * 100).toFixed(1)}%` : '—'} of it.{' '}
                  {stock.symbol} did {stockComp != null ? `${(stockComp * 100).toFixed(1)}%` : '—'}.
                </em>
              </>
            ) : stockAttributionReady ? (
              <>
                {stock.symbol} did {stockComp >= 0 ? '+' : ''}{(stockComp * 100).toFixed(1)}%.{' '}
                <em className="not-italic text-fg2 font-normal">
                  The historical meme state is incomplete for the {window} window.
                </em>
              </>
            ) : (
              <>
                Attribution pending.{' '}
                <em className="not-italic text-fg2 font-normal">
                  Historical state or feed data incomplete for the {window} window.
                </em>
              </>
            )}
          </div>

          {attributionReady ? (
            <>
              <div className={`flex h-[40px] rounded-[3px] overflow-hidden mx-0 ${styles.bigSplit}`}>
                <div 
                  className={`split-bar-label flex items-center font-mono text-[12px] bg-memebg border-l-2 border-meme ${styles.bigSplitItem}`}
                  style={{ width: `${memeBarPct}%` }}
                >
                  meme
                </div>
                <div 
                  className={`split-bar-label flex items-center justify-end font-mono text-[12px] bg-stockbg border-r-2 border-stock ${styles.bigSplitItem}`}
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

          {stockAttributionReady && (
            <div className={`text-[11px] text-fg3 leading-[1.6] ${styles.attributionNote}`}>
              {displayStockName}{' '}
              {stockComp >= 0 ? 'rose' : 'fell'} from{' '}
              {prices.stockOld != null && prices.stockOld > 0 ? `$${prices.stockOld.toFixed(2)}` : '—'}{' '}
              to{' '}
              {prices.stockNow != null && prices.stockNow > 0 ? `$${prices.stockNow.toFixed(2)}` : '—'}{' '}
              over the {windowLabel} window. Holding the pool ratio flat, that alone lifts this token{' '}
              {(stockComp * 100).toFixed(1)}%.
            </div>
          )}
        </div>

        
        {/* Cell 2: Hourly contribution */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className={`ch flex items-baseline justify-between ${styles.sectionHeader}`}>
              <h2 className="text-[12px] font-medium text-fg">Hourly contribution</h2>
              <span className="font-mono text-[10px] text-fg3">
                {splitResponse.data.clamped ? windowLabel : `last ${window}`}
              </span>
            </div>
            <HourlyContributionChart tokenAddress={ca} window={window} className="h-[150px]" />
            <div className={`lg flex gap-[12px] text-[10px] text-fg2 font-mono ${styles.chartLegend}`}>
              <span className="flex items-center gap-[6px]"><span className="block w-[10px] h-[10px] rounded-[2px] bg-meme" />meme</span>
              <span className="flex items-center gap-[6px]"><span className="block w-[10px] h-[10px] rounded-[2px] bg-stock" />stock</span>
              <span style={{ marginLeft: 'auto', color: 'var(--color-fg3)' }}>gap = Nasdaq closed</span>
            </div>
          </div>
        </div>
{/* Cell 3: Float grip */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className={`ch flex items-baseline justify-between ${styles.sectionHeader}`}>
              <h2 className="text-[12px] font-medium text-fg">Float grip</h2>
              <span className="font-mono text-[10px] text-fg3">{stock.symbol} supply on chain</span>
            </div>
            
            <div className={`kv flex justify-between border-b border-line text-[12px] ${styles.kv}`}>
              <span className="text-fg2">Locked in AMM</span>
              <span className="font-mono text-fg">
                {grip.lockedRaw != null
                  ? (Number(grip.lockedRaw) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
            <div className={`kv flex justify-between border-b border-line text-[12px] ${styles.kv}`}>
              <span className="text-fg2">Total on chain</span>
              <span className="font-mono text-fg">
                {grip.totalRaw != null
                  ? (Number(grip.totalRaw) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
            <div className={`kv flex justify-between text-[12px] ${styles.kv}`}>
              <span className="text-fg2">Share</span>
              <span className={`font-mono text-fg`}>
                {grip.gripPct == null ? '—' : `${grip.gripPct.toFixed(1)}%`}
              </span>
            </div>
            
            <div className={`gauge h-[8px] bg-pane2 rounded-[2px] overflow-hidden ${styles.gauge}`}>
              <i className="block h-full bg-down" style={{ width: grip.gripPct == null ? '0%' : `${Math.min(grip.gripPct, 100)}%` }} />
            </div>
          </div>
          
          <div className={`mini text-[11px] text-fg3 leading-[1.6] ${styles.sectionNote}`}>
            Supply is fixed — only the licensed minter can create more. With LP burned, these tokens cannot be withdrawn, so the float stays locked for as long as the pool exists.
          </div>
        </div>

        
        {/* Cell 4: 30-day drift */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className={`ch flex items-baseline justify-between ${styles.sectionHeader}`}>
              <h2 className="text-[12px] font-medium text-fg">30-day drift</h2>
              <span className="font-mono text-[10px] text-fg3">meme component per day</span>
            </div>
            <DriftStrip tokenAddress={ca} />
            <div className={`kv flex justify-between border-b border-line text-[12px] ${styles.kv}`}><div className="k text-fg3">beta</div><div className="v text-fg">{beta != null ? beta.toFixed(2) : '—'}</div></div>
          </div>
          <div className={`mini text-[11px] text-fg3 leading-[1.6] ${styles.sectionNote}`}>
            Each bar is one observed daily interval from the historical pool and stock-feed read. Hover a bar to inspect the exact components; gray intervals mean the stock market was closed or unavailable.
          </div>
        </div>
{/* Cell 5: Pool composition */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className={`ch flex items-baseline justify-between ${styles.sectionHeader}`}>
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
                {compositionRows.map((item, index) => (
                  <tr key={item.label}>
                    <td style={{ padding: '7px 0', fontSize: 12, borderBottom: index === 0 ? '1px solid var(--color-line)' : undefined, color: item.tone === 'meme' ? 'var(--color-meme)' : 'var(--color-stock)', fontFamily: 'var(--font-mono)' }}>{item.label}</td>
                    <td style={{ padding: '7px 0', fontSize: 12, borderBottom: index === 0 ? '1px solid var(--color-line)' : undefined, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtAmount(item.amount)}</td>
                    <td style={{ padding: '7px 0', fontSize: 12, borderBottom: index === 0 ? '1px solid var(--color-line)' : undefined, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtUsd(item.value)}</td>
                    <td style={{ padding: '7px 0', fontSize: 12, borderBottom: index === 0 ? '1px solid var(--color-line)' : undefined, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtWeight(item.value, compositionTotalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`mini text-[11px] text-fg3 leading-[1.6] ${styles.sectionNote}`}>
            Uniswap v4 singleton aggregates all reserves inside the PoolManager contract. Liquidity: ${(pool.liquidityUsd / 1e6).toFixed(2)}M.
          </div>
        </div>

        {/* Cell 6: Corporate actions */}
        <div className="cell bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className={`ch flex items-baseline justify-between ${styles.sectionHeader}`}>
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

          <div className={`mini text-[11px] text-fg3 leading-[1.6] ${styles.sectionNote}`}>
            Splits are neutral — the multiplier rises and the share price falls by the same factor. Only dividends move value, and only by the dividend.
          </div>
        </div>

        {/* Cell 7: How these numbers were produced (full width) */}
        <div className="cell full col-span-full bg-bg flex flex-col justify-between" style={{ padding: "16px 18px" }}>
          <div>
            <div className={`ch flex items-baseline justify-between ${styles.sectionHeader}`}>
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

          <div className={`mini text-[11px] text-fg3 leading-[1.6] ${styles.mathNote}`}>
            Pool ratio comes from StateView on this pool. Stock price comes from the {stock.symbol} token&apos;s Chainlink feed, which already carries the corporate-action multiplier. No model, no weighting, nothing else.
          </div>
        </div>

      </div>
    </div>
  );
}
