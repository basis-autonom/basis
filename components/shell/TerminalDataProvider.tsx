'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useState } from 'react';

const TerminalDataContext = createContext<{rows: any[], isRpcError: boolean, selectedCa: string, setSelectedCa: (ca: string) => void}>({rows: [], isRpcError: false, selectedCa: "", setSelectedCa: () => {}});

export function TerminalDataProvider({ rows: initialRows, isRpcError = false, children }: { rows: any[]; isRpcError?: boolean; children: React.ReactNode }) {
  const [rows, setRows] = useState(initialRows);
  const [selectedCa, setSelectedCa] = useState(initialRows[0]?.ca || initialRows[0]?.poolId || "");

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/board?limit=12');
        if (res.ok) {
          const data = await res.json();
          if (data && data.kind === "success" && data.data && data.data.length > 0) {
            setRows(data.data);
          } else if (Array.isArray(data) && data.length > 0) {
            setRows(data);
          }
        }
      } catch (e) {
        // Ignore fetch errors to avoid spamming the console
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return <TerminalDataContext.Provider value={{rows, isRpcError, selectedCa, setSelectedCa}}>{children}</TerminalDataContext.Provider>;
}

export function useTerminalRows() {
  return useContext(TerminalDataContext);
}