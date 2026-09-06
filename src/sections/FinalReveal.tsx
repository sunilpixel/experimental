"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import Footer from "@/components/Footer";
import { initFinalReveal } from "@/animations/finalReveal";

/* ------------------------------------------------------------------
   08 — FINAL REVEAL / END CREDITS

   Built as a room, not a plane. The pinned stage carries a 1500px
   perspective and everything inside it lives on one of four Z planes:

     -1700 -> -1050   the watermark AURUM, the far wall
     -740  -> -520    a deep hairline armature (two verticals, one horizon)
      0              the photographic bed, on a pivot that turns edge-on
     -240 -> 0       the logotype, and the near furniture in front of it

   Each plane is driven at its own rate by finalReveal.ts, so the last
   shot of the film has real parallax instead of a flat pinch.

   THE CLIP-PATH CONTRACT
   The aperture is ONE shape function for its whole life — ellipse() —
   driven by four unitless custom properties:

     clip-path: ellipse(calc(var(--fx) * 1%) calc(var(--fy) * 1%)
                     at calc(var(--cx) * 1%) calc(var(--cy) * 1%))

   A browser cannot interpolate inset() -> circle() or circle() ->
   ellipse(); the function has to match on both sides of a tween. So the
   resting "full bleed" state is NOT inset(0), it is 75%/75% — 70.71%
   (1/sqrt2) is the mathematical minimum that covers a rectangle, 75% is
   the comfortable round number above it, and it renders pixel-identical
   to inset(0) while keeping the entire collapse interpolable.

   Independent radii also let the "circle" beat be a TRUE circle at any
   viewport aspect ratio (finalReveal.ts measures the short side of the
   stage), and the independent centre lets the aperture drift off-axis as
   it closes, so the slit does not die in the dead middle of the screen.

   No blur, no glass, no boxes: monumental type, hairlines, and air.
------------------------------------------------------------------ */

const LETTERS = ["A", "U", "R", "U", "M"];

/* Resting pose of each logotype letter — declared inline so there is no
   pre-hydration flash of an already resolved title card. The alternating
   rotationX stops the arrival from reading as one rigid slab. */
const LETTER_REST = (i: number): CSSProperties => ({
  display: "inline-block",
  opacity: 0,
  transformStyle: "preserve-3d",
  transform:
    "translateZ(-800px) translateY(40%) rotateY(" +
    (26 - i * 4) +
    "deg) rotateX(" +
    (i % 2 === 0 ? -14 : -8) +
    "deg)",
});

const APERTURE = {
  clipPath:
    "ellipse(calc(var(--fx, 75) * 1%) calc(var(--fy, 75) * 1%) at calc(var(--cx, 50) * 1%) calc(var(--cy, 50) * 1%))",
  "--fx": "75",
  "--fy": "75",
  "--cx": "50",
  "--cy": "50",
} as CSSProperties;

