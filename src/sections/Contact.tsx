"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { initContact } from "@/animations/contact";

/**
 * CHAPTER 07 — GET IN TOUCH
 *
 * No form. A residence at this level is not enquired about through four input
 * fields, so the closing chapter is a CONCIERGE: the visitor declares an
 * intent, and the person who owns that intent is named, with a private line
 * and the hour where they are sitting.
 *
 * The chapter is built in Z, not on a plane. Five depth registers live inside
 * one pinned stage:
 *
 *   -700px     the photograph        — a wall at the back of the room
 *   -360px     the AURUM watermark   — drifting between wall and content
 *   -820 -> 0  the concierge panel   — hinged on the right edge, turned -8deg
 *   -420 -> +700 the title           — travels diagonally and PASSES the lens
 *   +90px      meta / rail           — nearest, almost touching the camera
 *
 * No blur, no glass, no boxes. The panel is a plane with one hairline edge and
 * a directional ink wash for legibility — the same language as chapter 05.
 */

const INTENTS = [
  {
    id: "residence",
    numeral: "01",
    title: "A PRIVATE RESIDENCE",
    blurb:
      "Acquisition, or a commission from bare ground. Eighteen months, typically, from first conversation to key.",
    concierge: "ELENA VÖSS",
    role: "DIRECTOR OF RESIDENCES",
    line: "+41 22 518 04 90",
    mail: "residences@aurum.studio",
  },
  {
    id: "investment",
    numeral: "02",
    title: "AN INVESTMENT",
    blurb:
      "Fractional and whole-asset positions across the portfolio. Reviewed quarterly, held privately.",
    concierge: "MARCUS OKONKWO",
    role: "HEAD OF CAPITAL",
    line: "+44 20 7946 0112",
    mail: "capital@aurum.studio",
  },
  {
    id: "journey",
    numeral: "03",
    title: "A BESPOKE JOURNEY",
    blurb:
      "A single stay, or a season of them. Curated end to end, from the aircraft to the last table booked.",
    concierge: "SOFIA RENARD",
    role: "CURATOR OF EXPERIENCE",
    line: "+33 1 84 88 60 24",
    mail: "journeys@aurum.studio",
  },
] as const;

const OFFICES = [
  { city: "GENEVA", zone: "Europe/Zurich" },
  { city: "LONDON", zone: "Europe/London" },
  { city: "NEW YORK", zone: "America/New_York" },
] as const;

const HIDDEN: CSSProperties = { transform: "translateY(112%)" };

/**
 * Resting pose of each intent plate in the shallow stack. Indexed by POSITION,
 * never by the selected index — React must be free to re-render on selection
 * without rewriting the transform GSAP now owns. Plate 00 rests forward
 * because the component mounts with intent 00 chosen.
 */
const PLATE_REST: CSSProperties[] = [
  { transform: "translateZ(82px)", opacity: 1 },
  {
    transform:
      "translateZ(-118px) rotateY(-13deg) rotateX(-3.2deg) translateX(12px)",
    opacity: 0.48,
  },
  {
    transform:
      "translateZ(-170px) rotateY(-13deg) rotateX(-6.4deg) translateX(12px)",
    opacity: 0.48,
  },
];

/** Live local time per office. Renders a stable dash on the server so there is
 *  never a hydration mismatch, then starts ticking after mount. */
