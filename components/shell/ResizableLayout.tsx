'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';

type SidebarLayoutContextValue = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

const SidebarLayoutContext = createContext<SidebarLayoutContextValue | null>(null);
const SIDEBAR_COLLAPSED_SIZE = 48;
const SIDEBAR_STORAGE_KEY = 'basis.sidebar.collapsed';

export function useSidebarLayout() {
  const context = useContext(SidebarLayoutContext);
  if (!context) {
    throw new Error('useSidebarLayout must be used inside ResizableLayout');
  }
  return context;
}

export function ResizableLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const sidebarPanelRef = usePanelRef();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const shouldCollapse = storedValue === 'true'
      || (storedValue === null && window.matchMedia('(max-width: 639px)').matches);

    if (shouldCollapse) {
      sidebarPanelRef.current?.collapse();
    }
  }, [sidebarPanelRef]);

  const setSidebarCollapsed = (nextCollapsed: boolean) => {
    if (nextCollapsed) {
      sidebarPanelRef.current?.collapse();
    } else {
      sidebarPanelRef.current?.expand();
    }
    setIsCollapsed(nextCollapsed);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextCollapsed));
  };

  const toggleSidebar = () => setSidebarCollapsed(!isCollapsed);

  return (
    <SidebarLayoutContext.Provider value={{ isCollapsed, toggleSidebar }}>
      <Group orientation="horizontal" className="flex min-w-0 flex-1 overflow-hidden">
        <Panel
          id="terminal-sidebar"
          panelRef={sidebarPanelRef}
          defaultSize={212}
          minSize={212}
          maxSize={212}
          collapsible
          collapsedSize={SIDEBAR_COLLAPSED_SIZE}
          onResize={(size) => {
            const nextCollapsed = size.inPixels <= SIDEBAR_COLLAPSED_SIZE + 1;
            setIsCollapsed((current) => current === nextCollapsed ? current : nextCollapsed);
          }}
          className="flex min-h-0 flex-col relative z-20 bg-pane"
        >
          {sidebar}
        </Panel>
        <Separator
          className="relative z-30 w-px flex-shrink-0 cursor-col-resize bg-line transition-colors hover:bg-meme active:bg-meme after:absolute after:-inset-x-[6px] after:inset-y-0 after:content-['']"
        />
        <Panel defaultSize="85%" minSize="50%" className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg relative z-10">
          {children}
        </Panel>
      </Group>
    </SidebarLayoutContext.Provider>
  );
}
