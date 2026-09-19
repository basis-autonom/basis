"use client";

import React, { useEffect, useRef, useState } from "react";

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

type FloatRow = {
  ticker?: string | null;
  floatOnChain?: number | null;
  lockedInPools?: number | null;
  gripPct?: number | null;
  poolsCount?: number | null;
};

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function numberOrBlank(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "" : String(value);
}

export function FloatActions({ rows }: { rows: FloatRow[] }) {
  const [exportFeedback, setExportFeedback] = useState<Feedback>(null);
  const [copyFeedback, setCopyFeedback] = useState<Feedback>(null);
  const exportTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    const exportTimeout = exportTimer.current;
    const copyTimeout = copyTimer.current;
    return () => {
      if (exportTimeout != null) window.clearTimeout(exportTimeout);
      if (copyTimeout != null) window.clearTimeout(copyTimeout);
    };
  }, []);

  const showFeedback = (
    setter: React.Dispatch<React.SetStateAction<Feedback>>,
    timer: React.MutableRefObject<number | null>,
    feedback: Feedback,
  ) => {
    setter(feedback);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setter(null), 1800);
  };

  const exportCsv = () => {
    try {
      const header = [
        "Ticker",
        "Float on chain",
        "Locked in pools",
        "Share gripped (%)",
        "Pools",
      ];
      const lines = rows.map((row) => [
        row.ticker ?? "",
        numberOrBlank(row.floatOnChain),
        numberOrBlank(row.lockedInPools),
        numberOrBlank(row.gripPct),
        numberOrBlank(row.poolsCount),
      ]);
      const csv = [header, ...lines]
        .map((line) => line.map(csvCell).join(","))
        .join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `basis-float-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      showFeedback(setExportFeedback, exportTimer, {
        kind: "success",
        message: "Downloaded!",
      });
    } catch {
      showFeedback(setExportFeedback, exportTimer, {
        kind: "error",
        message: "Download failed",
      });
    }
  };

  const copyBoard = async () => {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      const text = [
        [
          "Ticker",
          "Float on chain",
          "Locked in pools",
          "Share gripped (%)",
          "Pools",
        ].join("\t"),
        ...rows.map((row) =>
          [
            row.ticker ?? "",
            numberOrBlank(row.floatOnChain),
            numberOrBlank(row.lockedInPools),
            numberOrBlank(row.gripPct),
            numberOrBlank(row.poolsCount),
          ].join("\t"),
        ),
      ].join("\n");
      await navigator.clipboard.writeText(text);
      showFeedback(setCopyFeedback, copyTimer, {
        kind: "success",
        message: "Copied!",
      });
    } catch {
      showFeedback(setCopyFeedback, copyTimer, {
        kind: "error",
        message: "Copy failed",
      });
    }
  };

  return (
    <div
      className="flex flex-shrink-0 items-start gap-[7px]"
      style={{ marginLeft: "auto" }}
    >
      <div className="flex flex-col items-end gap-[3px]">
        <button
          type="button"
          onClick={exportCsv}
          className="basis-action-button basis-action-button--secondary"
        >
          {exportFeedback?.message ?? "Export CSV"}
        </button>
        <span
          className={`h-[10px] font-mono text-[9px] ${exportFeedback?.kind === "error" ? "text-down" : "text-fg3"}`}
          aria-live="polite"
        >
          {exportFeedback?.kind === "error" ? "Could not create the file" : ""}
        </span>
      </div>
      <div className="flex flex-col items-end gap-[3px]">
        <button
          type="button"
          onClick={copyBoard}
          className="basis-action-button basis-action-button--primary"
        >
          {copyFeedback?.message ?? "Copy board"}
        </button>
        <span
          className={`h-[10px] font-mono text-[9px] ${copyFeedback?.kind === "error" ? "text-down" : "text-fg3"}`}
          aria-live="polite"
        >
          {copyFeedback?.kind === "error" ? "Clipboard access was blocked" : ""}
        </span>
      </div>
    </div>
  );
}
