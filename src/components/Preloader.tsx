"use client";
// @refresh reset
//   Fast Refresh re-evaluates this module — resetting `preloaderComplete` — and
//   re-fires the empty-dependency layout effect on every edit, which would
//   replay the whole overture over a live page mid-session. Dev-only.

import { useRef, useState } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import { gsap, ScrollTrigger, MQ, scoped } from "@/lib/gsap";
import { startScroll, stopScroll } from "@/lib/lenis";

/**
 * AURUM — THE COLUMN CURTAIN
 *
 * Five ink columns stand across the frame, one to a letter of A U R U M. They
 * are not decoration: the wordmark IS the column grid, so a column can only
 * ever uncover its own letter. As the count climbs each column lifts away in
 * turn and leaves its letter standing on the ground behind it — the loader
 * spends the wait revealing the brand one stroke at a time rather than holding
 * a finished card. When the last column goes, the gold rule draws under the
 * whole word; then the letters are swallowed back up into their own masks and
 * the ground lifts after the columns, off the hero.
 *
 * Direction is the grammar: everything this curtain does, it does UPWARD, and
 * that costs the handoff something. A rising ground uncovers the frame from the
 * foot up, so the masthead band is the LAST strip to clear and the contract
 * cannot fire until it has — see `handoffAt`, which is derived from the rise,
 * not chosen.
 *
 * Real depth, no renderer: one perspective, two preserve-3d nodes that paint
 * nothing, and every other element a flat plane posed in Z. Nothing here waits
 * on an image, a font or a measurement — frame one is five opaque ink columns
 * plus type, and it promotes nothing.
 *
 * Contract the rest of the app depends on, in this order:
 *   startScroll() -> ScrollTrigger.refresh()                (at the hold, prime())
 *   documentElement[data-aurum-loaded] -> "aurum:loaded"    (mid-exit, handoff())
 * Hero's overture, the Navigation entrance and ChapterProgress are all gated on
 * that event. It fires as the ground clears the masthead — see `handoffAt`.
 */

/** Survives client-side navigation: the overture plays once per page life. */
let preloaderComplete = false;

/**
 * One letter per column, in order. Unlike the aperture there are no per-letter
 * box widths here: `.pl-cell` is `flex: 1 1 0`, so the cells and the columns
 * are the same grid by construction and no advance table can drift out of sync
 * with the display face.
 */
const LETTERS = ["A", "U", "R", "U", "M"] as const;

/**
 * Per-breakpoint choreography — redesigns, not scale factors. Every Z is a
 * fraction of P, the stage's own perspective, read once per branch, so the
 * projected scale of every plane is identical on every viewport and the
 * z <= 0.40*P ceiling (past which the projection tears) holds by construction.
 */
type Cfg = {
  camIn: number;
  camOut: number;
  /** The word stands behind the curtain; the chrome floats in front of it. */
  wordZ: number;
  wordOut: number;
  chromeIn: number;
  chromeZ: number;
  chromeOut: number;
  /** Where inside the scrubbed settle each successive column starts to lift. */
  colStep: number;
  /** How long one column takes to clear, in the same 0-1 settle units. */
  colFall: number;
  /** Degrees a column tips from its own foot as it rises. */
  colTip: number;
  pointer: boolean;
  /** Exit wall clock. */
  out: number;
  /** Where inside the exit the contract fires — DERIVED, see handoff(). */
  handoffAt: number;
};

const DESKTOP: Cfg = {
  camIn: -0.075, camOut: 0.052,
  wordZ: -0.034, wordOut: -0.12,
  chromeIn: 0.058, chromeZ: 0.024, chromeOut: 0.072,
  colStep: 0.12, colFall: 0.34, colTip: 9,
  pointer: true, out: 1.52, handoffAt: 1.0,
};

