"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { initTestimonial } from "@/animations/testimonial";

/* ------------------------------------------------------------------
   CHAPTER 06 — VOICES THAT MATTER

   Four voices, one pinned stage, and four genuine Z planes stacked
   inside a single perspective camera:

     −520px   the photographic bed + directional wash
     −320px   the outlined watermark
        0px   the quote deck and the residence plate (they overlap)
     +100px   the foreground meta: chapter mark, numeral, rail, spine

   Each plane carries a scale that exactly cancels the perspective
   foreshortening at its depth — P / (P ∓ z) — so the composition is laid
   out in flat CSS units while still being genuinely separated in space.
   The instant the camera rotates or dollies, the planes part.

   No boxes, no glass, no blur. The luxury is a 9vw outlined numeral
   sitting a hundred pixels in front of a 0.42em-tracked label, and the
   fact that the sentence is physically set in the air.
------------------------------------------------------------------ */

type Voice = {
  words: string[];
  /** Indices rendered in gold — one emphasis per sentence, never more. */
  accent: number[];
  name: string;
  city: string;
  residence: string;
  since: string;
  /** Manifest key for this voice's plate. */
  image: string;
  /** object-position for the plate crop. */
  focus: string;
};

const VOICES: Voice[] = [
  {
    words: "A residence at AURUM is not just a home. It is a new way of life.".split(" "),
    accent: [3],
    name: "JAMES R.",
    city: "NEW YORK",
    residence: "THE CLIFF — AMALFI",
    since: "2019",
    image: "testimonial-portrait",
    focus: "object-[52%_32%]",
  },
  {
    words: "We came for the view. We stayed for the silence it taught us.".split(" "),
    accent: [9],
    name: "MARGUERITE L.",
    city: "GENEVA",
    residence: "THE MOUNTAINS — VALAIS",
    since: "2021",
    image: "residence-mountains",
    focus: "object-[50%_44%]",
  },
  {
    words: "Nothing here shouts. Every material simply tells the truth.".split(" "),
    accent: [8],
    name: "KENJI A.",
    city: "KYOTO",
    residence: "THE FOREST — TOFINO",
    since: "2022",
    image: "residence-forest",
    focus: "object-[54%_48%]",
  },
  {
    words: "The sea arrives in the room before you do. That is the whole design.".split(" "),
    accent: [13],
    name: "SOFIA D.",
    city: "MILAN",
    residence: "THE OCEAN — MILOS",
    since: "2023",
    image: "residence-ocean",
    focus: "object-[48%_46%]",
  },
];

/* ---------- resting states, declared inline so nothing flashes ---------- */

/** Every word starts deep, hinged back off its own baseline. */
const WORD_REST: CSSProperties = {
  opacity: 0,
  transformOrigin: "0% 100%",
  transform: "perspective(1000px) translate3d(0px, 32px, -620px) rotateX(-70deg)",
};

const HIDDEN_BELOW: CSSProperties = { transform: "translateY(112%)", opacity: 0 };
const RULE_X: CSSProperties = { transform: "scaleX(0)", transformOrigin: "0% 50%" };
const RULE_Y: CSSProperties = { transform: "scaleY(0)", transformOrigin: "50% 0%" };
/** autoAlpha's paired resting state — invisible AND untouchable. */
const GONE: CSSProperties = { opacity: 0, visibility: "hidden" };

/** Plane transform: recede/advance, then cancel the foreshortening. */
const PLANE: CSSProperties = {
  transform: "translateZ(var(--pz)) scale(var(--pc))",
  transformStyle: "preserve-3d",
};

