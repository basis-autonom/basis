import React from 'react';

export function formatPrice(price: number | null | undefined): React.ReactNode {
  if (price == null) return <span className="text-fg3">—</span>;
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.000001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

export function formatPercent(value: number | null | undefined, digits = 1): React.ReactNode {
  if (value == null) return <span className="text-fg3">—</span>;
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function formatMillions(value: number | null | undefined, digits = 2): React.ReactNode {
  if (value == null) return <span className="text-fg3">—</span>;
  return `$${(value / 1e6).toFixed(digits)}M`;
}
