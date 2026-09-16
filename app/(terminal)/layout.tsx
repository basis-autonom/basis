import React from 'react';
import { Topbar } from '@/components/shell/Topbar';
import { Sidebar } from '@/components/shell/Sidebar';
import { StatusBar } from '@/components/shell/StatusBar';

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-fg font-sans text-[13px] antialiased">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg relative">
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
