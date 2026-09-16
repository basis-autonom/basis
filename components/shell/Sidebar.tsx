'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTerminalRows } from './TerminalDataProvider';

function formatPrice(price: number | null | undefined) {
  if (price == null) return '—';
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

export function Sidebar() {
  const { rows: watchlist, setSelectedCa } = useTerminalRows();
  const router = useRouter();
  const pathname = usePathname();
  const isReport = pathname.startsWith('/c/');
  const reportCa = isReport ? pathname.split('/c/')[1] : '';
  const shortCa = reportCa ? `${reportCa.slice(0, 6)}…${reportCa.slice(-4)}` : '';

  const getNavClass = (path: string) => {
    const isActive = !isReport && pathname === path;
    return `flex items-center gap-[10px] text-fg2 cursor-pointer border-l-[2px] hover:bg-pane2 hover:text-fg ${
      isActive ? 'text-fg border-l-meme bg-pane2' : 'border-l-transparent'
    }`;
  };

  const getIconClass = (path: string) => {
    const isActive = !isReport && pathname === path;
    return `w-[14px] text-center font-mono text-[12px] ${isActive ? 'text-meme' : 'text-fg3'}`;
  };

  return (
    <aside
      className="side border-r border-line bg-pane flex flex-col overflow-hidden flex-shrink-0 hidden md:flex"
      style={{ width: 212, minWidth: 212, maxWidth: 212 }}
    >
      <div className="navsec py-[9px] border-b border-line">
        <div
          className="navlbl text-[10px] tracking-[0.09em] text-fg3 uppercase"
          style={{ padding: '0 14px 7px' }}
        >
          Views
        </div>
        
        <Link href="/terminal" className={getNavClass('/terminal')} style={{ padding: '7px 14px' }}>
          <span className={getIconClass('/terminal')}>▱</span>
          Split board
        </Link>

        {isReport && (
          <div
            className="flex items-center gap-[10px] text-fg border-l-[2px] border-l-meme bg-pane2 cursor-pointer"
            style={{ padding: '7px 14px' }}
          >
            <span className="w-[14px] text-center font-mono text-[12px] text-meme">◉</span>
            Report
          </div>
        )}
        
        <Link href="/float" className={getNavClass('/float')} style={{ padding: '7px 14px' }}>
          <span className={getIconClass('/float')}>◎</span>
          Float grip
          <span className="font-mono text-[10px] text-fg3" style={{ marginLeft: "auto" }}>12</span>
        </Link>
        
        <Link href="/hours" className={getNavClass('/hours')} style={{ padding: '7px 14px' }}>
          <span className={getIconClass('/hours')}>⏳</span>
          Market hours
        </Link>
        
        <Link href="/actions" className={getNavClass('/actions')} style={{ padding: '7px 14px' }}>
          <span className={getIconClass('/actions')}>✎</span>
          Corporate actions
          <span className="font-mono text-[10px] text-fg3" style={{ marginLeft: "auto" }}>2</span>
        </Link>
        
        <Link href="/method" className={getNavClass('/method')} style={{ padding: '7px 14px' }}>
          <span className={getIconClass('/method')}>∑</span>
          Method
        </Link>
      </div>

      {isReport && (
        <div className="border-t border-line">
          <div
            className="text-[10px] tracking-[0.09em] text-fg3 uppercase"
            style={{ padding: '12px 14px 7px' }}
          >
            Contract
          </div>
          <div style={{ padding: '4px 14px 12px' }}>
            <div className="flex justify-between py-[5px] text-[11px]">
              <span className="text-fg3">Token</span>
              <span className="font-mono">{shortCa}</span>
            </div>
            <div className="flex justify-between py-[5px] text-[11px]">
              <span className="text-fg3">Venue</span>
              <span className="font-mono">Uniswap v4</span>
            </div>
            <div className="flex justify-between py-[5px] text-[11px]">
              <span className="text-fg3">LP</span>
              <span className="font-mono">burned</span>
            </div>
          </div>
        </div>
      )}
      
      {!isReport && (
        <div className="watch flex-1 overflow-y-auto border-t border-line">
          <div
            className="navlbl text-[10px] tracking-[0.09em] text-fg3 uppercase"
            style={{ padding: '9px 14px 7px' }}
          >
            Watchlist
          </div>
          <div className="flex min-w-0 flex-col">
            {watchlist.map((item, idx) => (
              <div onClick={() => { setSelectedCa(item.ca || item.poolId); if (pathname !== "/terminal") router.push('/terminal'); }}
                key={item.ca || item.poolId || idx}

                className="flex min-w-0 items-center justify-between gap-[8px] border-b border-line/40 transition-colors hover:bg-pane2 cursor-pointer"
                style={{ padding: '8px 14px' }}
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-[12px] font-medium text-fg" title={item.coinName || item.coin}>{item.coin || '—'}</div>
                  <div className="mt-[1px] truncate font-mono text-[10px] text-stock">{item.quote || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[12px] text-fg">{formatPrice(item.priceUsd)}</div>
                  <div className={`mt-[1px] font-mono text-[10px] ${item.chg24h == null ? 'text-fg3' : item.chg24h >= 0 ? 'text-up' : 'text-down'}`}>
                    {item.chg24h == null ? '—' : `${item.chg24h >= 0 ? '+' : ''}${item.chg24h.toFixed(1)}%`}
                  </div>
                </div>
              </div>
            ))}
            {watchlist.length === 0 && <div style={{ padding: '12px 14px' }} className="font-mono text-[10px] text-fg3">No pools indexed</div>}
          </div>
        </div>
      )}
    </aside>
  );
}
