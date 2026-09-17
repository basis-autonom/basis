"use client";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useBlockHeight } from "./useBlockHeight";
import { SearchCommandPalette } from "./SearchCommandPalette";
import styles from "./Topbar.module.css";

function subscribeToPlatform(onChange: () => void) {
  const timer = window.setTimeout(onChange, 0);
  return () => window.clearTimeout(timer);
}

function getIsMac() {
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function subscribeToMobile(onChange: () => void) {
  const mediaQuery = window.matchMedia("(max-width: 639px)");
  const handleChange = () => onChange();
  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}

function getIsMobile() {
  return window.matchMedia("(max-width: 639px)").matches;
}

export function Topbar() {
  const blockHeight = useBlockHeight();
  const [searchOpen, setSearchOpen] = useState(false);
  const isMac = useSyncExternalStore(subscribeToPlatform, getIsMac, () => true);
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getIsMobile,
    () => false,
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isMobile) return;
      const commandOrControl = isMac ? event.metaKey : event.ctrlKey;
      if (commandOrControl && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isMac, isMobile]);

  const shortcutLabel = isMac ? "⌘ K" : "Ctrl K";

  return (
    <>
      <header
        className={`top ${styles.topbar} flex items-center border-b border-line bg-pane flex-shrink-0`}
        style={{ gap: 14, padding: "0 14px" }}
      >
        {/* brand */}
        <Link
          href="/"
          className="font-mono text-[14px] font-semibold tracking-[-0.02em] text-fg flex-shrink-0"
          style={{ lineHeight: "46px" }}
        >
          ba<b className="text-meme font-semibold">/</b>sis
        </Link>

        {/* search trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label={
            isMobile
              ? "Search or paste a contract"
              : `Search contracts and tickers (${shortcutLabel})`
          }
          aria-keyshortcuts={
            isMobile ? undefined : isMac ? "Meta+K" : "Control+K"
          }
          className={`${styles.searchTrigger} flex min-w-0 flex-1 items-center border border-line2 bg-bg text-left text-fg3 transition-colors hover:border-fg3 hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-meme`}
          style={{ height: 31, gap: 10, padding: "0 13px" }}
        >
          <svg
            aria-hidden="true"
            className="h-[15px] w-[15px] flex-shrink-0"
            viewBox="0 0 20 20"
            fill="none"
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m13 13 4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden min-w-0 flex-1 truncate font-mono text-[12px] sm:block">
            Paste a contract, or search a ticker
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] sm:hidden">
            Search or paste a contract
          </span>
          <kbd className="hidden flex-shrink-0 items-center gap-[5px] font-mono text-[10px] text-fg2 sm:flex">
            {isMac ? (
              <span aria-hidden="true" className="text-[15px]">
                ⌘
              </span>
            ) : (
              <span className="text-xs">Ctrl</span>
            )}
            <span className="text-xs">K</span>
          </kbd>
        </button>

        {/* topright — keep the compact mobile bar focused on search */}
        <div
          className="hidden flex-shrink-0 items-center text-[12px] text-fg2 md:flex"
          style={{ marginLeft: "auto", gap: 16 }}
        >
          {/* chainpill */}
          <div
            className="flex items-center border border-line2 rounded-[4px]"
            style={{ gap: 7, padding: "4px 9px" }}
          >
            <span
              className="block rounded-full bg-up flex-shrink-0"
              style={{
                width: 5,
                height: 5,
                boxShadow: "0 0 6px var(--color-up)",
              }}
            />
            Robinhood Chain
          </div>
          <span className="font-mono">{blockHeight}</span>
          <span>Repo</span>
        </div>
      </header>
      {searchOpen && (
        <SearchCommandPalette
          isMac={isMac}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
