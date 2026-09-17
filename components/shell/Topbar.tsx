'use client';
import React from "react";
import Link from "next/link";
import { useBlockHeight } from "./useBlockHeight";

export function Topbar() {
  const blockHeight = useBlockHeight();
  return (
    <header
      className="top flex items-center border-b border-line bg-pane flex-shrink-0"
      style={{ gap: 14, padding: "0 14px" }}
    >
      {/* brand */}
      <Link
        href="/"
        className="font-mono text-[14px] font-semibold tracking-[-0.02em] text-fg border-r border-line2 flex-shrink-0"
        style={{ paddingRight: 12, lineHeight: "46px" }}
      >
        ba<b className="text-meme font-semibold">/</b>sis
      </Link>

      {/* search */}
      <div
        className="flex flex-1 items-center bg-bg border border-line2 rounded-[5px] text-fg3"
        style={{ maxWidth: 520, height: 29, gap: 9, padding: "0 11px" }}
      >
        <span className="font-mono text-[13px]">&#9906;</span>
        <input
          placeholder="Paste a contract, or search a ticker"
          className="flex-1 bg-transparent border-0 text-fg font-mono text-[12px] outline-none placeholder:text-fg3"
        />
        <span
          className="font-mono text-[10px] border border-line2 rounded-[3px] text-fg3"
          style={{ padding: "1px 5px" }}
        >
          &#8984;K
        </span>
      </div>

      {/* topright — always visible, no hidden class */}
      <div
        className="flex items-center text-[12px] text-fg2 flex-shrink-0"
        style={{ marginLeft: "auto", gap: 16 }}
      >
        {/* chainpill */}
        <div
          className="flex items-center border border-line2 rounded-[4px]"
          style={{ gap: 7, padding: "4px 9px" }}
        >
          <span
            className="block rounded-full bg-up flex-shrink-0"
            style={{ width: 5, height: 5, boxShadow: "0 0 6px var(--color-up)" }}
          />
          Robinhood Chain
        </div>
        <span className="font-mono">{blockHeight}</span>
        <span>Repo</span>
      </div>
    </header>
  );
}
