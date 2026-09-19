"use client";

import React, { useEffect, useRef, useState } from "react";

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

type ReportActionsProps = {
  ca: string;
  coinSymbol: string;
  stockSymbol: string;
  windowLabel: string;
  memeComponent: number | null;
  stockComponent: number | null;
  total: number | null;
};

function percent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function ReportActions({
  ca,
  coinSymbol,
  stockSymbol,
  windowLabel,
  memeComponent,
  stockComponent,
  total,
}: ReportActionsProps) {
  const [copyFeedback, setCopyFeedback] = useState<Feedback>(null);
  const [shareFeedback, setShareFeedback] = useState<Feedback>(null);
  const copyTimer = useRef<number | null>(null);
  const shareTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current);
      if (shareTimer.current != null) window.clearTimeout(shareTimer.current);
    };
  }, []);

  const reportUrl = () => `${window.location.origin}/c/${encodeURIComponent(ca)}`;

  const showFeedback = (
    setter: React.Dispatch<React.SetStateAction<Feedback>>,
    timer: React.MutableRefObject<number | null>,
    feedback: Feedback,
  ) => {
    setter(feedback);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setter(null), 1800);
  };

  const handleCopy = async () => {
    const text = [
      `$${coinSymbol} / ${stockSymbol} split report`,
      windowLabel,
      `meme ${percent(memeComponent)} · stock ${percent(stockComponent)} · total ${percent(total)}`,
      reportUrl(),
    ].join("\n");

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      showFeedback(setCopyFeedback, copyTimer, { kind: "success", message: "Copied!" });
    } catch {
      showFeedback(setCopyFeedback, copyTimer, { kind: "error", message: "Copy failed" });
    }
  };

  const handleShare = async () => {
    const url = reportUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `$${coinSymbol} / ${stockSymbol} split report | Basis`,
          text: `On-chain split attribution for $${coinSymbol} quoted in ${stockSymbol}.`,
          url,
        });
        showFeedback(setShareFeedback, shareTimer, { kind: "success", message: "Shared!" });
        return;
      }

      if (!navigator.clipboard?.writeText) throw new Error("Share unavailable");
      await navigator.clipboard.writeText(url);
      showFeedback(setShareFeedback, shareTimer, { kind: "success", message: "Link copied!" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showFeedback(setShareFeedback, shareTimer, { kind: "error", message: "Share failed" });
    }
  };

  return (
    <div className="flex flex-shrink-0 items-center gap-[7px]" style={{ marginLeft: "auto" }}>
      <div className="flex flex-col items-end gap-[3px]">
        <button
          type="button"
          onClick={handleCopy}
          className="btn rounded-[4px] border-0 bg-fg px-[13px] font-sans text-[12px] font-medium text-bg transition-opacity hover:opacity-90"
          style={{ height: 29 }}
        >
          {copyFeedback?.message ?? "Copy split card"}
        </button>
        <span className={`h-[10px] font-mono text-[9px] ${copyFeedback?.kind === "error" ? "text-down" : "text-fg3"}`} aria-live="polite">
          {copyFeedback?.kind === "error" ? "Clipboard access was blocked" : ""}
        </span>
      </div>
      <div className="flex flex-col items-end gap-[3px]">
        <button
          type="button"
          onClick={handleShare}
          className="btn ghost rounded-[4px] border border-line2 bg-transparent px-[13px] font-sans text-[12px] font-medium text-fg2 transition-colors hover:border-line hover:text-fg"
          style={{ height: 29 }}
        >
          {shareFeedback?.message ?? "Share"}
        </button>
        <span className={`h-[10px] font-mono text-[9px] ${shareFeedback?.kind === "error" ? "text-down" : "text-fg3"}`} aria-live="polite">
          {shareFeedback?.kind === "error" ? "Browser share was unavailable" : ""}
        </span>
      </div>
    </div>
  );
}