export default function FinalReveal() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initFinalReveal(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="final"
      data-chapter="final"
      data-tone="dark"
      className="chapter bg-ink"
    >
      <div
        className="final-stage pin-stage bg-ink"
        style={{ perspective: "1500px", perspectiveOrigin: "42% 46%" }}
      >
        {/* Pointer-parallax wrapper. NOTHING in the scrubbed timeline writes
            to this element — the tilt owns rotationX/rotationY here alone. */}
        <div
          className="final-tilt absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="final-space absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* ---------- PLANE 1 — the far wall ---------- */}
            <div
              aria-hidden
              className="final-far will-anim pointer-events-none absolute inset-0 z-0 grid place-items-center overflow-hidden"
              style={{ opacity: 0, transform: "translateZ(-1700px)" }}
            >
              <span
                className="final-mark watermark block whitespace-nowrap"
                style={{
                  fontSize: "clamp(10rem, 46vw, 54rem)",
                  letterSpacing: "0.05em",
                  marginRight: "-0.05em",
                }}
              >
                AURUM
              </span>
            </div>

            {/* ---------- PLANE 2 — the deep hairline armature ----------
                 Sits behind the photograph, so it only becomes visible as
                 the aperture closes and opens black around it. */}
            <div
              aria-hidden
              className="final-deep will-anim pointer-events-none absolute inset-0 z-10"
              style={{ opacity: 0, transform: "translateZ(-740px)" }}
            >
              <span className="hairline-v absolute bottom-[8%] left-[27%] top-[8%] block" />
              <span className="hairline-v absolute bottom-0 left-[71%] top-[26%] block" />
              <span className="hairline absolute left-[9%] top-[64%] block w-[46%]" />
              <span
                className="u-display absolute left-[calc(27%+1.2rem)] top-[calc(64%-2.6rem)] block text-gold-deep"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5em" }}
              >
                VIII
              </span>
            </div>

            {/* ---------- PLANE 3 — the last frame, on its pivot ----------
                 The pivot turns about the point the aperture collapses to, so
                 the image goes edge-on exactly where it vanishes. */}
            <div
              className="final-pivot will-anim absolute inset-0 z-20"
              style={{
                transformOrigin: "41% 50%",
                transform: "translateZ(-160px) rotateY(7deg) rotateX(-2deg)",
              }}
            >
              <ImageFrame
                name="final"
                className="final-bed absolute inset-0"
                innerClassName="final-bed-inner will-anim"
                imgClassName="object-[50%_46%]"
                vignette
                sizes="100vw"
                scrim={0.1}
                cursor="scroll"
                style={APERTURE}
              />
            </div>

            {/* ---------- veil: raised only in the reduced-motion branch,
                 where the photograph stays on screen under the title ---------- */}
            <div
              aria-hidden
              className="final-veil pointer-events-none absolute inset-0 z-25 bg-ink"
              style={{ opacity: 0 }}
            />

            {/* ---------- PLANE 4 — the title card ---------- */}
            <div
              className="final-card pointer-events-none absolute inset-0 z-30"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(-240px)",
              }}
            >
              {/* Hung off the left rail, above the optical centre. Never a
                  centred block. */}
              <div
                className="absolute left-[8vw] top-[32%] w-[84vw] md:left-[11vw] md:top-[31%] md:w-[74vw]"
                style={{ transformStyle: "preserve-3d" }}
              >
                <h2
                  aria-label="Aurum"
                  className="final-word u-display m-0 block text-ivory"
                  style={{
                    transformStyle: "preserve-3d",
                    fontSize: "clamp(2.9rem, 11.5vw, 10rem)",
                    letterSpacing: "0.34em",
                    marginRight: "-0.34em",
                  }}
                >
                  {LETTERS.map((ch, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="final-letter will-t"
                      style={LETTER_REST(i)}
                    >
                      {ch}
                    </span>
                  ))}
                </h2>

                <span
                  aria-hidden
                  className="final-rule gold-rule mt-[clamp(1.3rem,3vw,2.6rem)] block w-[min(52vw,26rem)]"
                  style={{ transform: "scaleX(0)", transformOrigin: "50% 50%" }}
                />
              </div>

              {/* Credits fall to the far right on wide screens and back onto
                  the left rail on mobile, where a right-hung block would be
                  crushed against the edge. */}
              <div
                className="final-credits absolute left-[8vw] top-[63%] text-left md:left-auto md:right-[8vw] md:top-[57%] md:text-right"
                style={{ transformStyle: "preserve-3d" }}
              >
                <span className="mask-line">
                  <span
                    className="final-sub u-eyebrow block text-bone/70"
                    style={{
                      opacity: 0,
                      transform: "translateY(70%)",
                      marginRight: "-0.42em",
                    }}
                  >
                    SPACES · PEOPLE · EXPERIENCES
                  </span>
                </span>

                <span className="mask-line mt-[clamp(1.4rem,3vw,2.4rem)]">
                  <span
                    className="final-year u-eyebrow block text-gold"
                    style={{
                      opacity: 0,
                      transform: "translateY(95%)",
                      letterSpacing: "0.5em",
                      marginRight: "-0.5em",
                    }}
                  >
                    MMXXVI
                  </span>
                </span>
              </div>
            </div>

            {/* ---------- near furniture — the left rail ---------- */}
            <div className="final-meta will-anim absolute left-[6vw] top-[clamp(5.5rem,13vh,9rem)] z-40 flex items-start gap-[clamp(0.9rem,1.4vw,1.4rem)]">
              <span
                className="u-display text-gold"
                style={{ fontSize: "0.82rem", letterSpacing: "0.22em" }}
              >
                08
              </span>
              <span className="hairline-v mt-[0.35rem] block h-[clamp(2.2rem,6vh,3.8rem)]" />
              <span className="u-eyebrow block text-bone/55">
                THE LAST
                <br />
                FRAME
              </span>
            </div>

            <div className="pointer-events-none absolute bottom-[clamp(1.8rem,6vh,3.4rem)] left-[6vw] z-40">
              <span className="final-cue u-eyebrow block whitespace-nowrap text-bone/40">
                SCROLL TO CLOSE
              </span>
            </div>

            {/* ---------- near furniture — the right edge ---------- */}
            <div
              aria-hidden
              className="final-edge pointer-events-none absolute right-0 top-0 z-40 flex h-full w-[3.4rem] items-center justify-center"
              style={{ opacity: 0 }}
            >
              <span className="u-eyebrow rotate-90 whitespace-nowrap tracking-[0.72em] text-bone/45">
                END OF FILM
              </span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </section>
  );
}
