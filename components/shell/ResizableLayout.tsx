'use client';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

export function ResizableLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Group orientation="horizontal" className="flex min-w-0 flex-1 overflow-hidden">
      <Panel defaultSize="15%" minSize="10%" maxSize="25%" className="flex flex-col min-h-0 relative z-20 bg-pane">
        {sidebar}
      </Panel>
      <Separator className="w-[12px] bg-transparent hover:bg-meme/30 active:bg-meme/50 cursor-col-resize transition-colors z-30 -mx-[6px] relative" />
      <Panel defaultSize="85%" minSize="50%" className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg relative z-10">
        {children}
      </Panel>
    </Group>
  );
}
