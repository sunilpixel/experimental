"use client";

import { useEffect } from "react";
import { initSmoothScroll } from "@/lib/lenis";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * Boots Lenis + the GSAP ticker bridge exactly once, and keeps ScrollTrigger
 * honest across late-loading fonts/images and viewport resizes (mobile URL bar
 * included — that is what --vh is for).
 */
export default function SmoothScroll() {
  useEffect(() => {
    const teardown = initSmoothScroll();

    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setVh();

    // Only refresh on a real width change; mobile chrome collapsing the URL bar
    // fires resize constantly and would otherwise thrash every pinned section.
    let lastWidth = window.innerWidth;
    let raf = 0;
    const onResize = () => {
      // --vh must be rewritten ONLY alongside a refresh. Every .pin-stage is
      // height:calc(var(--vh)*100), so updating it on a URL-bar collapse (a
      // resize with unchanged width) silently changes every pinned stage's
      // height while its pin-spacer, start and end stay stale — the next
      // chapter shows through the pin and all later offsets drift.
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      setVh();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // Fonts change line-box heights, which changes every pin distance.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    // Land at the top on refresh rather than mid-timeline.
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("load", onLoad);
      cancelAnimationFrame(raf);
      teardown();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return null;
}
