import React from 'react';
import Link from 'next/link';

export function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-frame landing-nav-inner">
        <Link href="/" className="landing-brand" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '16px' }}>
          <span>ba</span>
          <img src="/logo.png" alt="/" className="landing-brand-slash" style={{ width: 'auto', height: '20px' }} />
          <span>sis</span>
        </Link>
        <div className="landing-nav-links">
          <Link href="/terminal">Terminal</Link>
          <Link href="#hours">Market hours</Link>
          <Link href="#method">Method</Link>
          <a href="https://github.com/" className="landing-nav-button">Repo</a>
        </div>
      </div>
    </nav>
  );
}