function useOfficeClocks() {
  const [times, setTimes] = useState<string[]>(() => OFFICES.map(() => "--:--"));

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimes(
        OFFICES.map((o) =>
          new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: o.zone,
          }).format(now),
        ),
      );
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return times;
}

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const clocks = useOfficeClocks();
  const intent = INTENTS[active];

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initContact(root.current);
  }, []);

  /* Selection is React state for the CONTENT, but the MOTION belongs to GSAP —
     the animation module listens for this event and re-deals the 3D stack. */
  const choose = useCallback((index: number) => {
    setActive(index);
    root.current?.dispatchEvent(
      new CustomEvent("aurum:contact-intent", { detail: { index } }),
    );
  }, []);

  return (
    <section
      ref={root}
      id="contact"
      data-chapter="contact"
      data-tone="dark"
      className="chapter bg-ink"
    >
      <div
        className="ct-stage pin-stage"
        style={{
          perspective: "clamp(1200px, 118vw, 1600px)",
          perspectiveOrigin: "62% 46%",
        }}
      >
        <div
          className="ct-world absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ---------- PLANE 1 · the wall: photography, 700px back ----------
              Oversized and scale-compensated so the room can turn and recede
              without ever exposing an edge. */}
          <ImageFrame
            name="contact"
            className="ct-bed absolute z-0"
            innerClassName="ct-bed-inner will-anim"
            imgClassName="object-[52%_46%]"
            sizes="100vw"
            scrim={0.1}
            style={{
              inset: "-12%",
              transform: "translateZ(-700px) scale(1.62)",
              transformOrigin: "50% 50%",
            }}
          >
            {/* Rides on the wall's own plane, so it can never drift off it. */}
            <div
              className="ct-veil pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  "linear-gradient(96deg, rgba(5,6,10,0.74) 0%, rgba(5,6,10,0.26) 44%, rgba(5,6,10,0.58) 100%)",
              }}
            />
          </ImageFrame>

          {/* ---------- PLANE 2 · the watermark, 360px back ---------- */}
          <div
            className="ct-mark will-anim pointer-events-none absolute left-[-6vw] top-[36vh] z-[6]"
            aria-hidden
            style={{ transform: "translateZ(-360px) scale(1.3)" }}
          >
            <span className="watermark block text-[26vw] leading-none tracking-[0.02em]">
              AURUM
            </span>
          </div>

          {/* ---------- PLANE 5 · chapter numeral, nearest ---------- */}
          <div
            className="ct-meta absolute left-[6vw] top-[9vh] z-40 flex items-start gap-5 md:left-[5vw] md:top-[11vh]"
            style={{ transform: "translateZ(90px)" }}
          >
            <span className="u-eyebrow text-gold">07</span>
            <span className="ct-meta-rule hairline-v mt-[3px] block h-12 shrink-0" />
            <span className="u-eyebrow block text-bone/70">
              GET
              <br />
              IN TOUCH
            </span>
          </div>

          {/* ------- PLANE 4 · the title: arrives, travels, passes the lens ------- */}
          <div
            className="ct-travel will-t absolute left-[7vw] top-[16vh] z-30 w-[86vw] md:left-[4.5vw] md:top-[24vh] md:w-[58vw]"
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "18% 50%",
              transform: "translateZ(-420px) rotateY(14deg)",
            }}
          >
            <h2
              className="ct-title u-display"
              style={{ fontSize: "clamp(2.2rem,5.8vw,5.4rem)" }}
            >
              {["LET'S CREATE", "YOUR NEXT", "CHAPTER."].map((l, i) => (
                <span className="mask-line" key={l}>
                  <span
                    className={`ct-line block ${i === 2 ? "text-gold-bright" : "text-ivory"}`}
                    style={HIDDEN}
                  >
                    {l}
                  </span>
                </span>
              ))}
            </h2>

            {/* Deliberately indented off the headline's left margin — the
                asymmetry is the layout, not a decoration. */}
            <div className="mt-[3.2vh] flex items-start gap-6 md:ml-[10vw]">
              <span className="ct-rule gold-rule mt-[0.9rem] block w-[4.5rem] shrink-0" />
              <span className="mask-line block max-w-[34ch]">
                <span className="ct-body u-body block text-bone/80" style={HIDDEN}>
                  Tell us which door you are standing at. You will be answered by
                  the person who owns that conversation — not a queue.
                </span>
              </span>
            </div>
          </div>

          {/* ---------- PLANE 3 · THE CONCIERGE PANEL ----------
              Hinged on the right edge of the frame and turned -8deg, so it
              reads as a plane standing in the room, not an overlay on glass. */}
          <div
            className="ct-panel absolute inset-x-0 bottom-0 z-20 h-[63vh] md:inset-x-auto md:bottom-[7vh] md:right-0 md:top-[7vh] md:h-auto md:w-[56vw] lg:w-[52vw]"
            style={{
              opacity: 0,
              transformStyle: "preserve-3d",
              transformOrigin: "100% 50%",
              transform: "translateZ(-820px) rotateY(-26deg)",
            }}
          >
            {/* The plane's own light: one directional ink wash for legibility,
                and a single hairline where it meets the photograph. Never a
                translucent card, never a bordered box. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(100deg, rgba(5,6,10,0) 0%, rgba(5,6,10,0.52) 20%, rgba(5,6,10,0.8) 100%)",
              }}
            />
            <span
              aria-hidden
              className="hairline-v pointer-events-none absolute inset-y-0 left-0 hidden md:block"
            />

            <div
              className="ct-form relative flex h-full flex-col justify-center px-[7vw] py-[4vh] md:px-0 md:pl-[4.5vw] md:pr-[6vw]"
              style={{ clipPath: "inset(0% 0% 100% 0%)" }}
            >
              <div className="ct-field mb-[1.8vh] flex items-center gap-4">
                <span className="u-eyebrow whitespace-nowrap text-gold">
                  SELECT YOUR INTENT
                </span>
                <span className="hairline block flex-1" />
              </div>

              {/* ---- the shallow 3D stack of intent plates ----
                  .ct-plates carries its OWN perspective: the clip-path on
                  .ct-form flattens everything inside it, so the stack has to
                  establish a fresh 3D context of its own. */}
              <div className="ct-field">
                <div
                  className="ct-plates"
                  role="group"
                  aria-label="Select your intent"
                  style={{ perspective: "900px", perspectiveOrigin: "38% 50%" }}
                >
                  {INTENTS.map((it, i) => (
                    <button
                      key={it.id}
                      type="button"
                      data-cursor="enter"
                      aria-pressed={i === active}
                      onClick={() => choose(i)}
                      className="ct-plate-in block w-full text-left"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <span
                        className="ct-plate relative block border-b border-ivory/12 py-[1.5vh]"
                        style={PLATE_REST[i]}
                      >
                        <span
                          aria-hidden
                          className="ct-plate-rule absolute bottom-[-1px] left-0 block h-px w-full bg-gold"
                          style={{
                            transform: "scaleX(0)",
                            transformOrigin: "0% 50%",
                          }}
                        />
                        <span className="flex items-baseline gap-4">
                          <span className="ct-plate-num u-eyebrow shrink-0 text-ash">
                            {it.numeral}
                          </span>
                          <span
                            className="ct-plate-title u-display flex-1 text-bone"
                            style={{ fontSize: "clamp(0.95rem,1.5vw,1.4rem)" }}
                          >
                            {it.title}
                          </span>
                          <span
                            aria-hidden
                            className="ct-plate-arrow block text-gold"
                            style={{ opacity: 0.35 }}
                          >
                            →
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- the named concierge, re-dealt in Z on every change ---- */}
              <div
                className="ct-field ct-detail mt-[2.6vh] min-h-[8.5rem] md:min-h-[10rem]"
                style={{ perspective: "800px" }}
              >
                <div
                  className="ct-detail-in"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <p className="u-body max-w-[42ch] text-bone/75">{intent.blurb}</p>
                  <div className="mt-[2vh] flex flex-wrap items-end gap-x-10 gap-y-4">
                    <div>
                      <div
                        className="u-display text-ivory"
                        style={{ fontSize: "clamp(1rem,1.5vw,1.35rem)" }}
                      >
                        {intent.concierge}
                      </div>
                      <div className="u-eyebrow mt-2 text-ash">{intent.role}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={`tel:${intent.line.replace(/\s/g, "")}`}
                        data-cursor="enter"
                        className="u-eyebrow text-bone transition-colors duration-500 hover:text-gold-bright"
                      >
                        {intent.line}
                      </a>
                      <a
                        href={`mailto:${intent.mail}`}
                        data-cursor="enter"
                        className="u-eyebrow text-bone transition-colors duration-500 hover:text-gold-bright"
                      >
                        {intent.mail}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- offices, with the hour where they are ---- */}
              <div className="ct-field mt-[2.6vh] flex flex-wrap items-baseline gap-x-9 gap-y-3">
                {OFFICES.map((o, i) => (
                  <div key={o.city} className="ct-clock flex items-baseline gap-2.5">
                    <span className="u-eyebrow text-ash">{o.city}</span>
                    <span className="font-display text-[0.78rem] tracking-[0.2em] text-gold/80">
                      {clocks[i]}
                    </span>
                  </div>
                ))}
              </div>

              {/* ---- the gold call ---- */}
              <div className="ct-field mt-[3.2vh]">
                <a
                  href={`mailto:${intent.mail}`}
                  data-cursor="enter"
                  aria-label={`Request an introduction — ${intent.title}`}
                  className="ct-cta group relative inline-flex items-center justify-center"
                  style={{
                    width: "clamp(8rem,12.5vw,11rem)",
                    height: "clamp(8rem,12.5vw,11rem)",
                    opacity: 0,
                  }}
                >
                  <span
                    className="ct-cta-body relative flex h-full w-full items-center justify-center rounded-full"
                    style={{
                      willChange: "transform",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <span
                      className="ct-cta-disc absolute inset-0 rounded-full bg-gold"
                      style={{ transform: "scale(0)", transformOrigin: "50% 50%" }}
                    />
                    <svg
                      className="absolute inset-0 h-full w-full -rotate-90"
                      viewBox="0 0 100 100"
                      aria-hidden
                      focusable="false"
                    >
                      <circle
                        className="ct-ring-circle text-gold"
                        cx="50"
                        cy="50"
                        r="49"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.6"
                      />
                    </svg>
                    <span className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
                      <span className="mask-line block">
                        <span className="ct-cta-a ct-cta-ink u-eyebrow block text-ivory">
                          REQUEST AN
                          <br />
                          INTRODUCTION
                        </span>
                      </span>
                      <span className="mask-line absolute inset-x-0 top-0 block">
                        <span
                          className="ct-cta-b ct-cta-ink u-eyebrow block text-ink"
                          style={{ transform: "translateY(112%)" }}
                        >
                          ENTER
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="ct-cta-arrow ct-cta-ink block text-[1.1rem] leading-none text-gold"
                      >
                        ↗
                      </span>
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* ---------- PLANE 5 · the closing rail, bottom-left ----------
              It rises into the void the title leaves behind as it passes. */}
          <div
            className="ct-rail absolute bottom-[9vh] left-[4.5vw] z-40 hidden md:block"
            style={{ transform: "translateZ(90px)" }}
          >
            <h3
              className="u-display text-ivory/85"
              style={{ fontSize: "clamp(1.2rem,2.6vw,2.5rem)" }}
            >
              {["EXTRAORDINARY", "LIVES HERE."].map((l) => (
                <span className="mask-line" key={l}>
                  <span className="ct-rail-line block" style={HIDDEN}>
                    {l}
                  </span>
                </span>
              ))}
            </h3>
            <span className="ct-rail-rule gold-rule mt-5 block w-24" />
          </div>
        </div>
      </div>
    </section>
  );
}
