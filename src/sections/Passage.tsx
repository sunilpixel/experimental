"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { RESIDENCES } from "@/lib/chapters";
import { initPassage } from "@/animations/passage";

/**
 * THE PASSAGE — a corridor of seven portals, flown in real CSS 3D.
 *
 * The stage carries the `perspective`; `.psg-camera` is its `preserve-3d`
 * child and holds every portal at `translateZ(-i * GAP)`. Scroll moves the
 * camera, not the portals. See src/animations/passage.ts for the maths.
 *
 * Structural rules encoded below, each of which is load-bearing:
 *   - `.psg-portal` is a zero-size 3D anchor. It never receives opacity, because
 *     opacity < 1 forces `transform-style: flat` and would collapse the caption
 *     out of the portal's own 3D space. Alpha lives on `.psg-plate` and
 *     `.psg-cap` instead.
 *   - Centring is done with negative margins, never with a transform, so GSAP
 *     owns each element's transform outright and nothing has to be re-parsed.
 *   - `.psg-cap` sits `--capz` nearer the lens than its portal, so it floats in
 *     front of the photograph rather than on it.
 *   - No blur, anywhere. Depth is Z, scale and opacity.
 */

const PASSAGE_CSS = `
#passage { --pw: 76vw; --ph: 46vh; --capz: 80px; }
#passage .psg-stage { perspective: 800px; perspective-origin: 50% 47%; }
#passage .psg-camera {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
/* Zero-size anchor. Position only — never opacity, never a size. */
#passage .psg-portal {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  pointer-events: none;
}
#passage .psg-plate {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--pw);
  height: var(--ph);
  margin-left: calc(var(--pw) / -2);
  margin-top: calc(var(--ph) / -2);
}
#passage .psg-cap {
  position: absolute;
  left: 0;
  top: calc(var(--ph) / 2 + 1rem);
  width: var(--pw);
  margin-left: calc(var(--pw) / -2);
  transform: translateZ(var(--capz));
}
#passage .psg-mark {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 62vw;
  margin-left: -31vw;
  margin-top: -0.55em;
  font-size: clamp(3.2rem, 13vw, 13rem);
  letter-spacing: 0.06em;
  text-align: center;
  white-space: nowrap;
}
#passage .psg-index { position: absolute; left: 0; bottom: 100%; margin-bottom: 0.85rem; }
/* The photograph is wider than its aperture so the inner parallax has room to
   slide without ever exposing an edge of the frame. */
#passage .psg-img { left: -6%; right: auto; width: 112%; }

@media (min-width: 768px) {
  #passage { --pw: min(78vw, 760px); --ph: 62vh; --capz: 100px; }
  #passage .psg-stage { perspective: 1000px; }
}
@media (min-width: 1024px) {
  #passage { --pw: min(58vw, 960px); --ph: min(74vh, 840px); --capz: 120px; }
  #passage .psg-stage { perspective: 1200px; }
}

/* Reduced motion: the corridor relaxes into a plain, complete column.
   The animation module clears the inline resting states to match. */
@media (prefers-reduced-motion: reduce) {
  #passage .psg-stage { height: auto; overflow: visible; padding: 12vh 0; }
  #passage .psg-camera {
    position: relative;
    inset: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9vh;
    transform: none;
    transform-style: flat;
  }
  #passage .psg-portal {
    position: relative;
    left: auto;
    top: auto;
    width: min(86vw, 620px);
    height: auto;
    transform: none;
    transform-style: flat;
    pointer-events: auto;
  }
  #passage .psg-plate {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    height: min(70vh, 620px);
    margin: 0;
    transform: none;
  }
  #passage .psg-cap {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    margin: 1.4rem 0 0;
    transform: none;
  }
  #passage .psg-mark, #passage .psg-chrome { display: none; }
}
`;

/** Hidden resting states, inline so nothing flashes before hydration. */
const HIDDEN: CSSProperties = { opacity: 0 };

type Portal = {
  kind: "title" | "residence" | "handoff";
  image: string;
  /** Caption headline. */
  name: string;
  /** Caption sub-line. */
  place: string;
  /** Caption meta line — residences only. */
  meta?: string;
};

/* The opening portal carries the chapter title, the five RESIDENCES fill the
   body of the corridor, and the closing portal hands the reader onward. */
const PORTALS: Portal[] = [
  {
    kind: "title",
    image: "architecture-01",
    name: "ENTER",
    place: "SEVEN THRESHOLDS",
  },
  ...RESIDENCES.map((r) => ({
    kind: "residence" as const,
    image: r.image,
    name: r.name,
    place: r.place,
    meta: `${r.year} — ${r.area}`,
  })),
  {
    kind: "handoff",
    image: "architecture-06",
    name: "CONTINUE",
    place: "THE CORRIDOR OPENS OUT",
  },
];

/** Side-wall watermarks, hung between the portals on their own Z planes. */
const MARKS = ["AURUM", "PASSAGE", "AURUM", "PASSAGE", "AURUM", "PASSAGE"];

/* Portals magnify well past their resting size as they reach the lens, so the
   hint is deliberately generous — never a small crop scaled up. */
const FRAME_SIZES = "(max-width: 767px) 92vw, (max-width: 1023px) 72vw, 52vw";

