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

type SidebarIconName = 'board' | 'report' | 'float' | 'hours' | 'actions' | 'method';

type CorporateActionsBadgeResponse = {
  kind?: 'success' | 'error';
  scheduled?: unknown[];
};

function SidebarIcon({ name, className }: { name: SidebarIconName; className: string }) {
  const common = {
    className,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'board') {
    return <svg {...common}><path d="M3.5 14.5 7.5 10.5l2.8 2.6 5.7-6" /><path d="M13 7h3v3" /></svg>;
  }
  if (name === 'report') {
    return <svg {...common}><circle cx="10" cy="10" r="5.5" /><circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" /></svg>;
  }
  if (name === 'float') {
    return <svg {...common}><circle cx="10" cy="10" r="5.8" /><path d="M10 6.7v3.5l2.5 1.6" /></svg>;
  }
  if (name === 'hours') {
    return <svg {...common}><path d="M5 3.5h10M5 16.5h10M6.5 3.5c0 4.2 7 3.8 7 8.8 0 .8-.2 1.6-.7 2.4M13.5 3.5c0 4.2-7 3.8-7 8.8 0 .8.2 1.6.7 2.4" /></svg>;
  }
  if (name === 'actions') {
    return <svg {...common}><path d="m5 15 1.2-3.7L14 3.5l2.5 2.5-7.8 7.8L5 15Z" /><path d="m12.5 5 2.5 2.5" /></svg>;
  }
  return <svg {...common}><path d="M15.5 3.5H6.2l5 6.5-5 6.5h9.3" /></svg>;
}

export function Sidebar() {
  const { rows: watchlist, setSelectedCa } = useTerminalRows();
  const { isCollapsed, toggleSidebar } = useSidebarLayout();
  const router = useRouter();
  const pathname = usePathname();
  const [scheduledActionsCount, setScheduledActionsCount] = React.useState<number | null>(null);
  const isReport = pathname.startsWith('/c/');
  const reportCa = isReport ? pathname.split('/c/')[1] : '';
  const shortCa = reportCa ? `${reportCa.slice(0, 6)}…${reportCa.slice(-4)}` : '';
  const activeRow = watchlist.find(r => r.ca?.toLowerCase() === reportCa?.toLowerCase() || r.poolId?.toLowerCase() === reportCa?.toLowerCase());
  const meta = pageMetaMap[pathname];
  const highGripCount = watchlist.length > 0
    ? watchlist.filter((row) => typeof row.grip === 'number' && row.grip >= 10).length
    : null;

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    fetch('/api/actions', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as CorporateActionsBadgeResponse;
        if (!response.ok || body.kind !== 'success' || !Array.isArray(body.scheduled)) {
          throw new Error('Corporate-action badge data unavailable');
        }
        return body.scheduled.length;
      })
      .then(setScheduledActionsCount)
      .catch(() => setScheduledActionsCount(null))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const getNavClass = (path: string) => {
    const isActive = !isReport && pathname === path;
    return `flex items-center gap-[10px] text-fg2 cursor-pointer border-l-[2px] hover:bg-pane2 hover:text-fg ${
      isActive ? 'text-fg border-l-meme bg-pane2' : 'border-l-transparent'
    }`;
  };

  const getIconClass = (path: string) => {
    const isActive = !isReport && pathname === path;
    return `h-[14px] w-[14px] ${isActive ? 'text-meme' : 'text-fg3'} ${styles.navIcon}`;
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
          <SidebarIcon name="board" className={getIconClass('/terminal')} />
          <span className={styles.navItemLabel} data-collapsed-label="Board">Split board</span>
        </Link>

        {isReport && (
          <div
            className={`flex items-center gap-[10px] text-fg border-l-[2px] border-l-meme bg-pane2 cursor-pointer ${styles.navItem}`}
            style={{ padding: '7px 14px' }}
            title="Report"
          >
            <SidebarIcon name="report" className={`h-[14px] w-[14px] text-meme ${styles.navIcon}`} />
            <span className={styles.navItemLabel} data-collapsed-label="Report">Report</span>
          </div>
        )}
        
        <Link href="/float" className={`${getNavClass('/float')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Float grip">
          <SidebarIcon name="float" className={getIconClass('/float')} />
          <span className={styles.navItemLabel} data-collapsed-label="Float">Float grip</span>
          <span className={`font-mono text-[10px] text-fg3 ${styles.navCount}`} style={{ marginLeft: "auto" }}>
            {highGripCount ?? '—'}
          </span>
        </Link>
        
        <Link href="/hours" className={`${getNavClass('/hours')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Market hours">
          <SidebarIcon name="hours" className={getIconClass('/hours')} />
          <span className={styles.navItemLabel} data-collapsed-label="Hours">Market hours</span>
        </Link>
        
        <Link href="/actions" className={`${getNavClass('/actions')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Corporate actions">
          <SidebarIcon name="actions" className={getIconClass('/actions')} />
          <span className={styles.navItemLabel} data-collapsed-label="Actions">Corporate actions</span>
          <span className={`font-mono text-[10px] text-fg3 ${styles.navCount}`} style={{ marginLeft: "auto" }}>
            {scheduledActionsCount ?? '—'}
          </span>
        </Link>
        
        <Link href="/method" className={`${getNavClass('/method')} ${styles.navItem}`} style={{ padding: '7px 14px' }} title="Method">
          <SidebarIcon name="method" className={getIconClass('/method')} />
          <span className={styles.navItemLabel} data-collapsed-label="Method">Method</span>
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
