"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BASIS_ROUTE_TRANSITION_EVENT } from "./routeTransition";

const GridScan = dynamic(
  () => import("@/components/GridScan").then((mod) => mod.GridScan),
  { ssr: false },
);

const STATUS_LINES = [
  "resolving contract",
  "finding deepest pool",
  "reading swap events",
  "walking chainlink rounds",
  "splitting the move",
];

const ROUTE_MIN_DURATION = 900;
const TRANSITION_FADE_DURATION = 340;
const ROUTE_FALLBACK_DURATION = 10_000;

type TransitionPhase = "initial" | "route";

export function BasisTransition() {
  const pathname = usePathname();
  const firstPathname = useRef(pathname);
  const pendingPathname = useRef<string | null>(null);
  const routeStartedAt = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const routeFallbackTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<TransitionPhase>("initial");
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  const clearTimers = useCallback(() => {
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    if (routeFallbackTimer.current !== null)
      window.clearTimeout(routeFallbackTimer.current);
    leaveTimer.current = null;
    hideTimer.current = null;
    routeFallbackTimer.current = null;
  }, []);

  const closeAfter = useCallback(
    (delay: number) => {
      clearTimers();
      leaveTimer.current = window.setTimeout(() => setLeaving(true), delay);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        setLeaving(false);
      }, delay + TRANSITION_FADE_DURATION);
    },
    [clearTimers],
  );

  const finishRouteTransition = useCallback(() => {
    const startedAt = routeStartedAt.current ?? performance.now();
    const elapsed = performance.now() - startedAt;
    routeStartedAt.current = null;

    const delayBeforeFade = Math.max(
      0,
      ROUTE_MIN_DURATION - elapsed - TRANSITION_FADE_DURATION,
    );
    closeAfter(delayBeforeFade);
  }, [closeAfter]);

  const startRouteTransition = useCallback(
    (nextPathname?: string) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      clearTimers();
      routeStartedAt.current = performance.now();
      if (nextPathname) pendingPathname.current = nextPathname;
      setPhase("route");
      setStatusIndex(0);
      setLeaving(false);
      setVisible(true);
      routeFallbackTimer.current = window.setTimeout(
        finishRouteTransition,
        ROUTE_FALLBACK_DURATION,
      );
    },
    [clearTimers, finishRouteTransition],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      window.setTimeout(() => setVisible(false), 0);
      return;
    }

    closeAfter(1280);

    return clearTimers;
  }, [clearTimers, closeAfter]);

  useLayoutEffect(() => {
    if (pathname === null || firstPathname.current === pathname) return;

    const startedBeforeNavigation = pendingPathname.current === pathname;
    pendingPathname.current = null;
    firstPathname.current = pathname;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setTimeout(() => setVisible(false), 0);
      return;
    }

    if (!startedBeforeNavigation) startRouteTransition();
    finishRouteTransition();
  }, [finishRouteTransition, pathname, startRouteTransition]);

  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      const target =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(target instanceof HTMLAnchorElement) ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      )
        return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      startRouteTransition(url.pathname);
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [startRouteTransition]);

  useEffect(() => {
    const handleProgrammaticNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ pathname?: unknown }>).detail;
      const nextPathname =
        typeof detail?.pathname === "string" ? detail.pathname : undefined;
      startRouteTransition(nextPathname);
    };

    window.addEventListener(
      BASIS_ROUTE_TRANSITION_EVENT,
      handleProgrammaticNavigation,
    );
    return () =>
      window.removeEventListener(
        BASIS_ROUTE_TRANSITION_EVENT,
        handleProgrammaticNavigation,
      );
  }, [startRouteTransition]);

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
      className={`basis-transition basis-transition--${phase}${leaving ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Basis"
    >
      <div className="basis-transition__grid" aria-hidden="true">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#94a3b8"
          gridScale={0.1}
          scanColor="#06B6D4"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
          lineJitter={0.1}
          scanGlow={0.5}
          scanSoftness={2}
          enableWebcam={false}
          showPreview={false}
        />
      </div>
      <div className="basis-transition__content">
        <div
          className="basis-transition__mark"
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "4px",
            fontSize: "24px",
          }}
        >
          <span>ba</span>
          <img
            src="/logo.png"
            alt="/"
            className="basis-transition__slash"
            style={{ width: "auto", height: "32px" }}
          />
          <span>sis</span>
        </div>
        <div
          className="text-stock font-mono text-[11px] tracking-[0.2em] uppercase text-center animate-glitch-blue"
          style={{ marginTop: "-20px", marginBottom: "16px" }}
        >
          Analytics
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
