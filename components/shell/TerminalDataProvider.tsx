'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext } from 'react';

const TerminalDataContext = createContext<{rows: any[], selectedCa: string, setSelectedCa: (ca: string) => void}>({rows: [], selectedCa: "", setSelectedCa: () => {}});

export function TerminalDataProvider({ rows, children }: { rows: any[]; children: React.ReactNode }) {
  const [selectedCa, setSelectedCa] = React.useState(rows[0]?.ca || rows[0]?.poolId || "");
  return <TerminalDataContext.Provider value={{rows, selectedCa, setSelectedCa}}>{children}</TerminalDataContext.Provider>;
}

export function useTerminalRows() {
  return useContext(TerminalDataContext);
}
