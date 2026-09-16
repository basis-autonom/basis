import React from 'react';

interface StatBandProps {
  poolCount: number;
  greenStock: number;
  largestGrip: number | null;
}

export function StatBand({ poolCount, greenStock, largestGrip }: StatBandProps) {
  const stats = [
    [poolCount.toString(), 'pools quoted in a stock, not a stablecoin'],
    [greenStock.toString(), 'green right now on their stock alone'],
    [largestGrip == null ? '—' : `${largestGrip.toFixed(1)}%`, "largest share of one stock's float held by a single pool"],
    ['128h', 'per week the stock leg is frozen and cannot correct'],
  ];

  return (
    <div className="landing-band">
      <div className="landing-frame landing-band-grid">
        {stats.map(([value, label]) => (
          <div key={label} className="landing-band-cell">
            <div className="landing-band-value">{value}</div>
            <div className="landing-band-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
