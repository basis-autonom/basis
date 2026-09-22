import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Topbar } from '@/components/shell/Topbar';
import { Sidebar } from '@/components/shell/Sidebar';
import { StatusBar } from '@/components/shell/StatusBar';
import { TerminalDataProvider } from '@/components/shell/TerminalDataProvider';
import { getBoardData } from '@/packages/core/board';
import { ResizableLayout } from '@/components/shell/ResizableLayout';

export default async function TerminalLayout({ children }: { children: React.ReactNode }) {
  let boardRows: any[] = [];
  let isRpcError = false;
  try {
    // The current chain has only a small set of stock-paired pools; keep the
    // shared shell request bounded so every terminal page can reuse it safely.
    boardRows = await getBoardData(12);
  } catch {
    isRpcError = true;
    // The shell should still render when the board request fails.
  }

  return (
    <TerminalDataProvider rows={boardRows} isRpcError={isRpcError}>
      <div className="flex h-screen flex-col overflow-hidden bg-bg font-sans text-[13px] text-fg antialiased">
        <Topbar />
        <ResizableLayout sidebar={<Sidebar />}>
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
            {children}
          </main>
        </ResizableLayout>
        <StatusBar />
      </div>
    </TerminalDataProvider>
  );
}
