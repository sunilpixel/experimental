"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { initNature, NATURE_BG_IMAGE, NATURE_WORD } from "@/animations/nature";

/**
 * CHAPTER 02 — NATURE / OUR PHILOSOPHY
 *
 * A porcelain room with genuine depth, not a page with things on it.
 * Three Z planes sit inside one 1350px perspective:
 *
 *   DEEP  — the photograph, 560px back, held as a letterboxed slot
 *           suspended in the porcelain, and pushed all the way to the
 *           glass as the chapter turns.
 *   MID   — the word NATURE, oversized past both edges of the frame so it
 *           reads as architecture rather than a headline. Six glyphs, six
 *           windows onto the same picture, hinged like a folding screen.
 *   FORE  — the editorial furniture, 90px in FRONT of the picture plane,
 *           set on two opposing diagonals: thesis top-left against quote
 *           mid-right, copy low-centre against the ribbon at the foot.
 *
 * No boxes, no glass, no blur, no gradients. The luxury is the scale
 * contrast between a 25vw word and a 0.42em-tracked label, the hairlines,
 * and the amount of air between them.
 */

/* Resting states declared inline so nothing flashes before hydration. */
const RISE: CSSProperties = { transform: "translateY(110%)" };
const VRULE: CSSProperties = { transform: "scaleY(0)", transformOrigin: "50% 0%" };
const HRULE_L: CSSProperties = { transform: "scaleX(0)", transformOrigin: "0% 50%" };
const HRULE_R: CSSProperties = { transform: "scaleX(0)", transformOrigin: "100% 50%" };

/* Foreground blocks rest 420px BEHIND the picture plane and swing forward
   past it as the chapter opens. Declared inline for the same reason. */
const FORE_REST: CSSProperties = { transform: "translateZ(-420px)", opacity: 0 };

const D3: CSSProperties = { transformStyle: "preserve-3d" };

const THESIS: { text: string; gold?: boolean }[] = [
  { text: "SHAPED BY" },
  { text: "WHAT WAS" },
  { text: "ALREADY THERE.", gold: true },
];

const RIBBON_PHRASE = "SPACES · PEOPLE · PURPOSE · A HIGHER TOMORROW ·";
const RIBBON_REPEATS = 8;

