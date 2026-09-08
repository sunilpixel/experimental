"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import {
  initHero,
  HERO_PLANES,
  HERO_WATERMARK,
  HERO_LETTER_PERSPECTIVE,
} from "@/animations/hero";

/**
 * CHAPTER 01 — HERO
 *
 * A room, not a poster. Three photographic planes hang at genuinely different
 * depths inside one perspective stage, and the scroll dollies the lens forward
 * through all of them:
 *
 *   FAR   the reveal, opening through an iris out of deep space
 *   MID   the sharp film
 *   NEAR  two door leaves hinged on the centre of the frame
 *
 * The headline is its own volume on the same axis — LUXURY nearest the viewer,
 * DIFFERENTLY furthest — and the wordmark letters are scattered through Z so
 * A U R U M occupies a space rather than a line.
 *
 * Layout is an asymmetric staircase hung off a 6vw left rail: a 5vw numeral
 * against a 0.42em label, three indented headline lines that cross the picture
 * edges, and a bottom band weighted left. No boxes, no glass, nothing blurred.
 */

/** Style objects that carry the custom properties GSAP drives at scroll time. */
type Vars = CSSProperties & Record<string, string | number>;

/**
 * Resting states that must exist before hydration, plus the two breakpoint
 * redesigns that cannot be expressed as inline style: the door hinge axis and
 * the headline's staircase indents.
 *
 * `.hero-door-*` clip-paths are STATIC — the leaves are opened by rotation and
 * Z, never by interpolating a shape function.
 */
const HERO_CSS = `
#hero .hero-door-inner { transform: scale(1.14) rotate(-2.4deg); }
#hero .hero-mid-inner { transform: scale(1.1) rotate(-1.6deg); }
#hero .hero-circle-inner { transform: scale(1.3) rotate(2deg); }

#hero .hero-door-a { clip-path: inset(0 49.94% 0 0); }
#hero .hero-door-b { clip-path: inset(0 0 0 49.94%); }

/* The leaves are the shut curtain: deeper than the film behind them, so the
   swing reads as dark panels peeling off a lit frame. */
#hero .hero-door-shade { background: rgb(5 6 10 / 0.34); }
#hero .hero-door-a .hero-door-shade {
  background: linear-gradient(90deg, rgb(5 6 10 / 0.52) 0%, rgb(5 6 10 / 0.22) 100%);
}
#hero .hero-door-b .hero-door-shade {
  background: linear-gradient(90deg, rgb(5 6 10 / 0.22) 0%, rgb(5 6 10 / 0.52) 100%);
}

/* A gold hairline down the hinge — the join reads as an aperture, not a seam. */
#hero .hero-door-edge {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    rgb(200 167 106 / 0.55) 22%,
    rgb(200 167 106 / 0.55) 78%,
    transparent
  );
}

/*
 * The headline is sized against BOTH axes, not width alone.
 *
 * t-mega is 13vw, which is a width-only rule, and the stack is three lines
 * plus the line-3 gap — roughly 2.9x the font size. On any normal desktop that
 * came to ~580px of headline dropped into the ~420px of clear air between the
 * chapter mark (bottom ~26vh) and the subline (top 73%), so LUXURY was printed
 * straight through "01 / A NEW DIMENSION OF LUXURY" on first paint at every
 * viewport we shoot at. The vh term is what actually holds the composition
 * apart; 11vw only takes over on tall, narrow windows.
 *
 * Both other sizes are derived from it so the staircase keeps its proportions:
 * word-3 was 9.4vw against a 13vw headline, i.e. 0.72.
 */
#hero .hero-head {
  --hero-fs: clamp(3.4rem, min(11vw, 17vh), 15rem);
  font-size: var(--hero-fs);
}
#hero .hero-line { padding: 0.07em 0 0.09em; margin: -0.07em 0 -0.09em; }
#hero .hero-line-1 { margin-left: 2vw; }
#hero .hero-line-2 { margin-left: 16vw; }
#hero .hero-line-3 { margin-left: 0; margin-top: calc(2.2vw - 0.07em); }
/* P08 tracks this line from 0.01em out to 0.26em as it grows toward the
   lens. At 150px that pushes DIFFERENTLY past the h1's 92vw content box, and a
   wrapping line answers by breaking onto a second row mid-flight — the box
   jumps ~130px in one frame and the word appears to leap. It must overflow
   instead: by then it is scaled past the frame edge and on its way out. */
#hero .hero-word-3 {
  font-size: calc(var(--hero-fs) * 0.72);
  white-space: nowrap;
}

#hero .hero-letter {
  -webkit-text-stroke: 1px rgb(242 239 232 / var(--lo, 0.09));
  font-size: clamp(17vw, 25vw, 29vw);
}

@media (max-width: 767px) {
  /* Portrait redesign: the door becomes a pair of shutters hinged on the
     horizon, and the headline staircase tightens to fit the column. */
  #hero .hero-door-a { clip-path: inset(0 0 49.94% 0); }
  #hero .hero-door-b { clip-path: inset(49.94% 0 0 0); }
  #hero .hero-door-a .hero-door-shade {
    background: linear-gradient(180deg, rgb(5 6 10 / 0.52) 0%, rgb(5 6 10 / 0.22) 100%);
  }
  #hero .hero-door-b .hero-door-shade {
    background: linear-gradient(180deg, rgb(5 6 10 / 0.22) 0%, rgb(5 6 10 / 0.52) 100%);
  }
  #hero .hero-door-edge {
    left: 0;
    right: 0;
    top: 50%;
    bottom: auto;
    width: auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgb(200 167 106 / 0.55) 22%,
      rgb(200 167 106 / 0.55) 78%,
      transparent
    );
  }
  #hero .hero-line-1 { margin-left: 1vw; }
  #hero .hero-line-2 { margin-left: 9vw; }
  #hero .hero-line-3 { margin-top: calc(5vw - 0.07em); }
}

@media (prefers-reduced-motion: reduce) {
  #hero .hero-word,
  #hero .hero-letter,
  #hero .hero-chrome { opacity: 1 !important; }
}
`;

