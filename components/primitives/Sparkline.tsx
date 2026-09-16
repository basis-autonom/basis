/* eslint-disable react-hooks/purity */
import React from "react";

interface SparklineProps {
  points?: number[];
  seed?: number;
}

export function Sparkline({ points, seed }: SparklineProps) {
  let path = "";
  const n = points ? points.length : 14;

  if (points && points.length > 0) {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    for (let i = 0; i < n; i++) {
      const x = i * (64 / (n - 1));
      const y = 18 - ((points[i] - min) / range) * 16;
      path += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
  } else {
    // Dummy generator for layout
    let v = 50;
    const s = seed || Math.random() * 100;
    for (let i = 0; i < 14; i++) {
      v += ((s * (i + 3)) % 11) - 5;
      const x = i * (64 / 13);
      const y = Math.max(2, Math.min(18, v / 5));
      path += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
  }

  return (
    <svg className="w-[64px] h-[20px] block" viewBox="0 0 64 20">
      <path d={path} fill="none" stroke="var(--color-fg3)" strokeWidth="1.2" />
    </svg>
  );
}