export default function Nature() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initNature(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="nature"
      data-chapter="nature"
      data-tone="light"
      className="chapter bg-ink"
    >
      {/* The stage carries the outer perspective — the one the porcelain
          ground itself tips inside during the handoff to chapter 03. */}
      <div
        className="nature-stage pin-stage bg-ink"
        style={{ perspective: "1600px", perspectiveOrigin: "50% 50%" }}
      >
        {/*
          Everything bright lives inside the ground. Clipping the ground at
          the end of the chapter wipes the whole light composition upward
          and reveals the ink beneath — the handoff is a wipe and a tip,
          not a scroll. --nav-line is inverted here so the shared hairline
          utilities read as ink on porcelain.
        */}
        <div
          className="nature-ground absolute inset-0 bg-porcelain text-ink"
          style={
            {
              clipPath: "inset(0% 0% 0% 0%)",
              transformOrigin: "50% 100%",
              "--nav-line": "5 6 10",
            } as CSSProperties
          }
        >
          {/* The room. Every Z distance below is measured against this. */}
          <div
            className="nature-world absolute inset-0"
            style={{ perspective: "1350px", perspectiveOrigin: "50% 46%" }}
          >
            {/* ── PLANE 1 · DEEP — the photograph ──────────────────── */}
            <div
              className="nature-deep absolute inset-0 z-0"
              style={{ ...D3, transform: "translateZ(-560px)" }}
            >
              <ImageFrame
                name="nature"
                className="nature-reveal absolute inset-0"
                innerClassName="nature-reveal-inner will-anim"
                imgClassName="object-[50%_42%]"
                sizes="100vw"
                grade
                style={{ clipPath: "inset(34% 0% 34% 0%)" }}
              >
                <div
                  aria-hidden
                  className="nature-reveal-scrim pointer-events-none absolute inset-0 bg-ink"
                  style={{ opacity: 0 }}
                />
              </ImageFrame>
            </div>

            {/* A hairline drawn 340px back, so it recedes with the room. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-[31%] z-[5]"
              style={{ transform: "translateZ(-340px)" }}
            >
              <span
                className="nature-rule-deep block h-px w-full bg-ink/15"
                style={HRULE_L}
              />
            </div>

            {/* ── PLANE 2 · MID — the word, as architecture ─────────── */}
            <div
              className="nature-mid pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              style={D3}
            >
              {/* .nature-type-enter — swings the word up out of the floor
                  before the pin engages.
                  .nature-tilt        — pointer parallax ONLY; the scrubbed
                                        timeline never writes here.
                  .nature-type-scaler — the scrub's scale/z/y target. */}
              <div
                className="nature-type-enter mt-[3vh]"
                style={{ ...D3, transform: "translateZ(-520px) rotateX(-13deg)" }}
              >
                <div className="nature-tilt" style={D3}>
                  <div
                    className="nature-type-scaler will-t"
                    style={{ ...D3, transformOrigin: "50% 50%" }}
                  >
                    <h2
                      aria-label="Nature"
                      className="nature-type u-display whitespace-nowrap text-[clamp(4.5rem,34vw,9rem)] md:text-[clamp(6rem,25vw,26rem)]"
                      style={{
                        ...D3,
                        lineHeight: 0.78,
                        backgroundImage: NATURE_BG_IMAGE,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "var(--nt-bw, 115%) auto",
                        backgroundPosition: "var(--nt-bx, 50%) var(--nt-by, 45%)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                      }}
                    >
                      {NATURE_WORD.map((letter, i) => (
                        <span
                          key={letter + i}
                          aria-hidden
                          className="nature-char inline-block"
                          style={D3}
                        >
                          {letter}
                        </span>
                      ))}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PLANE 3 · FORE — editorial furniture ──────────────── */}

            {/* Chapter mark, hard into the top-left corner. */}
            <div
              className="nature-fore nature-meta absolute left-[7vw] top-[6vh] z-20 md:left-[5vw] md:top-[7vh]"
              style={FORE_REST}
            >
              <div className="flex items-start gap-4">
                <span className="mask-line">
                  <span
                    className="nature-rise block font-display text-[0.78rem] leading-none tracking-[0.28em] text-ink"
                    style={RISE}
                  >
                    02
                  </span>
                </span>
                <span
                  aria-hidden
                  className="nature-vrule hairline-v mt-[0.1rem] h-9 shrink-0"
                  style={VRULE}
                />
                <span className="block">
                  <span className="mask-line">
                    <span className="nature-rise u-eyebrow block text-ash" style={RISE}>
                      OUR
                    </span>
                  </span>
                  <span className="mask-line">
                    <span className="nature-rise u-eyebrow block text-ink" style={RISE}>
                      PHILOSOPHY
                    </span>
                  </span>
                </span>
              </div>
            </div>

            {/* Thesis — upper left, deliberately allowed to cross the top
                edge of the word rather than clearing it. */}
            <div
              className="nature-fore nature-thesis absolute left-[7vw] top-[12vh] z-20 max-w-[84vw] md:left-[5vw] md:top-[15vh] md:max-w-[42vw]"
              style={FORE_REST}
            >
              <h3 className="u-display t-large">
                {THESIS.map((line) => (
                  <span key={line.text} className="mask-line">
                    <span
                      className={
                        "nature-rise block " + (line.gold ? "text-gold-deep" : "text-ink")
                      }
                      style={RISE}
                    >
                      {line.text}
                    </span>
                  </span>
                ))}
              </h3>
            </div>

            {/* Pull-quote — the opposing diagonal. Right edge, dropped a
                third of the frame below the thesis so the two never read
                as a column pair. */}
            <div
              className="nature-fore nature-quote absolute right-[7vw] top-[31vh] z-20 w-[70vw] text-right md:right-[5vw] md:top-[27vh] md:w-[21rem]"
              style={FORE_REST}
            >
              <span className="mask-line">
                <span
                  className="nature-rise block font-serif text-[clamp(1.15rem,1.7vw,1.75rem)] italic leading-[1.35] text-ink"
                  style={RISE}
                >
                  &ldquo;Architecture is the pause between chaos and clarity.&rdquo;
                </span>
              </span>
              <span className="mask-line mt-5 block">
                <span
                  className="nature-rise block font-display text-[0.7rem] leading-none tracking-[0.32em] text-ash"
                  style={RISE}
                >
                  AURUM &mdash; 02
                </span>
              </span>
            </div>

            {/* Body + link — pushed off the left rail into the lower third,
                sitting under the belly of the word. */}
            <div
              className="nature-fore nature-copy absolute left-[7vw] top-[71vh] z-20 max-w-[82vw] md:left-[27vw] md:top-[72vh] md:max-w-[24rem]"
              style={FORE_REST}
            >
              <span
                aria-hidden
                className="nature-rule-fore mb-[1.6rem] block h-px w-full bg-ink/20"
                style={HRULE_R}
              />
              <span className="mask-line">
                <span className="nature-rise u-body block text-slate" style={RISE}>
                  We do not just build homes. We create a deeper connection between
                  people, places and purpose.
                </span>
              </span>

              <span className="mask-line mt-[2.2rem] block">
                <span className="nature-rise block" style={RISE}>
                  <a
                    href="#residences"
                    data-cursor="enter"
                    className="group relative inline-flex items-center gap-3 pb-3"
                  >
                    <span className="u-eyebrow text-ink">DISCOVER OUR PHILOSOPHY</span>
                    <span
                      aria-hidden
                      className="text-[0.72rem] leading-none transition-transform duration-700 ease-luxe group-hover:translate-x-2"
                    >
                      &#8594;
                    </span>
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-px w-full bg-ink/15"
                    />
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-gold-deep transition-transform duration-[900ms] ease-luxe group-hover:scale-x-100"
                    />
                  </a>
                </span>
              </span>
            </div>

            {/* Marquee ribbon, travelling against the grain of everything
                else. It is the last layer standing, so its colour crosses
                from ink to ivory exactly as the photograph arrives beneath
                it — no blend modes, no plate, just the right colour at the
                right moment. */}
            <div
              className="nature-ribbon absolute inset-x-0 bottom-[6vh] z-30 overflow-hidden md:bottom-[5vh]"
              style={{
                opacity: 0,
                color: "rgba(5,6,10,0.62)",
                transform: "translateZ(60px)",
              }}
            >
              <span
                aria-hidden
                className="mb-[1.6vh] block h-px w-full"
                style={{ backgroundColor: "currentColor", opacity: 0.3 }}
              />
              <div className="nature-ribbon-track w-max">
                <div className="nature-ribbon-loop flex w-max">
                  {Array.from({ length: RIBBON_REPEATS }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden={i > 0}
                      className="u-eyebrow whitespace-nowrap px-[1.3rem]"
                    >
                      {RIBBON_PHRASE}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