/** Left half / top half, then right half / bottom half. */
const DOORS = ["a", "b"] as const;

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initHero(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="hero"
      data-chapter="hero"
      data-tone="dark"
      className="chapter bg-ink"
    >
      <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />

      {/* The stage carries the camera. Everything below is measured in Z. */}
      <div
        className="hero-stage pin-stage"
        style={{
          perspective: `${HERO_PLANES.perspective}px`,
          perspectiveOrigin: "50% 46%",
        }}
      >
        <div className="hero-frame will-anim absolute inset-0">
          {/* The chapter handoff wipes this one element away from below. */}
          <div
            className="hero-cut absolute inset-0"
            style={
              {
                clipPath: "inset(calc(var(--cut, 0%) / 2) 0% calc(var(--cut, 0%) / 2) 0%)",
                "--cut": "0%",
              } as Vars
            }
          >
            {/* ================= the volume ================= */}
            <div
              className="hero-world absolute inset-0 z-0"
              style={{
                perspective: `${HERO_PLANES.perspective}px`,
                perspectiveOrigin: "50% 46%",
                transformStyle: "preserve-3d",
              }}
            >
              {/* FAR — the second film, still shut inside its iris */}
              <div
                className="hero-plane-far will-anim absolute inset-0"
                style={{
                  transform: `translateZ(${HERO_PLANES.far.z}px) rotateY(${HERO_PLANES.far.ry}deg) rotateX(${HERO_PLANES.far.rx}deg) scale(${HERO_PLANES.far.scale})`,
                }}
              >
                <ImageFrame
                  name="hero-reveal"
                  className="hero-circle absolute inset-0"
                  style={
                    {
                      clipPath: "circle(var(--circ, 0%) at 50% 50%)",
                      "--circ": "0%",
                    } as Vars
                  }
                  innerClassName="hero-circle-inner will-anim"
                  imgClassName="object-[50%_52%]"
                  sizes="100vw"
                  scrim={0.06}
                />
              </div>

              {/* MID — the sharp film the doors are hiding */}
              <div
                className="hero-plane-mid will-anim absolute inset-0"
                style={{
                  transform: `translateZ(${HERO_PLANES.mid.z}px) rotateY(${HERO_PLANES.mid.ry}deg) rotateX(${HERO_PLANES.mid.rx}deg) scale(${HERO_PLANES.mid.scale})`,
                }}
              >
                <ImageFrame
                  name="hero"
                  className="hero-mid absolute inset-0"
                  innerClassName="hero-mid-inner will-anim"
                  imgClassName="object-[50%_46%]"
                  sizes="100vw"
                  scrim={0.05}
                />
              </div>

              {/* NEAR — the door. Two leaves, one hinge, both swinging out
                  past the lens. Their clip-paths live in HERO_CSS. */}
              {DOORS.map((k) => (
                <div
                  key={k}
                  className={`hero-door hero-door-${k} will-anim absolute inset-0`}
                  style={{
                    transform: `translateZ(${HERO_PLANES.door.z}px) scale(${HERO_PLANES.door.scale})`,
                  }}
                >
                  <ImageFrame
                    name="hero"
                    className="absolute inset-0"
                    innerClassName="hero-door-inner will-anim"
                    imgClassName="object-[50%_46%]"
                    vignette
                    priority={k === "a"}
                    sizes="100vw"
                    scrim={0.12}
                  >
                    <div
                      aria-hidden
                      className="hero-door-shade pointer-events-none absolute inset-0"
                    />
                    <span
                      aria-hidden
                      className="hero-door-edge pointer-events-none absolute"
                    />
                  </ImageFrame>
                </div>
              ))}
            </div>

            {/* One flat legibility wash over the whole volume — ink only, so
                the seam between the two leaves never shows on either axis. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-25"
              style={{
                background:
                  "linear-gradient(180deg, rgba(5,6,10,0.34) 0%, rgba(5,6,10,0.06) 34%, rgba(5,6,10,0.10) 62%, rgba(5,6,10,0.52) 100%)",
              }}
            />

            {/* ================= A U R U M, scattered through Z ============ */}
            <div
              className="hero-letters pointer-events-none absolute inset-0 z-30"
              style={{
                perspective: `${HERO_LETTER_PERSPECTIVE}px`,
                perspectiveOrigin: "50% 50%",
                transformStyle: "preserve-3d",
              }}
              aria-hidden
            >
              {HERO_WATERMARK.map((l, i) => (
                <span
                  key={i}
                  className="hero-letter watermark will-anim absolute block"
                  style={
                    {
                      left: l.left,
                      top: "50%",
                      marginTop: "-0.39em",
                      opacity: 0,
                      transform: `translateZ(${l.z}px) rotateY(${l.ry}deg)`,
                      "--lo": 0.09,
                    } as Vars
                  }
                >
                  {l.char}
                </span>
              ))}
            </div>

            {/* ================= chapter mark ================= */}
            <div className="absolute top-[13vh] left-[6vw] z-40 md:top-[16vh]">
              <div
                className="hero-chrome hero-numerals will-anim flex items-start gap-[1.4vw]"
                style={{ opacity: 0 }}
              >
                <span
                  className="u-display block leading-[0.78] text-gold"
                  style={{ fontSize: "clamp(2.4rem, 5.2vw, 6rem)" }}
                >
                  01
                </span>
                <span
                  className="hairline-v mt-[0.5vw] block shrink-0"
                  style={{ height: "clamp(3rem, 5vw, 5.6rem)" }}
                />
                <span className="u-eyebrow mt-[0.6vw] block text-bone/70">
                  A NEW
                  <br />
                  DIMENSION
                  <br />
                  OF LUXURY
                </span>
              </div>
            </div>

            {/* ================= headline — three words, three depths ======
                md:51%, not 45%: the stack sits BELOW the chapter mark now
                instead of starting level with it. Sizing is --hero-fs in
                HERO_CSS (t-mega dropped — it is width-only and overflowed the
                gap between the mark and the subline); moving the stack down
                without also capping it against vh would just have pushed
                DIFFERENTLY into the subline instead. */}
            <h1
              className="hero-head u-display absolute top-[46%] left-[4vw] z-40 w-[92vw] -translate-y-1/2 text-ivory max-md:leading-[0.79] md:top-[51%]"
              style={{
                perspective: `${HERO_PLANES.perspective}px`,
                perspectiveOrigin: "36% 50%",
                transformStyle: "preserve-3d",
              }}
            >
              <span
                className="mask-line hero-line hero-line-1 will-anim"
                style={{ transform: "translateZ(-60px)" }}
              >
                <span
                  className="hero-word hero-word-1 block text-gold-bright"
                  style={{ opacity: 0 }}
                >
                  LUXURY
                </span>
              </span>
              <span
                className="mask-line hero-line hero-line-2 will-anim"
                style={{ transform: "translateZ(-380px)" }}
              >
                <span className="hero-word hero-word-2 block" style={{ opacity: 0 }}>
                  LIVES
                </span>
              </span>
              <span
                className="mask-line hero-line hero-line-3 will-anim"
                style={{
                  transform: "translateZ(-820px) rotateY(14deg) rotateX(-8deg)",
                  letterSpacing: "0.01em",
                }}
              >
                <span className="hero-word hero-word-3 block" style={{ opacity: 0 }}>
                  DIFFERENTLY
                </span>
              </span>
            </h1>

            {/* ================= bottom band, weighted left ================ */}
            <div className="absolute top-[70%] left-[6vw] z-40 w-[76vw] md:top-[73%] md:w-[52vw]">
              <div
                className="hero-chrome hero-subline will-anim flex items-center gap-5"
                style={{ opacity: 0 }}
              >
                <span className="hairline hidden w-[3.4rem] shrink-0 md:block" />
                <span className="u-eyebrow block text-bone/85">
                  SPACES · PEOPLE · EXPERIENCES · A HIGHER TOMORROW
                </span>
                <span className="hairline hidden flex-1 md:block" />
              </div>
            </div>

            {/* Scroll cue — on the same 6vw rail as the numeral, not centred */}
            <div className="absolute bottom-[5vh] left-[6vw] z-40">
              <div
                className="hero-chrome hero-scrollcue will-anim flex flex-col items-start gap-4"
                data-cursor="scroll"
                style={{ opacity: 0 }}
              >
                <span className="u-eyebrow text-bone/80">SCROLL</span>
                <span className="hero-cue-line block h-14 w-px bg-ivory/35" />
              </div>
            </div>

            {/* Watch our film — the far corner of the band */}
            <div className="absolute right-[7vw] bottom-[9vh] z-40 md:right-[6vw] md:bottom-[11vh]">
              <button
                type="button"
                aria-label="Watch our film"
                data-cursor="enter"
                className="hero-chrome hero-film will-anim flex flex-col items-center gap-4 text-ivory"
                style={{ opacity: 0 }}
              >
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-ivory/45">
                  <svg
                    width="13"
                    height="15"
                    viewBox="0 0 13 15"
                    aria-hidden
                    className="translate-x-[1.5px]"
                  >
                    <path d="M0 0 L13 7.5 L0 15 Z" fill="currentColor" />
                  </svg>
                </span>
                <span className="u-eyebrow block text-center text-bone">
                  WATCH
                  <br />
                  OUR FILM
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
