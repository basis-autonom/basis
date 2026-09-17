"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTerminalRows } from "./TerminalDataProvider";
import { startBasisRouteTransition } from "./routeTransition";
import styles from "./SearchCommandPalette.module.css";

type SearchRow = {
  ca?: string;
  poolId?: string;
  coin?: string;
  coinName?: string;
  quote?: string;
  priceUsd?: number | null;
};

type SearchCommandPaletteProps = {
  isMac: boolean;
  onClose: () => void;
};

function formatPrice(price: number | null | undefined) {
  if (price == null || !Number.isFinite(price)) return "—";
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function isContractAddress(value: string) {
  return /^0x[a-fA-F0-9]{40,64}$/.test(value);
}

export function SearchCommandPalette({ isMac, onClose }: SearchCommandPaletteProps) {
  const { rows, setSelectedCa } = useTerminalRows() as { rows: SearchRow[]; setSelectedCa: (ca: string) => void };
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    const source = rows || [];
    if (!normalizedQuery) return source.slice(0, 8);
    return source
      .filter((row) => [row.coin, row.coinName, row.quote, row.ca, row.poolId].some((value) => value?.toLowerCase().includes(normalizedQuery)))
      .slice(0, 8);
  }, [normalizedQuery, rows]);
  const directAddress = isContractAddress(query.trim()) ? query.trim() : null;
  const optionCount = results.length + (directAddress ? 1 : 0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const openReport = (address: string) => {
    setSelectedCa(address);
    startBasisRouteTransition(`/c/${address}`);
    router.push(`/c/${address}`);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (optionCount > 0) setActiveIndex((index) => (index + 1) % optionCount);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (optionCount > 0) setActiveIndex((index) => (index - 1 + optionCount) % optionCount);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (directAddress && activeIndex === 0) {
        openReport(directAddress);
        return;
      }
      const resultIndex = directAddress ? activeIndex - 1 : activeIndex;
      const row = results[resultIndex];
      const address = row?.ca || row?.poolId;
      if (address) openReport(address);
    }
  };

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center bg-bg/78 backdrop-blur-[2px] ${styles.overlay}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-[680px] overflow-hidden rounded-[7px] border border-line2 bg-pane shadow-[0_22px_70px_rgb(0_0_0_/_52%)]" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
        <div className={`border-b border-line ${styles.header}`}>
          <div className={`flex items-center gap-3 rounded-[5px] border border-line2 bg-bg transition-colors focus-within:border-meme ${styles.searchField}`}>
            <svg aria-hidden="true" className="h-[17px] w-[17px] flex-shrink-0 text-fg2" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <label id="command-palette-title" htmlFor="command-palette-input" className="sr-only">Search contracts and tickers</label>
            <input
              ref={inputRef}
              id="command-palette-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search a ticker, coin, or paste a contract"
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-fg outline-none placeholder:text-fg3"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-results"
              aria-activedescendant={optionCount > 0 ? `command-option-${activeIndex}` : undefined}
              autoComplete="off"
            />
            <button type="button" onClick={onClose} aria-label="Close search" className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[3px] text-fg3 transition-colors hover:bg-pane2 hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-meme">
              <kbd className={`hidden rounded-[3px] border border-line2 font-mono text-[10px] text-fg3 sm:inline ${styles.closeHint}`}>Esc</kbd>
              <span className="font-sans text-[18px] leading-none sm:hidden" aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <div id="command-palette-results" className={`max-h-[min(390px,55vh)] overflow-y-auto ${styles.results}`} role="listbox" aria-label="Search results">
          {directAddress && (
            <button
              id="command-option-0"
              type="button"
              role="option"
              aria-selected={activeIndex === 0}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => openReport(directAddress)}
              className={`flex w-full items-center gap-[10px] rounded-[4px] text-left transition-colors ${styles.row} ${activeIndex === 0 ? "bg-memebg" : "hover:bg-pane2"}`}
            >
              <span className="font-mono text-[12px] text-fg">Open contract</span>
              <span className={`font-mono text-[10px] text-fg3 ${styles.rowMeta}`}>{shortenAddress(directAddress)}</span>
            </button>
          )}

          {results.map((row, index) => {
            const optionIndex = directAddress ? index + 1 : index;
            const address = row.ca || row.poolId;
            return (
              <button
                id={`command-option-${optionIndex}`}
                key={address || `${row.coin}-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === optionIndex}
                onMouseEnter={() => setActiveIndex(optionIndex)}
                onClick={() => address && openReport(address)}
                className={`flex w-full items-center gap-[10px] rounded-[4px] text-left transition-colors ${styles.row} ${activeIndex === optionIndex ? "bg-pane2" : "hover:bg-pane2"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12px] text-fg">{row.coin || "—"}</span>
                  <span className={`block truncate text-[10px] text-fg3 ${styles.rowSubtitle}`}>{row.coinName || "Pool indexed by Basis"}</span>
                </span>
                <span className="font-mono text-[11px] text-stock">{row.quote || "—"}</span>
                <span className="w-[80px] text-right font-mono text-[11px] text-fg2">{formatPrice(row.priceUsd)}</span>
              </button>
            );
          })}

          {optionCount === 0 && (
            <div className={`text-center ${styles.empty}`}>
              <p className="font-mono text-[12px] text-fg2">No matching indexed pool</p>
              <p className="mt-[5px] text-[11px] text-fg3">Paste a full contract address to open its report.</p>
            </div>
          )}
        </div>

        <div className={`hidden items-center gap-[14px] border-t border-line font-mono text-[10px] text-fg3 sm:flex ${styles.footer}`}>
          <span><kbd className="mr-[4px] rounded-[2px] border border-line2 px-[4px] py-[1px]">↑↓</kbd>navigate</span>
          <span><kbd className="mr-[4px] rounded-[2px] border border-line2 px-[4px] py-[1px]">↵</kbd>open report</span>
          <span className={`text-fg3 ${styles.footerShortcut}`}>{isMac ? "⌘ K" : "Ctrl K"}</span>
        </div>
      </div>
    </div>
  );
}
