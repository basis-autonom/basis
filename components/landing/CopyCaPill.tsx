"use client";

import React, { useEffect, useRef, useState } from "react";

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

interface CopyCaPillProps {
  address: string;
  label?: string;
  symbol?: string;
  compact?: boolean;
  title?: string;
}

function shortAddress(addr: string): string {
  if (!addr) return "—";
  const clean = addr.trim();
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

export function CopyCaPill({
  address,
  label = "CA",
  symbol,
  compact = false,
  title,
}: CopyCaPillProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(address);

      if (timer.current != null) window.clearTimeout(timer.current);
      setFeedback({ kind: "success", message: "Copied!" });
      timer.current = window.setTimeout(() => setFeedback(null), 1800);
    } catch {
      if (timer.current != null) window.clearTimeout(timer.current);
      setFeedback({ kind: "error", message: "Failed" });
      timer.current = window.setTimeout(() => setFeedback(null), 1800);
    }
  };

  const isCopied = feedback?.kind === "success";
  const tooltip = title || `Copy ${symbol ? `${symbol} ` : ""}contract address: ${address}`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`landing-ca-pill-compact ${isCopied ? "text-up" : ""}`}
        title={tooltip}
        aria-label={tooltip}
      >
        {isCopied ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-up)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`landing-ca-pill ${isCopied ? "landing-ca-pill--copied" : ""}`}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="text-fg3 uppercase tracking-wider text-[9px] font-semibold">
        {label}
      </span>
      {symbol && (
        <span className="text-stock font-medium text-[11px]">{symbol}</span>
      )}
      <span className="text-fg font-mono tracking-tight">
        {isCopied ? "Copied!" : shortAddress(address)}
      </span>
      {isCopied ? (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-up)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fg3 group-hover:text-fg transition-colors"
          aria-hidden="true"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
    </button>
  );
}
