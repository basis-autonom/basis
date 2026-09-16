'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const STATUS_LINES = [
  'resolving contract',
  'finding deepest pool',
  'reading swap events',
  'walking chainlink rounds',
  'splitting the move',
];

type TransitionPhase = 'initial' | 'route';

export function BasisTransition() {
  const pathname = usePathname();
  const firstPathname = useRef(pathname);
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<TransitionPhase>('initial');
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  const clearTimers = useCallback(() => {
    if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    enterTimer.current = null;
    leaveTimer.current = null;
    hideTimer.current = null;
  }, []);

  const closeAfter = useCallback((delay: number) => {
    clearTimers();
    leaveTimer.current = window.setTimeout(() => setLeaving(true), delay);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, delay + 340);
  }, [clearTimers]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      window.setTimeout(() => setVisible(false), 0);
      return;
    }

    closeAfter(1280);

    return clearTimers;
  }, [clearTimers, closeAfter]);

  useEffect(() => {
    if (pathname === null || firstPathname.current === pathname) return;

    firstPathname.current = pathname;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setTimeout(() => setVisible(false), 0);
      return;
    }

    enterTimer.current = window.setTimeout(() => {
      setPhase('route');
      setStatusIndex(0);
      setLeaving(false);
      setVisible(true);
      closeAfter(300);
    }, 0);

    return clearTimers;
  }, [clearTimers, closeAfter, pathname]);

  useEffect(() => {
    if (!visible) return;

    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % STATUS_LINES.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [visible]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!visible) return null;

  return (
    <div
      className={`basis-transition basis-transition--${phase}${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Basis"
    >
      <div className="basis-transition__content">
        <div className="basis-transition__mark" aria-hidden="true">
          ba<b>/</b>sis
        </div>
        <div className="basis-transition__bar" aria-hidden="true">
          <i className="basis-transition__meme" />
          <i className="basis-transition__stock" />
        </div>
        <div className="basis-transition__line" key={STATUS_LINES[statusIndex]}>
          {STATUS_LINES[statusIndex]}
        </div>
      </div>
    </div>
  );
}