export default function Passage() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initPassage(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="passage"
      data-chapter="passage"
      data-tone="dark"
      className="chapter bg-ink"
    >
      <style dangerouslySetInnerHTML={{ __html: PASSAGE_CSS }} />

      <div className="psg-stage pin-stage">
        {/* ---------- the camera: one transform moves the whole corridor ---------- */}
        <div className="psg-camera will-t">
          {/* side walls — faint, angled, parallaxing on their own Z planes */}
          {MARKS.map((word, k) => (
            <div
              key={`${word}-${k}`}
              aria-hidden
              className="psg-mark watermark"
              style={HIDDEN}
            >
              {word}
            </div>
          ))}

          {/* ---------- the seven apertures ---------- */}
          {PORTALS.map((portal, i) => (
            <div key={`${portal.image}-${i}`} className="psg-portal" data-index={i}>
              <div className="psg-plate will-anim" style={HIDDEN}>
                {/* numeral, hung above the aperture on the same plane */}
                <span className="psg-index u-eyebrow text-gold/70">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <ImageFrame
                  name={portal.image}
                  className="psg-frame absolute inset-0"
                  innerClassName="psg-img"
                  sizes={FRAME_SIZES}
                  grade={portal.kind !== "residence"}
                  scrim={portal.kind === "residence" ? 0 : 0.1}
                />

                {/* aperture edges — hairlines, not a box */}
                <span aria-hidden className="hairline absolute inset-x-0 top-0" />
                <span aria-hidden className="hairline absolute inset-x-0 bottom-0" />

                {portal.kind === "title" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-[9%] text-center">
                    <span className="u-eyebrow text-gold-bright">AURUM — INTERLUDE</span>
                    <h2
                      className="u-display mt-[1.6rem] text-ivory"
                      style={{ fontSize: "clamp(1.7rem,3.1vw,3.2rem)", lineHeight: 0.94 }}
                    >
                      THE
                      <br />
                      PASSAGE
                    </h2>
                    <span aria-hidden className="gold-rule mt-[1.8rem] w-[4.5rem]" />
                    <p className="u-body mt-[1.6rem] max-w-[26ch] text-bone/85">
                      Seven apertures cut on a single axis. Walk them in order and
                      the architecture explains itself.
                    </p>
                  </div>
                ) : null}

                {portal.kind === "handoff" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-[9%] text-center">
                    <span className="u-eyebrow text-bone/70">THE PASSAGE ENDS</span>
                    <h2
                      className="u-display mt-[1.4rem] text-ivory"
                      style={{ fontSize: "clamp(1.5rem,2.7vw,2.8rem)", lineHeight: 0.94 }}
                    >
                      STEP
                      <br />
                      THROUGH
                    </h2>
                    <a
                      href="#contact"
                      data-cursor="enter"
                      className="group mt-[2rem] inline-flex items-center gap-[1.1rem] u-eyebrow text-gold-bright"
                      style={{ pointerEvents: "auto" }}
                    >
                      CONTINUE
                      <span
                        aria-hidden
                        className="block h-px w-[3.2rem] bg-gold/45 transition-[width] duration-700 ease-luxe group-hover:w-16"
                      />
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Caption: floats --capz nearer the lens than its own portal.
                  Only the wrapper's opacity is inline — the mask offset is
                  written by the first synchronous paint, so there is nothing
                  to double-parse and nothing to flash. */}
              <div className="psg-cap" style={HIDDEN}>
                <span className="mask-line">
                  <span className="psg-cap-in block">
                    <span
                      className="u-display block text-ivory"
                      style={{ fontSize: "clamp(1.05rem,1.7vw,1.85rem)" }}
                    >
                      {portal.name}
                    </span>
                    <span className="u-eyebrow mt-[0.7rem] block text-bone/70">
                      {portal.place}
                    </span>
                    {portal.meta ? (
                      <span className="u-eyebrow mt-[0.35rem] block text-gold/75">
                        {portal.meta}
                      </span>
                    ) : null}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- fixed foreground frame: outside the camera, no perspective ---------- */}
        <div className="psg-chrome pointer-events-none absolute inset-0 z-40">
          <div className="psg-fg absolute left-[5vw] top-[6vh]" style={HIDDEN}>
            <span className="u-eyebrow block text-gold/85">◆ THE PASSAGE</span>
            <span aria-hidden className="mt-[0.9rem] block h-px w-[3.4rem] bg-ivory/25" />
            <span className="u-eyebrow mt-[0.9rem] block text-bone/50">
              A CORRIDOR
              <br />
              OF SEVEN
            </span>
            <span className="u-eyebrow mt-[1.6rem] block text-bone/35">SCROLL TO FLY</span>
          </div>

          <div className="psg-fg absolute right-[5vw] top-[6vh] text-right" style={HIDDEN}>
            <span
              className="u-display block text-ivory"
              style={{ fontSize: "clamp(1.5rem,2.6vw,2.6rem)" }}
            >
              <span className="psg-count">01</span>
              <span className="text-ash"> / {String(PORTALS.length).padStart(2, "0")}</span>
            </span>
            <span className="u-eyebrow mt-[0.4rem] block text-bone/50">PORTAL</span>
          </div>

          <div className="psg-fg absolute bottom-[4.5vh] left-[5vw] right-[5vw]" style={HIDDEN}>
            <div className="relative h-px w-full">
              <span aria-hidden className="absolute inset-0 bg-ivory/15" />
              <span
                aria-hidden
                className="psg-bar absolute inset-0 origin-left bg-gold"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
