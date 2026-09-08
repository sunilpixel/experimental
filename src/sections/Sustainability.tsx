"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { STATS } from "@/lib/chapters";
import { initSustainability } from "@/animations/sustainability";

/**
 * CHAPTER 05 — A BETTER TOMORROW
 *
 * Architectural, not decorative. A porcelain plane bleeds off the left edge of
 * the frame — a wall, not a floating card — and the three statistics are set as
 * monumental type directly on the photograph, hung off a drawn gold thread.
 *
 * No boxes, no glass, no blur. The luxury is the scale contrast between a 7vw
 * numeral and a 0.42em-tracked label, and the amount of air around both.
 */

/* The thread the numerals hang from. Authored inside a safe box of the viewBox
   so an xMidYMid slice crop never takes it out of frame. */
const CURVE_D = "M 505 812 C 742 742 690 556 918 486 C 1122 424 1052 236 1252 138";
const GHOST_D = "M 505 846 C 748 776 714 588 944 518 C 1148 456 1078 268 1278 170";

const HIDDEN_LINE: CSSProperties = { transform: "translateY(112%)" };

/* A descending diagonal that climbs the thread — never a row, never a grid. */
const STAT_POS = [
  "left-[44%] top-[13%]  w-[52vw] md:left-[42%] md:top-[11%] md:w-[26vw]",
  "left-[58%] top-[40%]  w-[52vw] md:left-[57%] md:top-[39%] md:w-[26vw]",
  "left-[46%] top-[67%]  w-[52vw] md:left-[45%] md:top-[67%] md:w-[26vw]",
];

/* Resting pose per numeral — GSAP animates out of these. */
const STAT_REST: CSSProperties[] = [
  { transform: "perspective(1300px) translateZ(-560px) rotateY(34deg) rotateX(10deg)" },
  { transform: "perspective(1300px) translateZ(-760px) rotateY(-38deg) rotateX(-9deg)" },
  { transform: "perspective(1300px) translateZ(-640px) rotateY(28deg) rotateX(12deg)" },
];

