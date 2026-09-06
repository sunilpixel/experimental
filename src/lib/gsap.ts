"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { Observer } from "gsap/Observer";
import { Flip } from "gsap/Flip";

/* ------------------------------------------------------------------
   Single registration point. Every animation module imports from here
   so plugins are guaranteed registered exactly once.
------------------------------------------------------------------ */

let registered = false;

if (!registered && typeof window !== "undefined") {
  gsap.registerPlugin(
    ScrollTrigger,
    SplitText,
    MotionPathPlugin,
    DrawSVGPlugin,
    CustomEase,
    Observer,
    Flip,
  );

  /* Signature eases — used everywhere so motion feels like one hand made it. */
  CustomEase.create("aurum", "M0,0 C0.14,0 0.09,1 1,1"); // heavy, expensive settle
  CustomEase.create("aurumIn", "M0,0 C0.6,0 0.9,0.3 1,1"); // weighted departure
  CustomEase.create("curtain", "M0,0 C0.3,0 0,1 1,1"); // mask / clip reveals
  CustomEase.create("cine", "M0,0 C0.83,0 0.17,1 1,1"); // camera move

  gsap.defaults({ ease: "aurum", duration: 1.2 });

  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });

  ScrollTrigger.normalizeScroll(false);

  registered = true;

  /* Dev-only handle so scripts/probe-*.mjs can interrogate live triggers in a
     real browser. Stripped from production builds. */
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).ScrollTrigger = ScrollTrigger;
    (window as unknown as Record<string, unknown>).gsap = gsap;
  }
}

/* ------------------------------------------------------------------
   Shared helpers
------------------------------------------------------------------ */

/** Scoped selector for a section root. Every animation module uses this. */
export const scoped = (root: Element) => gsap.utils.selector(root);

/**
 * Hand GSAP the resting transforms that the TSX declared inline.
 *
 * Sections declare hidden resting states as inline CSS — `translateY(112%)`
 * inside an overflow-hidden mask — so nothing flashes before hydration. But
 * GSAP reads an element's existing transform out of the COMPUTED MATRIX, where
 * a percentage translate has already been resolved to pixels. It therefore
 * caches `y: 65.7px`, and a later `yPercent: 112 -> 0` tween lands on
 * `yPercent 0` while that pixel offset is still applied — the element stays
 * parked outside its mask and the chapter renders blank.
 *
 * Parsing the inline string ourselves and re-setting it as real GSAP props
 * (yPercent/y, rotationX/Y, z, scale) is visually identical but leaves GSAP's
 * cache correct, so reveals actually land at zero. Call once per section root
 * before building any timeline.
 */
export function adoptRestingTransforms(root: Element) {
  const nodes = root.querySelectorAll<HTMLElement>('[style*="translate"], [style*="rotate"]');
  nodes.forEach((el) => {
    const t = el.style.transform;
    if (!t) return;

    const vars: gsap.TweenVars = {};
    let touched = false;

    const yPct = /translateY\(\s*(-?[\d.]+)%\s*\)/.exec(t);
    if (yPct) {
      vars.yPercent = parseFloat(yPct[1]);
      vars.y = 0;
      touched = true;
    }
    const xPct = /translateX\(\s*(-?[\d.]+)%\s*\)/.exec(t);
    if (xPct) {
      vars.xPercent = parseFloat(xPct[1]);
      vars.x = 0;
      touched = true;
    }
    const z = /translateZ\(\s*(-?[\d.]+)px\s*\)/.exec(t);
    if (z) {
      vars.z = parseFloat(z[1]);
      touched = true;
    }
    const rx = /rotateX\(\s*(-?[\d.]+)deg\s*\)/.exec(t);
    if (rx) {
      vars.rotationX = parseFloat(rx[1]);
      touched = true;
    }
    const ry = /rotateY\(\s*(-?[\d.]+)deg\s*\)/.exec(t);
    if (ry) {
      vars.rotationY = parseFloat(ry[1]);
      touched = true;
    }
    const sc = /(?:^|\s)scale\(\s*(-?[\d.]+)\s*\)/.exec(t);
    if (sc) {
      vars.scale = parseFloat(sc[1]);
      touched = true;
    }

    if (touched) gsap.set(el, vars);
  });
}


/**
 * Restore CSS custom properties the TSX declared inline.
 *
 * GSAP removes a custom property it has tweened when its timeline is reverted,
 * and React does not put it back — it reuses the same DOM node and its props
 * have not changed. An inline `clip-path: ellipse(calc(var(--fx) * 1%) ...)`
 * then resolves against an undefined var, computes to 0, and the entire frame
 * is clipped away: the chapter renders black.
 *
 * Written straight to the element rather than through gsap.set(), which does
 * not reliably re-add a custom property it believes it already owns.
 */
export function restoreVars(
  els: Element | Element[] | ArrayLike<Element>,
  vars: Record<string, string | number>,
) {
  const list = "length" in els ? Array.from(els as ArrayLike<Element>) : [els as Element];
  for (const el of list) {
    if (!(el instanceof HTMLElement)) continue;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, String(v));
  }
}

/** Media query strings shared by every section's matchMedia. */
export const MQ = {
  desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  tablet:
    "(min-width: 768px) and (max-width: 1023px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
  /** desktop + tablet, i.e. anything wide enough to pin comfortably */
  wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
} as const;

/**
 * Splits an element into chars/words/lines and returns the SplitText instance.
 * Always revert() in cleanup — matchMedia does this for us when created inside.
 *
 * autoSplit is deliberately OFF. It re-splits on font-load/resize, which swaps
 * out the very elements our scrubbed timelines already hold references to —
 * the tweens would keep animating detached nodes and the headline would stay
 * invisible. <SmoothScroll/> refreshes ScrollTrigger on fonts.ready instead,
 * which fixes the measurements without touching the DOM the timelines own.
 */
export function split(
  target: Element | Element[] | string,
  type: "chars" | "words" | "lines" | "words,chars" | "lines,words" = "chars",
) {
  return SplitText.create(target, {
    type,
    charsClass: "split-char",
    wordsClass: "split-word",
    linesClass: "split-line",
    mask: type.includes("lines") ? "lines" : undefined,
    // Keep the original string on the parent for screen readers.
    aria: "auto",
    autoSplit: false,
  });
}

/** Broadcast the active navigation tone so the fixed chrome can invert. */
export function setNavTone(tone: "light" | "dark") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("aurum:navtone", { detail: { tone } }));
}

/** Broadcast active chapter index (0-based) to the vertical timeline. */
export function setChapter(index: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("aurum:chapter", { detail: { index } }));
}

export { gsap, ScrollTrigger, SplitText, MotionPathPlugin, DrawSVGPlugin, CustomEase, Observer, Flip };
