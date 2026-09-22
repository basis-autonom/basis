import React from "react";
import Link from "next/link";

export function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-frame landing-nav-inner">
        <Link
          href="/"
          className="landing-brand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            fontSize: "16px",
          }}
        >
          <span>ba</span>
          <img
            src="/logo.png"
            alt="/"
            className="landing-brand-slash"
            style={{ width: "auto", height: "20px" }}
          />
          <span>sis</span>
          <span className="text-stock font-mono tracking-widest text-[10px] uppercase ml-[8px]" style={{ fontWeight: 'normal', transform: 'translateY(3px)' }}>Analytics</span>
        </Link>
        <div className="landing-nav-links">
          <a
            href="https://robinhoodchain.blockscout.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center border border-up/30 bg-up/10 text-up rounded-full transition-colors hover:border-up/60 font-mono text-[11px]"
            style={{ gap: 6, padding: "3px 10px", fontWeight: 500, marginRight: 8 }}
            title="View on Robinhood Chain Explorer"
          >
            <span
              className="block rounded-full bg-up flex-shrink-0"
              style={{
                width: 6,
                height: 6,
                boxShadow: "0 0 8px var(--color-up)",
              }}
            />
            LIVE · Robinhood Chain Mainnet
          </a>
          <Link href="/terminal">Terminal</Link>
          <Link href="#hours">Market hours</Link>
          <Link href="#method">Method</Link>
          <div className="flex items-center gap-[16px] ml-[4px]">
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="text-fg3 hover:text-fg transition-colors w-[15px] h-[15px] flex items-center justify-center cursor-not-allowed"
              aria-label="GitHub repository"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.5a9.5 9.5 0 0 0-3 18.52c.48.09.66-.21.66-.47v-1.68c-2.7.59-3.27-1.15-3.27-1.15-.44-1.13-1.08-1.43-1.08-1.43-.88-.6.07-.59.07-.59.97.07 1.48 1 1.48 1 .87 1.48 2.28 1.05 2.84.8.09-.63.34-1.05.62-1.29-2.16-.25-4.43-1.08-4.43-4.8 0-1.06.38-1.93 1-2.61-.1-.25-.43-1.31.1-2.58 0 0 .82-.26 2.68.99a9.3 9.3 0 0 1 4.88 0c1.86-1.25 2.68-.99 2.68-.99.53 1.27.2 2.33.1 2.58.62.68 1 1.55 1 2.61 0 3.73-2.27 4.55-4.44 4.8.35.3.66.88.66 1.78v2.65c0 .26.17.57.67.47A9.5 9.5 0 0 0 12 2.5Z" />
              </svg>
            </a>
            <span
              className="text-fg3 w-[15px] h-[15px] flex items-center justify-center opacity-50 cursor-not-allowed transition-colors"
              aria-label="X account not available yet"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.9 2.5h2.95l-6.45 7.37L23 21.5h-5.94l-4.65-6.08-5.32 6.08H4.13l6.9-7.88L4 2.5h6.09l4.2 5.55 4.61-5.55Zm-1.04 16.84h1.64L9.22 4.55H7.46l10.4 14.79Z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