const TABLET: Cfg = {
  camIn: -0.064, camOut: 0.044,
  wordZ: -0.028, wordOut: -0.104,
  chromeIn: 0.05, chromeZ: 0.02, chromeOut: 0.062,
  colStep: 0.12, colFall: 0.34, colTip: 7,
  pointer: false, out: 1.46, handoffAt: 0.98,
};

/* The phone's chrome is flat: everything settles at z 0. Depth is carried
   entirely by the rising columns and the wordmark's own Z — which is also the
   layer budget speaking, five columns being the whole promotion cost. */
const MOBILE: Cfg = {
  camIn: -0.046, camOut: 0.024,
  wordZ: -0.02, wordOut: -0.07,
  chromeIn: 0.03, chromeZ: 0, chromeOut: 0.038,
  colStep: 0.13, colFall: 0.32, colTip: 5,
  pointer: false, out: 1.4, handoffAt: 0.94,
};

export default function Preloader() {
  const [gone, setGone] = useState(() => preloaderComplete);

  const root = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const markHair = useRef<HTMLSpanElement>(null);
  const counterPlane = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const yearPlane = useRef<HTMLDivElement>(null);
  const year = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    if (preloaderComplete) {
      // Strict Mode's dev remount resets <html> to the attributes React manages
      // from JSX, clearing the one finish() set. Re-assert it, or a consumer
      // rebuilt after the event fired arms a listener for it and never plays.
      document.documentElement.setAttribute("data-aurum-loaded", "true");
      return;
    }

    const el = root.current;
    if (!el) return;

    const q = scoped(el);

    /* A plain proxy, so killTweensOf() on the DOM refs would never cover it. */
    const progress = { v: 0 };
    const timers: number[] = [];
    const listeners: Array<() => void> = [];

    let mm: gsap.MatchMedia | null = null;
    let intro: gsap.core.Timeline | null = null;
    let settle: gsap.core.Timeline | null = null;
    let exitTl: gsap.core.Timeline | null = null;
    let buildExit: ((onDone: () => void) => gsap.core.Timeline | null) | null = null;
    let raf = 0;

    /* Five latches. Fusing any two of them is the easiest way to break this. */
    let primed = false; //   scroll live and the site measured   -> early (the hold)
    let handed = false; //   contract dispatched                 -> early (mid-exit)
    let snapped = false; //  composition resolved and integral   -> at v >= 90
    let exiting = false; //  the exit is running
    let finished = false; // panel gone, never touch a ref again -> last

    let armed = false; //    pointer parallax, only during the settle
    let introDone = false;
    let outbound = false;
    let documentReady = document.readyState === "complete";
    let heroReady = false;
    let lastN = -1;

    /** GSAP throws on a null target, and React detaches every ref in here the
     *  moment finish() flips `gone`. Nothing is handed to a tween unfiltered. */
    const alive = (...els: Array<Element | null>) =>
      els.filter((e): e is Element => e !== null);

    /** Everything that is ever promoted. Promotion is issued from JS after the
     *  first paint and dropped again the moment the composition comes to rest —
     *  .will-t / .will-anim in the markup would promote in the SERVER HTML, on
     *  the one frame that must cost nothing. */
    const promotable = () =>
      alive(
        camera.current,
        tilt.current,
        word.current,
        counterPlane.current,
        yearPlane.current,
        ...(q(".pl-col") as HTMLElement[]),
      );

    /** The one forced synchronous layout in the panel's life. Called at the
     *  hold — the settle finished and paused, the tilt disarmed, will-change
     *  off every node, nothing animating — where re-measuring every pinned
     *  trigger on the site cannot drop a frame anybody can see. Never inside
     *  the exit: that is hundreds of ms of layout 60ms before the ground falls. */
    const prime = () => {
      if (primed) return;
      primed = true;
      startScroll(); // ahead of the refresh: keeps globals.css's
                     // .lenis-stopped overflow invariant in the right order
      ScrollTrigger.refresh();
    };

    /** What the rest of the app is gated on. Fires MID-EXIT, once the falling
     *  ground has uncovered the masthead band, so Navigation's 1.6s entrance
     *  and the hero's overture play through the opening instead of onto a bare
     *  screen after it. Idempotent; the order below IS the contract, and the
     *  attribute must lead the event — all three consumers only arm a listener
     *  in their `else` branch. */
    const handoff = () => {
      if (handed) return;
      handed = true;
      try {
        prime();
        document.documentElement.setAttribute("data-aurum-loaded", "true");
        window.dispatchEvent(new CustomEvent("aurum:loaded"));
      } catch {
        /* never let a listener error strand the panel on screen */
      }
    };

    /**
     * GSAP's default lag smoothing is lagSmoothing(500, 33): when a frame takes
     * longer than 500ms it advances the clock by 33ms instead of the real
     * elapsed time, so a janky frame costs animation progress rather than
     * dropping it.
     *
     * That is the right default for the scroll work later on and exactly the
     * wrong one HERE. First load is the jankiest window in the page's life —
     * hydration, font swap and the image decodes all land inside the overture —
     * and measured on this machine it is 8 long tasks, ~1.9s of them, the worst
     * a single 713ms block. Every one of those was being deducted from the
     * overture's clock: the document was ready at 1.25s and the panel did not
     * leave until 5.4s, most of it spent with the curtain half-fallen, which
     * reads as a hung loader rather than a slow one.
     *
     * Off, the sequence keeps its authored clock and a long task costs a jump
     * instead of seconds of crawl. Restored on the one path out — this is a
     * global on the ticker, and the rest of the site wants the default back.
     */
    const restoreLagSmoothing = () => gsap.ticker.lagSmoothing(500, 33);
    gsap.ticker.lagSmoothing(0);

    /** The one path out. Idempotent, and reachable from every failure mode. */
    const finish = () => {
      if (finished) return;
      finished = true;
      restoreLagSmoothing();
      preloaderComplete = true;
      handoff(); // covers reduced motion, the hard ceiling and the catch
      // Late, never at the handoff: keyed off data-aurum-loaded this would
      // switch a 4x-viewport mix-blend-mode layer back on mid-fall.
      document.documentElement.removeAttribute("data-aurum-loading");
      setGone(true); // last, outside every try: React detaches every ref here
    };

    try {
      stopScroll();
      document.documentElement.setAttribute("data-aurum-loading", "true");

      /* ---- reduced motion: the finished card, held for one beat ---------
       * The composed state is asserted in pure CSS, so it is correct on the
       * first painted frame rather than after hydration. No timelines, no
       * listeners, no promotion — and the columns are shown FALLEN rather than
       * removed: reduced motion asks for no motion, not for no design. */
      if (window.matchMedia(MQ.reduced).matches) {
        timers.push(window.setTimeout(finish, 60));
        return () => {
          timers.forEach((t) => window.clearTimeout(t));
          document.documentElement.removeAttribute("data-aurum-loading");
        };
      }

      /* ---- the counter, which also scrubs the curtain ------------------- */
      const paint = () => {
        if (finished || exiting) return;
        const n = Math.round(progress.v);
        if (n !== lastN) {
          lastN = n;
          if (counter.current) {
            counter.current.textContent = String(n).padStart(3, "0");
          }
        }
        // /90, not /100: the last column clears and the rule closes at the
        // moment the loader reaches its hold, so the last ten counts always
        // play over a finished, dead-still title card — 0.45s on a fast load,
        // longer on a slow one, never zero. Number and curtain are one clock
        // and cannot desync, which is the entire premise of this composition.
        settle?.progress(progress.v < 90 ? progress.v / 90 : 1);
      };

      const runOut = () => {
        // The hard ceiling runs on setTimeout, which keeps counting in a
        // backgrounded tab while GSAP's rAF ticker is frozen; the progress
        // tween can resume and land here with every ref already detached.
        if (finished || exiting) return;
        const tl = buildExit?.(finish);
        if (!tl) {
          finish();
          return;
        }
        exiting = true;
        exitTl = tl;
      };

      const maybeComplete = () => {
        if (outbound || !introDone || !documentReady || !heroReady) return;
        outbound = true;
        prime(); // the hold: the one quiet window wide enough to measure in
        gsap.to(progress, {
          v: 100,
          duration: 0.45,
          ease: "aurum",
          onUpdate: paint,
          onComplete: runOut,
        });
      };

      /**
       * The hero's own photograph, DECODED — not merely loaded.
       *
       * window.load fires when the bytes have arrived; the browser has still to
       * decode a 4K WebP on the main thread before it can paint a single pixel
       * of it. Gating the exit on `load` alone lifted the ground off an <img>
       * that had nothing to show yet, so the hero came up black and the
       * photograph snapped in a beat later — the flash. decode() is the only
       * thing that actually promises a paintable frame.
       *
       * Capped hard: a slow, broken or missing hero image must delay the panel,
       * never strand it. Every exit from here is idempotent.
       */
      const armHero = () => {
        const done = () => {
          if (heroReady) return;
          heroReady = true;
          maybeComplete();
        };
        const img = document.querySelector<HTMLImageElement>("#hero img");
        if (!img) {
          done();
          return;
        }
        const decode = () => void img.decode().then(done).catch(done);
        if (img.complete) decode();
        else {
          img.addEventListener("load", decode, { once: true });
          img.addEventListener("error", done, { once: true });
          listeners.push(() => {
            img.removeEventListener("load", decode);
            img.removeEventListener("error", done);
          });
        }
        timers.push(window.setTimeout(done, 2200));
      };
      armHero();

      const build = (cfg: Cfg): (() => void) | void => {
        if (finished) return;
        // mm.revert() has already killed the exit timeline and with it its
        // onComplete, so a crossing mid-exit must take the exit now rather
        // than strand the panel on screen.
        if (exiting) {
          finish();
          return;
        }

        const stageEl = stage.current;
        if (!stageEl) return;

        /* THE one style read of the panel's life. */
        const P = parseFloat(getComputedStyle(stageEl).perspective) || 1800;

        const glyphs = q(".pl-glyph");
        const cols = q(".pl-col") as HTMLElement[];

        /* GSAP owns the transform cache from here. The inline transforms exist
           only so the server HTML paints the right first frame, and every
           numeric argument in them is a var() GSAP would have to re-parse —
           asserting them here in absolute px is what keeps the two in step. */
        gsap.set(alive(camera.current), { z: cfg.camIn * P, rotationX: 1.2 });
        gsap.set(alive(tilt.current), { rotationX: 0, rotationY: 0 });
        gsap.set(alive(word.current), { z: cfg.wordZ * P });
        gsap.set(cols, { yPercent: 0, rotationX: 0 });
        gsap.set(alive(counterPlane.current), { z: cfg.chromeIn * P, y: 14 });
        gsap.set(alive(yearPlane.current), { z: cfg.chromeIn * P, y: 10 });

        const applyRest = () => {
          gsap.set(alive(camera.current), { z: 0, rotationX: 0 });
          gsap.set(alive(tilt.current), { rotationX: 0, rotationY: 0 });
          gsap.set(alive(word.current), { z: cfg.wordZ * P });
          gsap.set(cols, { yPercent: -112, rotationX: -cfg.colTip });
          gsap.set(glyphs, { yPercent: 0 });
          gsap.set(alive(rule.current), { scaleX: 1 });
          gsap.set(alive(counterPlane.current), { z: cfg.chromeZ * P, y: 0 });
          gsap.set(alive(counter.current), { opacity: 1 });
          gsap.set(alive(yearPlane.current), { z: cfg.chromeZ * P, y: 0 });
          gsap.set(alive(year.current), { opacity: 1 });
          gsap.set(alive(mark.current), { opacity: 1, y: 0 });
          gsap.set(alive(markHair.current), { scaleY: 1 });
          gsap.set(promotable(), { willChange: "auto" });
        };

        /* ---- A · ENTRANCE — wall clock, ~1.2s ------------------------------
         * Only the chrome, and only its POSITION. Nothing fades in: the type is
         * already painted in the server HTML (see the render), so the entrance
         * is the chrome settling forward out of depth onto a card that was
         * never blank. The word is not here — the curtain reveals it. */
        intro = gsap.timeline({ paused: true });
        intro
          .fromTo(
            alive(counterPlane.current),
            { z: cfg.chromeIn * P, y: 14 },
            { z: cfg.chromeZ * P, y: 0, duration: 0.9, ease: "aurum", force3D: true },
            0,
          )
          .fromTo(
            alive(mark.current),
            { y: 12 },
            { y: 0, duration: 0.76, ease: "aurum" },
            0.06,
          )
          .fromTo(
            alive(markHair.current),
            { scaleY: 0 },
            { scaleY: 1, duration: 0.72, ease: "curtain", transformOrigin: "50% 0%" },
            0.12,
          )
          .fromTo(
            alive(yearPlane.current),
            { z: cfg.chromeIn * P, y: 10 },
            { z: cfg.chromeZ * P, y: 0, duration: 0.82, ease: "aurum", force3D: true },
            0.18,
          );

        /* ---- B · THE CURTAIN — normalised, scrubbed by the counter --------
         * ease:"none" is the house convention for every scrubbed timeline, and
         * it matters here: the progress tween already carries "aurum", and a
         * second front-loaded ease inside would leave nothing for the last
         * beat. The five falls are laid out by hand rather than with a stagger
         * so the last column is guaranteed to CLEAR inside the timeline — a
         * stagger that overran would leave a column standing at v=90 and the
         * card would resolve with a letter still hidden. */
        settle = gsap.timeline({
          paused: true,
          defaults: { ease: "none", immediateRender: false },
        });
        settle.fromTo(
          alive(camera.current),
          { z: cfg.camIn * P, rotationX: 1.2 },
          { z: 0, rotationX: 0, duration: 1, force3D: true },
          0,
        );
        cols.forEach((col, i) => {
          settle!.fromTo(
            col,
            { yPercent: 0, rotationX: 0 },
            {
              // UP, not down. -100 clears the box; the extra 12 clears the tip.
              yPercent: -112,
              rotationX: -cfg.colTip,
              duration: cfg.colFall,
              force3D: true,
            },
            i * cfg.colStep,
          );
        });
        settle.fromTo(
          alive(rule.current),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.18, ease: "curtain", transformOrigin: "left center" },
          // hard against the end, and only after the last column is down:
          // the rule is the composition closing, not another thing arriving.
          Math.min(0.82, (LETTERS.length - 1) * cfg.colStep + cfg.colFall),
        );

        /* ---- C · SNAP HOME — once, at v >= 90 ----------------------------
         * The wordmark comes to rest on integer pixels with will-change
         * dropped, so Chromium re-rasters the Didone at 1:1. A tilt left armed
         * would keep sub-degree rotation on its ancestor forever and the type
         * would never actually be sharp. */
        const onNinety = () => {
          settle?.progress(1);
          armed = false;
          gsap.killTweensOf(alive(tilt.current));
          gsap.set(alive(tilt.current), { rotationX: 0, rotationY: 0 });
          gsap.set(alive(camera.current), { z: 0, rotationX: 0 });
          gsap.set(alive(word.current), { z: cfg.wordZ * P, x: 0, y: 0 });
          gsap.set(promotable(), { willChange: "auto" });
          snapped = true;
          introDone = true;
          maybeComplete();
        };

        /* ---- E · EXIT — built on demand, from live refs ------------------- */
        buildExit = (onDone: () => void) => {
          const groundEl = ground.current;
          // This check is what proves the unfiltered ground target below.
          if (!groundEl) return null;

          const tl = gsap.timeline({
            onStart: () => {
              armed = false;
              gsap.set(promotable(), { willChange: "transform" });
              gsap.set(alive(ground.current), { willChange: "transform" });
            },
            onComplete: () => {
              gsap.set(promotable(), { willChange: "auto" });
              onDone();
              // <Preloader/> itself never unmounts — it returns null — so the
              // effect cleanup that would normally kill these does not run, and
              // three completed timelines would go on holding references to
              // detached DOM. Released here instead.
              tl.kill();
              // Reverting the matchMedia releases the intro, the settle and the
              // two cached quickTo tweens, and runs the branch's own teardown so
              // the pointermove listener goes with them.
              mm?.revert();
            },
          });

          tl
            // The chrome goes first and upward — the only thing in this panel
            // that moves against the curtain, which is what makes it read as
            // chrome leaving rather than as part of the fall.
            .to(alive(mark.current), { opacity: 0, y: -14, duration: 0.34, ease: "aurumIn" }, 0)
            .to(
              alive(markHair.current),
              { scaleY: 0, duration: 0.32, ease: "aurumIn", transformOrigin: "50% 0%" },
              0,
            )
            .to(
              alive(counterPlane.current),
              { z: cfg.chromeOut * P, y: -16, duration: 0.5, ease: "aurumIn", force3D: true },
              0.06,
            )
            .to(alive(counter.current), { opacity: 0, duration: 0.32, ease: "aurumIn" }, 0.06)
            .to(
              alive(yearPlane.current),
              { z: cfg.chromeOut * P, y: -12, duration: 0.52, ease: "aurumIn", force3D: true },
              0.1,
            )
            .to(alive(year.current), { opacity: 0, duration: 0.34, ease: "aurumIn" }, 0.1)
            .to(
              alive(rule.current),
              { scaleX: 0, duration: 0.36, ease: "aurumIn", transformOrigin: "right center" },
              0.12,
            )
            // The letters are swallowed back up into the masks they never used
            // on the way in, from the right. The brand leaves last and nearest.
            .to(
              glyphs,
              {
                yPercent: -128,
                duration: 0.5,
                ease: "aurumIn",
                stagger: { each: 0.045, from: "end" },
              },
              0.16,
            )
            .to(
              alive(word.current),
              { z: cfg.wordOut * P, duration: 0.56, ease: "aurumIn", force3D: true },
              0.16,
            )
            /* The ground leaves the way the columns did: UP. Not a fade — a
               fade dissolves the whole frame at once and uncovers the hero's
               masthead and its foot on the same beat, which reads as a cut, not
               a curtain. Rising, the frame clears from the foot upward, so the
               masthead band is the LAST thing uncovered and handoffAt has to
               sit late enough to match — see the .call() below. */
            .to(
              groundEl,
              { yPercent: -100, duration: 0.74, ease: "aurumIn", force3D: true },
              0.34,
            )
            // The dolly after it, through the opening it just made.
            .to(
              alive(camera.current),
              { z: cfg.camOut * P, rotationX: -2, duration: 0.8, ease: "cine", force3D: true },
              0.5,
            )
            /* DERIVED, not chosen: the ground rises out of frame at 0.34+0.74
               = 1.08, and the masthead band it covers is the last strip to go,
               so the contract cannot fire before then. Re-time the rise above
               and this moves with it — fire it early and Navigation's entrance
               plays behind an ink panel and is simply never seen. */
            .call(handoff, undefined, cfg.handoffAt)
            // Holds the panel (transparent, pointer-events-none) to the designed
            // wall clock so the unmount is deterministic across breakpoints.
            .to({}, { duration: cfg.out }, 0);

          return tl;
        };

        /* Only one progress tween may exist: it is created inside a rAF, so it
           is NOT captured by this matchMedia context and a crossing would
           otherwise leave the old one running against the new branch. */
        gsap.killTweensOf(progress);
        cancelAnimationFrame(raf);

        if (snapped) {
          // A crossing after the composition resolved: jump to the settled pose
          // in this branch's numbers. revert() also killed the 90->100 tween
          // along with its onComplete, so the exit has to be re-armed.
          intro.progress(1, true);
          settle?.progress(1);
          applyRest();
          outbound = false;
          maybeComplete();
        } else {
          raf = requestAnimationFrame(() => {
            // Promotion precedes animation by a frame, and the standing curtain
            // holds for ~16ms before anything moves.
            gsap.set(promotable(), { willChange: "transform" });
            intro?.play(0);
            gsap.to(progress, {
              v: 90,
              duration: 1.35,
              ease: "aurum",
              onUpdate: paint,
              onComplete: onNinety,
            });
          });
        }

        /* ---- F · POINTER PARALLAX — desktop only, armed until v=90 --------
         * On .pl-tilt alone: the settle owns rotationX on .pl-camera and the two
         * must never write the same property. Amplitudes are about half the
         * house norm because this is a held title card, not a scrolling shot,
         * and the 1.1s power3 smoothing IS the throttle. */
        if (!cfg.pointer || !tilt.current) return;

        const setY = gsap.quickTo(tilt.current, "rotationY", { duration: 1.1, ease: "power3" });
        const setX = gsap.quickTo(tilt.current, "rotationX", { duration: 1.1, ease: "power3" });
        armed = !snapped;

        const onMove = (e: PointerEvent) => {
          if (!armed) return;
          setY((e.clientX / window.innerWidth - 0.5) * 2 * 2.2);
          setX((e.clientY / window.innerHeight - 0.5) * 2 * -1.5);
        };
        window.addEventListener("pointermove", onMove, { passive: true });

        // Returned to matchMedia, never pushed to the outer array — otherwise a
        // breakpoint change leaves this dead branch's listener writing
        // transforms onto the live one.
        return () => window.removeEventListener("pointermove", onMove);
      };

      mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => build(DESKTOP));
      mm.add(MQ.tablet, () => build(TABLET));
      mm.add(MQ.mobile, () => build(MOBILE));

      /* ---- run to 90, then wait for the document, capped ---------------- */
      if (!documentReady) {
        const markReady = () => {
          documentReady = true;
          maybeComplete();
        };
        window.addEventListener("load", markReady, { once: true });
        listeners.push(() => window.removeEventListener("load", markReady));
        timers.push(window.setTimeout(markReady, 3500));
      }

      // Hard ceiling: whatever happens, the panel leaves. Deliberately calls
      // finish() and not runOut(), so it can fire mid-fall.
      //
      // 4200, not 7000. With the ticker no longer deducting jank from the
      // overture's clock the authored sequence — 1.35s to ninety, 0.45s hold,
      // ~1.4s exit — lands near 3.2s, so this is a genuine backstop rather
      // than a number the loader could quietly drift most of the way toward on
      // an ordinary first paint.
      timers.push(window.setTimeout(finish, 4200));
    } catch {
      finish();
    }

    return () => {
      cancelAnimationFrame(raf);
      // Idempotent, and finish() is not on every teardown path — an unmount
      // mid-overture must not leave the ticker's smoothing switched off for
      // the scroll work that follows.
      restoreLagSmoothing();
      timers.forEach((t) => window.clearTimeout(t));
      listeners.forEach((fn) => fn());
      gsap.killTweensOf(progress);
      exitTl?.kill();
      // Kills the intro, the settle, every glyph tween and the pointer
      // listener's teardown in one call.
      mm?.revert();
      document.documentElement.removeAttribute("data-aurum-loading");
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={root}
      id="aurum-preloader"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-9999"
    >
      {/* Flat opaque ground, a SIBLING of the stage, so the transform that
          drops it out of frame cannot flatten the 3D context above it. */}
      <div ref={ground} className="pl-ground absolute inset-0 z-0 bg-ink" />

      {/* The one perspective in the tree. Never transformed. */}
      <div ref={stage} className="pl-stage absolute inset-0 z-10">
        {/* Pointer tilt lives alone here: the settle owns rotationX on
            .pl-camera, and two tweens must never write one property. */}
        <div ref={tilt} className="pl-tilt absolute inset-0">
          <div
            ref={camera}
            className="pl-camera absolute inset-0"
            style={{ transform: "translateZ(-6vw)" }}
          >
            {/* ---- the standing word, one letter per column ----
                .pl-word is FLAT and carries the whole 3D pose. Under
                preserve-3d every 3D-posed letter would be promoted so the
                compositor could depth-sort it — five extra layers on top of
                the five columns, to buy a keystone of 1.01. */}
            <div ref={word} className="pl-word z-1" style={{ transform: "translateZ(-3vw)" }}>
              {LETTERS.map((c, i) => (
                <span key={i} className="pl-cell">
                  {/* The mask is for the EXIT only. On the way in the column
                      in front is what hides the glyph, so nothing here rests
                      on a percentage transform that would have to survive
                      hydration — the aperture's one reason to call
                      adoptRestingTransforms is gone with it. */}
                  <span className="pl-letter">
                    <span className="pl-glyph u-display block text-ivory">{c}</span>
                  </span>
                </span>
              ))}
            </div>

            {/* ---- the rule: drawn under the whole word as the last column
                    clears, so it reads as the composition closing ---- */}
            <div className="pl-rule-plane z-1">
              <span
                ref={rule}
                className="pl-rule gold-rule block"
                style={{ transform: "scaleX(0)" }}
              />
            </div>

            {/* ---- the curtain: five columns, standing ----
                Between the word and the chrome in Z. Each column is exactly
                one .pl-cell wide because both are `flex: 1 1 0` on the same
                axis — the reveal is a property of the layout, not of a number
                anybody has to keep in sync. */}
            <div className="pl-curtain z-2">
              {LETTERS.map((_, i) => (
                <span key={i} className="pl-col" />
              ))}
            </div>

            {/* ---- corner mark: IN FRONT of the curtain, so it is legible
                    from frame one. Across the handoff it holds position and
                    only the numeral changes, 00 -> 01. ---- */}
            {/* No inline opacity:0 anywhere in this block. The server HTML is
                the only thing on screen until React hydrates — on this page
                that is seconds, not frames — and a card that hides its own
                type until a timeline runs is a blank screen for all of it.
                The curtain, the mark, the count and the year are all painted
                on frame one; the intro moves them, it does not reveal them. */}
            <div ref={mark} className="pl-mark z-3">
              <span className="pl-mark-num u-display block text-gold">00</span>
              <span
                ref={markHair}
                className="pl-mark-hair hairline-v block shrink-0"
                style={{ transform: "scaleY(0)" }}
              />
              {/* Hero.tsx breaks this into three lines, and the mark only reads
                  as one continuous element across the handoff if the break
                  matches. Kept in sync by hand, as Hero keeps it — CHAPTERS'
                  two-line label is the vertical timeline's, and re-wrapping it
                  here would twitch. */}
              <span className="pl-mark-eyebrow u-eyebrow block text-bone/70">
                A NEW
                <br />
                DIMENSION
                <br />
                OF LUXURY
              </span>
            </div>

            {/* ---- the count, on the word's own centre line ---- */}
            <div ref={counterPlane} className="pl-plane pl-plane-counter z-3">
              <span ref={counter} className="pl-counter-inner u-display block text-ivory/75">
                000
              </span>
            </div>

            {/* ---- the year, under the rule on the same left rail as the
                    mark: the two ends of the same column of chrome ---- */}
            <div ref={yearPlane} className="pl-plane pl-plane-year z-3">
              <span ref={year} className="pl-year-inner u-display block text-gold-deep">
                MMXXVI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
