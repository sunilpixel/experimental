"use client";

import { useRef, useState } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import { gsap, ScrollTrigger, MQ } from "@/lib/gsap";
import { startScroll, stopScroll } from "@/lib/lenis";
import { CHAPTERS } from "@/lib/chapters";

/**
 * AURUM — THE APERTURE
 *
 * A title card, not a progress screen. Ink ground, the wordmark set in the
 * house Didone, a single gold rule that draws itself as the page loads, and a
 * counter that behaves like a film leader. When it completes, the panel does
 * not fade: it opens. Two halves part from the rule and sweep off the top and
 * bottom edges, revealing the hero already in place behind them.
 *
 * Nothing here waits on an image — the loader paints on the very first frame.
 *
 * Contract the rest of the app depends on, in this order:
 *   documentElement[data-aurum-loaded] -> startScroll() -> "aurum:loaded"
 *   -> ScrollTrigger.refresh()
 * Hero's overture and the Navigation entrance are both gated on that event.
 */

/** Survives client-side navigation: the overture plays once per page life. */
let preloaderComplete = false;

const LETTERS = ["A", "U", "R", "U", "M"];

export default function Preloader() {
  const [gone, setGone] = useState(() => preloaderComplete);

  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const chapter = useRef<HTMLSpanElement>(null);
  const wordmark = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    if (preloaderComplete) return;

    const el = root.current;
    if (!el) return;

    // A plain proxy, so killTweensOf() on the DOM refs would never cover it.
    const progress = { v: 0 };
    const timers: number[] = [];
    const listeners: Array<() => void> = [];
    let exitTl: gsap.core.Timeline | null = null;
    let finished = false;

    /** The one path out. Idempotent, and reachable from every failure mode. */
    const finish = () => {
      if (finished) return;
      finished = true;
      preloaderComplete = true;
      try {
        document.documentElement.setAttribute("data-aurum-loaded", "true");
        startScroll();
        window.dispatchEvent(new CustomEvent("aurum:loaded"));
        ScrollTrigger.refresh();
      } catch {
        /* never let a listener error strand the panel on screen */
      }
      setGone(true);
    };

    try {
      stopScroll();

      /* ---- reduced motion: show one frame, then leave ------------------- */
      if (window.matchMedia(MQ.reduced).matches) {
        timers.push(window.setTimeout(finish, 60));
        return () => timers.forEach((t) => window.clearTimeout(t));
      }

      const letters = gsap.utils.toArray<HTMLElement>(".pl-letter");

      /* ---- entrance: the wordmark sets itself, the rule draws ----------- */
      const intro = gsap.timeline();
      intro
        .fromTo(
          letters,
          { yPercent: 116, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.1, ease: "aurum", stagger: 0.075 },
          0,
        )
        .fromTo(
          rule.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.4, ease: "curtain" },
          0.25,
        )
        .fromTo(
          [counter.current, chapter.current],
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.9, ease: "aurum", stagger: 0.08 },
          0.5,
        );

      /* ---- the counter, driven by a tween rather than an interval ------- */
      const paint = () => {
        const v = progress.v;
        if (counter.current) {
          counter.current.textContent = String(Math.round(v)).padStart(3, "0");
        }
        if (chapter.current) {
          const i = Math.min(
            CHAPTERS.length - 1,
            Math.floor((v / 100) * CHAPTERS.length),
          );
          const next = CHAPTERS[i].label.join(" ");
          if (chapter.current.textContent !== next) {
            chapter.current.textContent = next;
            gsap.fromTo(
              chapter.current,
              { opacity: 0, x: -10 },
              { opacity: 1, x: 0, duration: 0.5, ease: "aurum" },
            );
          }
        }
      };

      /* ---- exit: the panel parts along the rule ------------------------- */
      const runOut = () => {
        exitTl = gsap.timeline({ onComplete: finish });
        exitTl
          .to([wordmark.current, counter.current, chapter.current], {
            opacity: 0,
            y: -16,
            duration: 0.5,
            ease: "aurumIn",
            stagger: 0.04,
          })
          .to(rule.current, { scaleX: 0, duration: 0.5, ease: "aurumIn" }, 0.15)
          // Two halves sweep off opposite edges — the frame opens, never fades.
          .to(
            top.current,
            { yPercent: -100, duration: 1.15, ease: "curtain" },
            0.35,
          )
          .to(
            bottom.current,
            { yPercent: 100, duration: 1.15, ease: "curtain" },
            0.35,
          );
      };

      /* ---- run to 90, then wait for the document, capped ---------------- */
      let documentReady = document.readyState === "complete";
      let introDone = false;

      const maybeComplete = () => {
        if (!introDone || !documentReady) return;
        gsap.to(progress, {
          v: 100,
          duration: 0.5,
          ease: "aurum",
          onUpdate: paint,
          onComplete: runOut,
        });
      };

      gsap.to(progress, {
        v: 90,
        duration: 1.6,
        ease: "aurum",
        onUpdate: paint,
        onComplete: () => {
          introDone = true;
          maybeComplete();
        },
      });

      if (!documentReady) {
        const markReady = () => {
          documentReady = true;
          maybeComplete();
        };
        window.addEventListener("load", markReady, { once: true });
        listeners.push(() => window.removeEventListener("load", markReady));
        timers.push(window.setTimeout(markReady, 3500));
      }

      // Hard ceiling: whatever happens, the panel leaves.
      timers.push(window.setTimeout(finish, 7000));
    } catch {
      finish();
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      listeners.forEach((fn) => fn());
      gsap.killTweensOf(progress);
      exitTl?.kill();
      gsap.killTweensOf([
        root.current,
        top.current,
        bottom.current,
        rule.current,
        counter.current,
        chapter.current,
        wordmark.current,
      ]);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
    >
      {/* Two ink halves that will part along the rule. */}
      <div
        ref={top}
        className="absolute inset-x-0 top-0 h-1/2 bg-ink"
        style={{ willChange: "transform" }}
      />
      <div
        ref={bottom}
        className="absolute inset-x-0 bottom-0 h-1/2 bg-ink"
        style={{ willChange: "transform" }}
      />

      {/* Everything below rides above both halves and leaves before they do. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div ref={wordmark} className="flex items-baseline">
          {LETTERS.map((c, i) => (
            <span
              key={i}
              className="mask-line block overflow-hidden"
              style={{ lineHeight: 1 }}
            >
              <span
                className="pl-letter u-display block text-ivory"
                /* No inline translateY here. GSAP reads an existing percentage
                   translate out of the computed matrix as an absolute pixel y,
                   so a later yPercent -> 0 tween lands on yPercent 0 with that
                   pixel offset still applied and the letter never arrives. The
                   fromTo below sets the hidden state itself, before first paint,
                   and the panel is opaque ink regardless. */
                style={{
                  fontSize: "clamp(2.2rem, 6vw, 5rem)",
                  letterSpacing: "0.34em",
                  opacity: 0,
                }}
              >
                {c}
              </span>
            </span>
          ))}
        </div>

        {/* The rule the panel will split along. */}
        <span
          ref={rule}
          className="mt-[3.2vh] block h-px w-[min(46vw,30rem)] origin-center"
          style={{
            background:
              "linear-gradient(90deg, transparent, #c8a76a 18%, #c8a76a 82%, transparent)",
            transform: "scaleX(0)",
          }}
        />
      </div>

      {/* Film-leader meta, pinned to the frame corners. */}
      <span
        ref={chapter}
        className="u-eyebrow absolute bottom-[5vh] left-[6vw] text-bone/55"
        style={{ opacity: 0 }}
      >
        {CHAPTERS[0].label.join(" ")}
      </span>
      <span
        ref={counter}
        className="u-display absolute bottom-[4vh] right-[6vw] text-ivory/80"
        style={{
          fontSize: "clamp(1.6rem, 4vw, 3rem)",
          letterSpacing: "0.12em",
          opacity: 0,
        }}
      >
        000
      </span>
    </div>
  );
}