export default function Sustainability() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initSustainability(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="sustainability"
      data-chapter="sustainability"
      data-tone="light"
      className="chapter bg-ink"
    >
      <div
        className="sus-stage pin-stage"
        style={{ perspective: "1500px", perspectiveOrigin: "62% 50%" }}
      >
        <div
          className="sus-shell will-t absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ---------- photographic bed — always present ---------- */}
          <ImageFrame
            name="sustainability"
            className="sus-bed absolute inset-0"
            innerClassName="sus-bed-inner will-anim"
            imgClassName="object-[62%_50%]"
            sizes="100vw"
            scrim={0.08}
            cursor="scroll"
          />

          {/* A single directional wash so the numerals hold, nothing more. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-5"
            style={{
              background:
                "linear-gradient(104deg, rgba(5,6,10,0.62) 0%, rgba(5,6,10,0.14) 38%, rgba(5,6,10,0.42) 100%)",
            }}
          />

          {/* ---------- the gold thread ---------- */}
          <svg
            className="sus-svg pointer-events-none absolute inset-0 z-10 h-full w-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
            focusable="false"
          >
            <path
              className="sus-ghost text-gold-deep"
              d={GHOST_D}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.75}
              strokeLinecap="round"
              opacity={0.45}
            />
            <path
              className="sus-curve text-gold"
              d={CURVE_D}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              strokeLinecap="round"
            />
          </svg>

          {/* ---------- porcelain plane: a wall, bleeding off the left edge ---------- */}
          <div
            className="sus-card absolute inset-y-0 left-0 z-20 flex w-full flex-col justify-center bg-porcelain text-ink md:w-[38vw] lg:w-[33vw]"
            style={{ transformStyle: "preserve-3d", transformOrigin: "0% 50%" }}
          >
            {/* the one hairline that separates plane from photograph */}
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 hidden w-px bg-ink/10 md:block"
            />

            <div className="relative px-[9vw] md:px-[4vw] lg:px-[3.6vw]">
              <div className="mb-[5vh] flex items-start gap-5">
                <span className="mask-line">
                  <span
                    className="sus-line block font-display text-[0.78rem] tracking-[0.34em] text-gold-deep"
                    style={HIDDEN_LINE}
                  >
                    05
                  </span>
                </span>
                <span
                  className="sus-rule mt-[0.3rem] block h-[3.2rem] w-px origin-top bg-ink/20"
                  style={{ transform: "scaleY(0)" }}
                />
                <span className="mask-line">
                  <span className="sus-line block u-eyebrow text-ash" style={HIDDEN_LINE}>
                    A BETTER
                    <br />
                    TOMORROW
                  </span>
                </span>
              </div>

              {/*
                Sized against the COLUMN, not the viewport. The plane is
                md:38vw / lg:33vw less its own 4vw / 3.6vw gutters, so the
                text box is 30vw at md and only 25.8vw at lg. "SUSTAINABILITY"
                sets 7.96em wide in Playfair, which needs <=3.24vw at lg — the
                old flat 4vw overflowed it, and .mask-line's overflow:hidden
                clipped the word to "SUSTAINABILI" on every desktop.
                Below md the plane is full-bleed, so that size is unchanged.
              */}
              <h2
                className="u-display text-ink text-[clamp(2.1rem,7vw,3.9rem)] md:text-[3.5vw] lg:text-[clamp(1.9rem,3.1vw,3.4rem)]"
                style={{ lineHeight: 0.94 }}
              >
                {["SUSTAINABILITY", "IS A LUXURY", "TOO."].map((line, i) => (
                  <span className="mask-line" key={line}>
                    <span
                      className={`sus-head block ${i === 1 ? "text-gold-deep" : ""}`}
                      style={HIDDEN_LINE}
                    >
                      {line}
                    </span>
                  </span>
                ))}
              </h2>

              <span className="mask-line mt-[4.5vh] block">
                <span className="sus-line block u-body max-w-[33ch] text-ash" style={HIDDEN_LINE}>
                  Every residence is engineered to return more than it draws —
                  closed-loop water, on-site generation, and a material palette
                  quarried and milled within two hundred kilometres of the ground
                  it stands on.
                </span>
              </span>

              <span className="mask-line mt-[5.5vh] block">
                <a
                  href="#contact"
                  data-cursor="enter"
                  className="sus-line group inline-flex items-center gap-[1.1rem] u-eyebrow text-ink"
                  style={HIDDEN_LINE}
                >
                  OUR COMMITMENT
                  <span
                    aria-hidden
                    className="block h-px w-[3.4rem] bg-ink/35 transition-[width] duration-700 ease-luxe group-hover:w-20"
                  />
                </a>
              </span>
            </div>
          </div>

          {/* ---------- the statistics, as monumental type ---------- */}
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`sus-stat will-t absolute z-30 ${STAT_POS[i]}`}
              style={{ transformStyle: "preserve-3d", opacity: 0 }}
            >
              <div className="sus-plate" style={STAT_REST[i]}>
                <div
                  className="sus-value u-display text-gold-bright"
                  style={{
                    fontSize: "clamp(2.6rem,7vw,7.4rem)",
                    lineHeight: 0.86,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {stat.value}
                </div>
                <div className="sus-plate-rule mt-[1.4rem] h-px w-[5.5rem] origin-left bg-gold/55" />
                <div className="u-eyebrow mt-[1.2rem] text-ivory/75">{stat.label}</div>
              </div>
            </div>
          ))}

          {/* ---------- edge wordmark ---------- */}
          <div
            className="sus-vertical pointer-events-none absolute right-0 top-0 z-30 flex h-full w-[3.4rem] items-center justify-center"
            style={{ opacity: 0 }}
          >
            <span className="u-eyebrow rotate-90 whitespace-nowrap tracking-[0.72em] text-ivory/55">
              AURUM
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
