import React from 'react';

interface GaugeProps {
  valuePct: number;
  colorClass?: string;
  className?: string;
}

export function Gauge({ valuePct, colorClass = 'bg-down', className = 'w-full' }: GaugeProps) {
  // Clamp value between 0 and 100
  const clamped = Math.max(0, Math.min(100, valuePct));

  return (
    <div className={`h-[7px] bg-pane2 rounded-[2px] overflow-hidden my-[8px] ${className}`}>
      <i className={`block h-full ${colorClass}`} style={{ width: `${clamped}%` }}></i>
    </div>
  );
}
