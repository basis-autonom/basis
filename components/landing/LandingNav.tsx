import React from 'react';
import Link from 'next/link';

export function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-frame landing-nav-inner">
        <Link href="/" className="landing-brand">ba<b className="landing-brand-slash">/</b>sis</Link>
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