export default function Testimonial() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initTestimonial(root.current);
  }, []);

  /* The buttons only move React state. The stage carries the index as a data
     attribute and the animation module observes it — so the swap choreography
     lives entirely in GSAP and React never destroys a node a tween holds. */
  const step = useCallback((delta: number) => {
    setActive((i) => (i + delta + VOICES.length) % VOICES.length);
  }, []);

  return (
    <section
      ref={root}
      id="testimonial"
      data-chapter="testimonial"
      data-tone="dark"
      className="chapter bg-ink text-ivory"
    >
      <div
        className="test-stage pin-stage [--persp:900px] md:[--persp:1500px]"
        data-voice={active}
        style={{ perspective: "var(--persp)", perspectiveOrigin: "50% 50%" }}
      >
        {/* ============ the camera: scrubbed dolly + yaw ============ */}
        <div
          className="test-camera absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ---- the tilt rig: pointer parallax only, never the scrub ---- */}
          <div
            className="test-tilt absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* ======== PLANE 1 — the bed, far back ======== */}
            <div
              className="test-plane-bg absolute inset-0 [--pc:1.3333] [--pz:-300px] md:[--pc:1.3714] md:[--pz:-520px]"
              style={PLANE}
            >
              <ImageFrame
                name="testimonial"
                className="test-bed absolute inset-0"
                innerClassName="test-bed-inner will-anim"
                imgClassName="object-[64%_46%]"
                sizes="100vw"
                scrim={0.14}
                vignette
                cursor="scroll"
              />
              {/* One directional wash so ivory type holds against firelight. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(102deg, rgba(5,6,10,0.80) 0%, rgba(5,6,10,0.34) 44%, rgba(5,6,10,0.62) 100%)",
                }}
              />
            </div>

            {/* ======== PLANE 2 — the watermark, mid-back ======== */}
            <div
              aria-hidden
              className="test-plane-mark pointer-events-none absolute inset-0 select-none [--pc:1.2] [--pz:-180px] md:[--pc:1.2286] md:[--pz:-320px]"
              style={PLANE}
            >
              <span className="test-watermark absolute bottom-[-7vh] left-[-4vw] block text-[34vw] md:text-[23vw]">
                <span className="watermark block">Voices</span>
              </span>
            </div>

            {/* ======== PLANE 3 — the content plane, z = 0 ======== */}
            <div
              className="test-plane-mid absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* ---- the residence plate: four shots, one frame ---- */}
              <div
                className="test-plate will-t absolute inset-x-0 bottom-0 h-[34vh] md:inset-x-auto md:bottom-auto md:right-[6vw] md:top-[15vh] md:h-[68vh] md:w-[32vw] lg:w-[27vw]"
                style={{ opacity: 0, transformStyle: "preserve-3d" }}
              >
                {/* clip-path lives alone on its own node — it flattens 3D, so
                    every shot below carries its own transformPerspective. */}
                <div
                  className="test-plate-clip absolute inset-0"
                  style={{ clipPath: "inset(0% 0% 0% 100%)" }}
                >
                  {VOICES.map((v, i) => (
                    <ImageFrame
                      key={v.name}
                      name={v.image}
                      className="test-shot absolute inset-0"
                      innerClassName="test-shot-inner will-anim"
                      imgClassName={v.focus}
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 32vw, 27vw"
                      scrim={0.1}
                      vignette
                      cursor="view"
                      style={i === 0 ? undefined : { opacity: 0 }}
                    />
                  ))}
                </div>
                {/* the one hairline that gives the plate an edge */}
                <span
                  aria-hidden
                  className="test-plate-edge absolute inset-y-0 left-0 hidden w-px bg-gold/45 md:block"
                  style={{ transform: "scaleY(0)", transformOrigin: "50% 100%" }}
                />
              </div>

              {/* ---- the quote deck: crosses the plate's left edge ---- */}
              <div className="pointer-events-none absolute inset-0 flex items-start pt-[17vh] md:items-center md:pt-0">
                <div
                  className="test-deck will-t ml-[7vw] grid w-[86vw] md:ml-[6vw] md:w-[60vw] lg:ml-[7vw] lg:w-[64vw]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {VOICES.map((v, i) => (
                    <figure
                      key={v.name}
                      className="test-voice"
                      data-i={i}
                      aria-hidden={i === active ? undefined : true}
                      /* stacked in one grid cell so the deck is exactly as
                         tall as its longest voice and nothing reflows */
                      style={{ gridArea: "1 / 1", ...(i === 0 ? null : GONE) }}
                    >
                      <blockquote className="test-quote font-serif text-[clamp(1.5rem,7.4vw,2.5rem)] font-light italic leading-[1.1] text-ivory md:text-[clamp(1.9rem,4.4vw,4.6rem)] md:leading-[1.03]">
                        {v.words.map((w, wi) => (
                          <span
                            // Indices are stable: VOICES is a frozen literal.
                            key={`${wi}-${w}`}
                            className={`test-word mr-[0.24em] inline-block ${
                              v.accent.includes(wi) ? "text-gold" : ""
                            }`}
                            style={WORD_REST}
                          >
                            {wi === 0 ? (
                              <span className="not-italic text-gold-bright">&ldquo;</span>
                            ) : null}
                            {w}
                            {wi === v.words.length - 1 ? (
                              <span className="not-italic text-gold-bright">&rdquo;</span>
                            ) : null}
                          </span>
                        ))}
                      </blockquote>

                      {/* Attribution is pushed right, so it hangs under the
                          plate's edge instead of stacking under the quote. */}
                      <figcaption className="mt-[4vh] flex items-baseline gap-[1.4rem] md:mt-[6vh] md:ml-[24vw] lg:ml-[30vw]">
                        <span
                          aria-hidden
                          className="test-attrib-rule mt-[0.55rem] block h-px w-[4.5rem] shrink-0 bg-gold/70 md:w-[7vw]"
                          style={RULE_X}
                        />
                        <span className="block">
                          <span className="mask-line">
                            <span
                              className="test-attrib-line u-display block text-[0.92rem] tracking-[0.14em] text-ivory md:text-[1.1rem]"
                              style={HIDDEN_BELOW}
                            >
                              {v.name}
                            </span>
                          </span>
                          <span className="mask-line">
                            <span
                              className="test-attrib-line u-eyebrow mt-[0.7rem] block text-bone"
                              style={HIDDEN_BELOW}
                            >
                              {v.city}
                            </span>
                          </span>
                          <span className="mask-line">
                            <span
                              className="test-attrib-line u-eyebrow block text-ash"
                              style={HIDDEN_BELOW}
                            >
                              {v.residence} · SINCE {v.since}
                            </span>
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </div>

            {/* ======== PLANE 4 — foreground meta, in front of the room ======== */}
            <div
              className="test-plane-meta pointer-events-none absolute inset-0 [--pc:0.9222] [--pz:70px] md:[--pc:0.9286] md:[--pz:100px]"
              style={PLANE}
            >
              {/* ---- 06 / VOICES / THAT MATTER ---- */}
              <div className="test-index absolute left-[7vw] top-[6vh] flex items-start gap-4 md:left-[4vw] md:top-[8vh] md:gap-5">
                <span className="mask-line">
                  <span
                    className="test-index-in block font-display text-[0.95rem] leading-none tracking-[0.18em] text-gold"
                    style={HIDDEN_BELOW}
                  >
                    06
                  </span>
                </span>
                <span
                  aria-hidden
                  className="test-index-rule mt-[0.1rem] block h-12 w-px bg-ivory/25 md:h-14"
                  style={RULE_Y}
                />
                <span className="block">
                  <span className="mask-line">
                    <span className="test-index-in u-eyebrow block text-bone" style={HIDDEN_BELOW}>
                      Voices
                    </span>
                  </span>
                  <span className="mask-line">
                    <span className="test-index-in u-eyebrow block text-ash" style={HIDDEN_BELOW}>
                      That Matter
                    </span>
                  </span>
                </span>
              </div>

              {/* ---- the giant numeral, crossing the plate's top edge ---- */}
              <div
                aria-hidden
                className="test-num will-t absolute right-[5vw] top-[1vh] select-none md:right-[4vw] md:top-[-1vh]"
                style={{ opacity: 0, transformStyle: "preserve-3d" }}
              >
                <span
                  className="test-num-in block font-display text-[22vw] leading-[0.78] md:text-[9.5vw]"
                  style={{
                    color: "transparent",
                    WebkitTextStroke: "1px rgba(200,167,106,0.55)",
                  }}
                >
                  {String(active + 1).padStart(2, "0")}
                </span>
              </div>

              {/* ---- spine label on the far edge ---- */}
              <div className="absolute inset-y-0 right-[1.6vw] hidden items-center md:flex">
                <span
                  className="test-vmeta u-eyebrow text-ash"
                  style={{
                    writingMode: "vertical-rl",
                    clipPath: "inset(100% 0% 0% 0%)",
                  }}
                >
                  AURUM — VOICES THAT MATTER
                </span>
              </div>

              {/* ---- the rail: real controls, no boxes ---- */}
              <div className="test-rail pointer-events-auto absolute bottom-[4vh] left-[7vw] flex items-center gap-5 md:bottom-[7vh] md:left-auto md:right-[4vw] md:gap-7">
                <p className="test-rail-item u-eyebrow whitespace-nowrap text-ash" style={GONE}>
                  <span className="test-counter-num inline-block text-gold">
                    {String(active + 1).padStart(2, "0")}
                  </span>
                  <span className="mx-[0.6em]">/</span>
                  {String(VOICES.length).padStart(2, "0")}
                </p>
                <span
                  aria-hidden
                  className="test-rail-rule hairline hidden w-[7vw] md:block"
                  style={RULE_X}
                />
                <div className="test-rail-item flex items-center gap-6" style={GONE}>
                  <button
                    type="button"
                    aria-label="Previous voice"
                    data-cursor="enter"
                    onClick={() => step(-1)}
                    className="group flex flex-col items-start gap-[0.55rem] text-bone transition-colors duration-500 ease-[var(--ease-luxe)] hover:text-gold"
                  >
                    <span className="u-eyebrow leading-none">Prev</span>
                    <span
                      aria-hidden
                      className="block h-px w-[2.2rem] bg-current opacity-40 transition-[width,opacity] duration-700 ease-[var(--ease-luxe)] group-hover:w-[3.6rem] group-hover:opacity-100"
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Next voice"
                    data-cursor="enter"
                    onClick={() => step(1)}
                    className="group flex flex-col items-end gap-[0.55rem] text-ivory transition-colors duration-500 ease-[var(--ease-luxe)] hover:text-gold"
                  >
                    <span className="u-eyebrow leading-none">Next</span>
                    <span
                      aria-hidden
                      className="block h-px w-[2.2rem] bg-current opacity-40 transition-[width,opacity] duration-700 ease-[var(--ease-luxe)] group-hover:w-[3.6rem] group-hover:opacity-100"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- closing blackout, outside the camera so it never tips ---- */}
        <div
          aria-hidden
          className="test-veil pointer-events-none absolute inset-0 z-40 bg-ink"
          style={{ opacity: 0 }}
        />
      </div>
    </section>
  );
}
