'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { pageMetaMap } from './pageMeta';

export function Sidebar() {
  const pathname = usePathname();
  const meta = pageMetaMap[pathname] || {};

  const getNavClass = (path: string) => {
    const isActive = pathname === path || (path === '/terminal' && pathname.startsWith('/c/'));
    return `flex items-center gap-[10px] py-[7px] px-[14px] text-fg2 cursor-pointer border-l-2 hover:bg-pane2 hover:text-fg ${
      isActive ? 'text-fg border-l-meme bg-pane2' : 'border-l-transparent'
    }`;
  };

  const getIconClass = (path: string) => {
    const isActive = pathname === path || (path === '/terminal' && pathname.startsWith('/c/'));
    return `w-[14px] text-center font-mono text-[12px] ${isActive ? 'text-meme' : 'text-fg3'}`;
  };

  return (
    <aside className="border-r border-line bg-pane flex flex-col overflow-hidden w-[212px] flex-shrink-0 hidden md:flex">
      <div className="py-[9px] border-b border-line">
        <div className="text-[10px] tracking-[0.09em] text-fg3 px-[14px] pb-[7px] uppercase">Views</div>
        
        <Link href="/terminal" className={getNavClass('/terminal')}>
          <span className={getIconClass('/terminal')}>▱</span>
          Split board
        </Link>
        
        <Link href="/float" className={getNavClass('/float')}>
          <span className={getIconClass('/float')}>◎</span>
          Float grip
          <span className="ml-auto font-mono text-[10px] text-fg3">12</span>
        </Link>
        
        <Link href="/hours" className={getNavClass('/hours')}>
          <span className={getIconClass('/hours')}>⏳</span>
          Market hours
        </Link>
        
        <Link href="/actions" className={getNavClass('/actions')}>
          <span className={getIconClass('/actions')}>✎</span>
          Corporate actions
          <span className="ml-auto font-mono text-[10px] text-fg3">2</span>
        </Link>
        
        <Link href="/method" className={getNavClass('/method')}>
          <span className={getIconClass('/method')}>∑</span>
          Method
        </Link>
      </div>
      
      {meta.sideExtra && (
        <div className="border-t border-line mt-auto">
          {meta.sideExtra}
        </div>
      )}
    </aside>
  );
}
