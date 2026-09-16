import React from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MarketHours() {
  return (
    <section id="hours" className="landing-section">
      <div className="landing-frame">
        <div className="landing-section-head">
          <h2>Open five days. Trading seven.</h2>
          <p>The stock leg only reprices while its market is open. Outside those windows the anchor is frozen, so every move is the meme — and every mispricing has to wait for the opening bell.</p>
        </div>
        <div className="landing-week-chart" role="img" aria-label="A week showing when the stock leg reprices and when it is frozen">
          {days.map((day, index) => (
            <div key={day} className="landing-day">
              <div className="landing-day-name">{day}</div>
              {index < 5 ? <div className="landing-market-open">09:30–16:00</div> : <div className="landing-frozen">frozen</div>}
            </div>
          ))}
          <div className="landing-week-meme">meme leg — always live, 168h a week</div>
        </div>
        <div className="landing-legend">
          <span><i className="landing-swatch" style={{ background: 'var(--color-stock)' }} />Stock leg repricing</span>
          <span><i className="landing-swatch" style={{ background: 'var(--color-line2)' }} />Frozen — meme only</span>
        </div>
      </div>
    </section>
  );
}
