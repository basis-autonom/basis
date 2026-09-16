import React from 'react';
import { LandingGrip, displaySymbol } from './types';

export function GripBoard({ grips }: { grips: LandingGrip[] }) {
  return (
    <section className="landing-section">
      <div className="landing-frame">
        <div className="landing-section-head">
          <h2>One pool can hold half a company&apos;s on-chain float</h2>
          <p>Stock token supply is fixed and only a licensed party can mint more. Once a memecoin pool locks a large share of it and burns the LP, those shares are out of circulation for good.</p>
        </div>
        <div>
          {grips.length === 0 ? (
            <div className="landing-note">Float grip data is not available right now.</div>
          ) : grips.map((grip) => (
            <div key={`${grip.coin}-${grip.stock}`} className="landing-grip-row">
              <div className="landing-grip-name">
                {displaySymbol(grip.coin)}
                <em>quoted in {grip.stock || '—'}</em>
              </div>
              <div className="landing-grip-track"><i style={{ width: `${Math.min(Math.max(grip.grip, 0), 100)}%` }} /></div>
              <div className="landing-grip-value">{grip.grip.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
