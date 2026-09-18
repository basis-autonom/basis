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
          className="flex items-center flex-shrink-0 font-mono font-semibold tracking-[-0.02em] text-fg gap-[2px]"
          style={{ height: "46px", fontSize: "16px" }}
        >
          <span>ba</span>
          <img src="/logo.png" alt="/" style={{ width: 'auto', height: '20px' }} />
          <span>sis</span>
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
          <a
            href="#"
            target="_blank"
            rel="noreferrer"
            className={styles.socialLinkDisabled}
            aria-label="Open Basis GitHub repository"
            title="GitHub repository"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.5a9.5 9.5 0 0 0-3 18.52c.48.09.66-.21.66-.47v-1.68c-2.7.59-3.27-1.15-3.27-1.15-.44-1.13-1.08-1.43-1.08-1.43-.88-.6.07-.59.07-.59.97.07 1.48 1 1.48 1 .87 1.48 2.28 1.05 2.84.8.09-.63.34-1.05.62-1.29-2.16-.25-4.43-1.08-4.43-4.8 0-1.06.38-1.93 1-2.61-.1-.25-.43-1.31.1-2.58 0 0 .82-.26 2.68.99a9.3 9.3 0 0 1 4.88 0c1.86-1.25 2.68-.99 2.68-.99.53 1.27.2 2.33.1 2.58.62.68 1 1.55 1 2.61 0 3.73-2.27 4.55-4.44 4.8.35.3.66.88.66 1.78v2.65c0 .26.17.57.67.47A9.5 9.5 0 0 0 12 2.5Z" />
            </svg>
          </a>
          <a
            href="#"
            aria-disabled="true"
            tabIndex={-1}
            className={styles.socialLinkDisabled}
            title="X account not available yet"
            onClick={(event) => event.preventDefault()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.9 2.5h2.95l-6.45 7.37L23 21.5h-5.94l-4.65-6.08-5.32 6.08H4.13l6.9-7.88L4 2.5h6.09l4.2 5.55 4.61-5.55Zm-1.04 16.84h1.64L9.22 4.55H7.46l10.4 14.79Z" />
            </svg>
          </a>
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
