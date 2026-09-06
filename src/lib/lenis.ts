"use client";

import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

let lenis: Lenis | null = null;

/**
 * Boots Lenis and wires it into GSAP's ticker.
 *
 * Lenis 1.x drives the real document scroll position, so ScrollTrigger reads it
 * natively — no scrollerProxy. All we owe it is an update on every Lenis frame
 * and a single rAF loop shared with GSAP.
 *
 * Returns a teardown fn. Called once from <SmoothScroll/>.
 */
export function initSmoothScroll(): () => void {
  if (typeof window === "undefined") return () => {};

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    // Native scrolling; ScrollTrigger still resolves every chapter's end state.
    ScrollTrigger.refresh();
    return () => {};
  }

  lenis = new Lenis({
    // lerp (not duration/easing) — a continuous glide reads heavier and more
    // cinematic than a fixed-duration ease, and it never feels game-like.
    lerp: 0.075,
    wheelMultiplier: 0.82,
    touchMultiplier: 1.35,
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    // Native touch scrolling: syncTouch fights pinned sections on mobile.
    syncTouch: false,
    autoRaf: false,
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on("scroll", onScroll);

  const raf = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  const onRefresh = () => lenis?.resize();
  ScrollTrigger.addEventListener("refresh", onRefresh);
  ScrollTrigger.refresh();

  return () => {
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    gsap.ticker.remove(raf);
    lenis?.off("scroll", onScroll);
    lenis?.destroy();
    lenis = null;
  };
}

export function getLenis() {
  return lenis;
}

export function scrollToSection(target: string | HTMLElement, offset = 0) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 2.1 });
    return;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function stopScroll() {
  lenis?.stop();
}

export function startScroll() {
  lenis?.start();
}
