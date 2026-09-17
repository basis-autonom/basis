'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { pageMetaMap } from './pageMeta';
import { useTerminalRows } from './TerminalDataProvider';
import { startBasisRouteTransition } from './routeTransition';
import { useSidebarLayout } from './ResizableLayout';
import styles from './Sidebar.module.css';

function formatPrice(price: number | null | undefined) {
  if (price == null) return '—';
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

export function Sidebar() {
  const { rows: watchlist, setSelectedCa } = useTerminalRows();
  const { isCollapsed, toggleSidebar } = useSidebarLayout();
  const router = useRouter();
  const pathname = usePathname();
  const isReport = pathname.startsWith('/c/');
  const reportCa = isReport ? pathname.split('/c/')[1] : '';
  const shortCa = reportCa ? `${reportCa.slice(0, 6)}…${reportCa.slice(-4)}` : '';
  const activeRow = watchlist.find(r => r.ca?.toLowerCase() === reportCa?.toLowerCase() || r.poolId?.toLowerCase() === reportCa?.toLowerCase());
  const meta = pageMetaMap[pathname];

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
      data-collapsed={isCollapsed}
      className={`side border-r border-line bg-pane flex flex-col w-full h-full ${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      style={{ width: "100%", height: "100%" }}
    >
      <div className={`navsec border-b border-line ${styles.navSection}`}>
        <div className={styles.sidebarHeader}>
          <div className={`navlbl text-[10px] tracking-[0.09em] text-fg3 uppercase ${styles.sectionLabel}`}>Views</div>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d={isCollapsed ? 'm5 2.5 4 4.5-4 4.5' : 'm9 2.5-4 4.5 4 4.5'}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        
        <Link href="/terminal" className={`${getNavClass('/terminal')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Split board">
          <span className={`${getIconClass('/terminal')} ${styles.navIcon}`}>▱</span>
          <span className={styles.navItemLabel}>Split board</span>
        </Link>

        {isReport && (
          <div
            className={`flex items-center gap-[10px] text-fg border-l-[2px] border-l-meme bg-pane2 cursor-pointer ${styles.navItem}`}
            style={{ padding: '7px 14px' }}
            title="Report"
          >
            <span className={`w-[14px] text-center font-mono text-[12px] text-meme ${styles.navIcon}`}>◉</span>
            <span className={styles.navItemLabel}>Report</span>
          </div>
        )}
        
        <Link href="/float" className={`${getNavClass('/float')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Float grip">
          <span className={`${getIconClass('/float')} ${styles.navIcon}`}>◎</span>
          <span className={styles.navItemLabel}>Float grip</span>
          <span className={`font-mono text-[10px] text-fg3 ${styles.navCount}`} style={{ marginLeft: "auto" }}>12</span>
        </Link>
        
        <Link href="/hours" className={`${getNavClass('/hours')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Market hours">
          <span className={`${getIconClass('/hours')} ${styles.navIcon}`}>⏳</span>
          <span className={styles.navItemLabel}>Market hours</span>
        </Link>
        
        <Link href="/actions" className={`${getNavClass('/actions')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Corporate actions">
          <span className={`${getIconClass('/actions')} ${styles.navIcon}`}>✎</span>
          <span className={styles.navItemLabel}>Corporate actions</span>
          <span className={`font-mono text-[10px] text-fg3 ${styles.navCount}`} style={{ marginLeft: "auto" }}>2</span>
        </Link>
        
        <Link href="/method" className={`${getNavClass('/method')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Method">
          <span className={`${getIconClass('/method')} ${styles.navIcon}`}>∑</span>
          <span className={styles.navItemLabel}>Method</span>
        </Link>
      </div>

      {isReport && (
              <>
                <div className={`border-t border-line ${styles.detailSection}`}>
          <div
            className={`text-[10px] tracking-[0.09em] text-fg3 uppercase ${styles.sectionLabel}`}
            style={{ padding: '12px 14px 7px' }}
          >
            Contract
          </div>
          <div style={{ padding: '4px 14px 12px' }}>
            <div className="flex justify-between py-[5px] text-[11px]">
              <span className="text-fg3">Token</span>
              <span className="font-mono">{shortCa}</span>
            </div>
            {activeRow && (
              <>
                <div className="flex justify-between py-[5px] text-[11px]">
                  <span className="text-fg3">Pool</span>
                  <span className="font-mono">{activeRow.poolId ? `${activeRow.poolId.slice(0,6)}…${activeRow.poolId.slice(-4)}` : '—'}</span>
                </div>
                <div className="flex justify-between py-[5px] text-[11px]">
                  <span className="text-fg3">Quote</span>
                  <span className="font-mono text-stock">{activeRow.quote || '—'}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-[5px] text-[11px]">
              <span className="text-fg3">Venue</span>
              <span className="font-mono">Uniswap v4</span>
            </div>
            {activeRow && (
              <div className="flex justify-between py-[5px] text-[11px]">
                <span className="text-fg3">Age</span>
                <span className="font-mono">{activeRow.windowLabel || '—'}</span>
              </div>
            )}
            <div className="flex justify-between py-[5px] text-[11px]">
              <span className="text-fg3">LP</span>
              <span className="font-mono">burned</span>
            </div>
          </div>
        </div>
        
        {activeRow && (
          <div className={`border-t border-line ${styles.detailSection}`}>
            <div
            className={`text-[10px] tracking-[0.09em] text-fg3 uppercase ${styles.sectionLabel}`}
              style={{ padding: '12px 14px 7px' }}
            >
              Other pools on {activeRow.quote}
            </div>
            <div style={{ padding: '4px 14px 12px' }}>
              {watchlist.filter(r => r.quote === activeRow.quote && r.ca !== activeRow.ca).slice(0, 3).map((r, i) => (
                <div key={i} className="flex justify-between py-[5px] text-[11px]">
                  <span className="text-fg3">${r.coin}</span>
                  <span className="font-mono text-fg2">${r.liquidity ? (r.liquidity / 1e6).toFixed(1) + 'M' : '—'}</span>
                </div>
              ))}
              {watchlist.filter(r => r.quote === activeRow.quote && r.ca !== activeRow.ca).length === 0 && (
                <div className="flex justify-between py-[5px] text-[11px]">
                  <span className="text-fg3">None</span>
                </div>
              )}
            </div>
          </div>
        )}
              </>
      )}
      
      {!isReport && (
        <div className={`watch flex-1 overflow-y-auto border-t border-line ${styles.watchSection}`}>
          {meta?.sideExtra ? (
            meta.sideExtra
          ) : (
            <>
          <div
            className={`navlbl text-[10px] tracking-[0.09em] text-fg3 uppercase ${styles.sectionLabel}`}
            style={{ padding: '9px 14px 7px' }}
          >
            Watchlist
          </div>
          <div className="flex min-w-0 flex-col">
            {watchlist.map((item, idx) => (
              <div onClick={() => {
                setSelectedCa(item.ca || item.poolId);
                if (pathname !== "/terminal") {
                  startBasisRouteTransition('/terminal');
                  router.push('/terminal');
                }
              }}
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
          </>
          )}
        </div>
      )}
    </aside>
  );
}
