"use client";

import { Fragment, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { initArchitecture } from "@/animations/architecture";

/**
 * ◆ INTERLUDE — FORM AND MATERIAL
 *
 * A corridor, not a stack. Four marquee planes are hung in a real 3D room: a
 * ceiling plane raked back at the top, a floor plane raked up at the bottom,
 * and two near-flat planes threading the middle at different depths. The word
 * marks float in FRONT of all four on their own Z, turned a few degrees off the
 * picture plane so they never read as flat overlay text.
 *
 * Z ORDER (desktop, perspective 1450px on .arch-stage):
 *   -1450 .. -1050   .arch-watermark   outlined MATERIAL, glimpsed in the gaps
 *    -560 / -400     planes 0 and 3    ceiling + floor, slowest
 *    -220 /  -70     planes 1 and 2    near-flat, fastest (nearest = fastest)
 *    +125 .. +265    .arch-type        the three word marks
 *    +240 / +300     .arch-meta / .arch-coda
 *
 * Layout is authored twice, not scaled: below md the planes fall into a flowing
 * vertical rhythm with shallow tilt; from md up they are hung absolutely inside
 * a pinned 100vh stage.
 *
 * No blur, no glass, no panels — the only surfaces here are photographs,
 * hairlines and type.
 */

type Frame = { name: string; w: string };

type Plane = {
  /** Wrapper geometry: flow rhythm below md, hung corridor from md up. */
  box: string;
  /**
   * Resting pose, authored as CSS vars so the pre-hydration paint matches the
   * breakpoint GSAP is about to take over. These values ARE the arrival
   * `from` state — every plane starts deep and flies forward.
   */
  pose: string;
  scrim: number;
  frames: Frame[];
};

/* Frame widths are stated in the PLANE's own space, so each list is scaled up
   in inverse proportion to that plane's perspective shrink — a 36vw frame on
   the ceiling plane lands at roughly 26vw of actual viewport. */
const PLANES: Plane[] = [
  {
    // 0 — the ceiling: furthest back, raked hardest, drifts slowest
    box:
      "relative left-[-26vw] mb-[5vh] h-[19vh] w-[152vw] " +
      "md:absolute md:left-[-40vw] md:top-[-3vh] md:mb-0 md:h-[27vh] md:w-[180vw] " +
      "lg:left-[-50vw] lg:top-[-2vh] lg:h-[30vh] lg:w-[200vw]",
    pose:
      "[--pz:-540px] [--prx:-27deg] [--pry:0deg] [--psc:0.86] " +
      "md:[--pz:-920px] md:[--prx:-43deg] " +
      "lg:[--pz:-1280px] lg:[--prx:-60deg]",
    scrim: 0.12,
    frames: [
      { name: "architecture-01", w: "w-[61vw] md:w-[45vw] lg:w-[36vw]" },
      { name: "architecture-05", w: "w-[46vw] md:w-[35vw] lg:w-[26vw]" },
      { name: "residence-forest", w: "w-[69vw] md:w-[51vw] lg:w-[42vw]" },
    ],
  },
  {
    // 1 — upper middle, canted off the picture plane
    box:
      "relative left-[-18vw] mb-[5vh] h-[18vh] w-[136vw] " +
      "md:absolute md:left-[-24vw] md:top-[25vh] md:mb-0 md:h-[24vh] md:w-[148vw] " +
      "lg:left-[-30vw] lg:top-[26vh] lg:h-[26vh] lg:w-[160vw]",
    pose:
      "[--pz:-395px] [--prx:-14deg] [--pry:6deg] [--psc:0.86] " +
      "md:[--pz:-675px] md:[--prx:-23deg] md:[--pry:9deg] " +
      "lg:[--pz:-940px] lg:[--prx:-32deg] lg:[--pry:13deg]",
    scrim: 0.06,
    frames: [
      { name: "architecture-02", w: "w-[48vw] md:w-[34vw] lg:w-[25vw]" },
      { name: "architecture-06", w: "w-[57vw] md:w-[41vw] lg:w-[33vw]" },
      { name: "residence-desert", w: "w-[42vw] md:w-[29vw] lg:w-[21vw]" },
    ],
  },
  {
    // 2 — the nearest plane: almost flat, and the fastest thing in the room
    box:
      "relative left-[-20vw] mb-[5vh] h-[20vh] w-[140vw] " +
      "md:absolute md:left-[-20vw] md:top-[49vh] md:mb-0 md:h-[26vh] md:w-[140vw] " +
      "lg:left-[-25vw] lg:top-[50vh] lg:h-[28vh] lg:w-[150vw]",
    pose:
      "[--pz:-353px] [--prx:13deg] [--pry:-5deg] [--psc:0.86] " +
      "md:[--pz:-605px] md:[--prx:20deg] md:[--pry:-8deg] " +
      "lg:[--pz:-840px] lg:[--prx:28deg] lg:[--pry:-11deg]",
    scrim: 0.04,
    frames: [
      { name: "architecture-03", w: "w-[56vw] md:w-[40vw] lg:w-[32vw]" },
      { name: "architecture-05", w: "w-[43vw] md:w-[30vw] lg:w-[22vw]" },
      { name: "residence-cliff", w: "w-[47vw] md:w-[33vw] lg:w-[25vw]" },
    ],
  },
  {
    // 3 — the floor: raked up toward the horizon
    box:
      "relative left-[-26vw] h-[19vh] w-[152vw] " +
      "md:absolute md:left-[-40vw] md:top-[73vh] md:mb-0 md:h-[27vh] md:w-[180vw] " +
      "lg:left-[-50vw] lg:top-[74vh] lg:h-[30vh] lg:w-[200vw]",
    pose:
      "[--pz:-495px] [--prx:25deg] [--pry:0deg] [--psc:0.86] " +
      "md:[--pz:-850px] md:[--prx:40deg] " +
      "lg:[--pz:-1180px] lg:[--prx:56deg]",
    scrim: 0.14,
    frames: [
      { name: "architecture-04", w: "w-[45vw] md:w-[33vw] lg:w-[24vw]" },
      { name: "architecture-06", w: "w-[60vw] md:w-[42vw] lg:w-[35vw]" },
      { name: "residence-mountains", w: "w-[52vw] md:w-[38vw] lg:w-[29vw]" },
    ],
  },
];

/* Each list is rendered three times so the marquee can translate by exactly one
   list-width and wrap with no seam. The 1.4vw gap lives on the FRAME as a right
   margin — never as a flex gap, or the third copy stops matching the first and
   the loop hitches. */
const COPIES = [0, 1, 2];

/* The word marks. Positions are deliberately unequal: nothing is centred,
   nothing shares a left edge, and every line crosses a plane boundary. */
type Word = {
  box: string;
  size: string;
  align: string;
  /** Resting pose. It is invisible, so one fixed value serves every breakpoint. */
  rest: CSSProperties;
  node: ReactNode;
};

const WORDS: Word[] = [
  {
    box:
      "relative mb-[4vh] px-[7vw] " +
      "md:absolute md:left-[7vw] md:top-[20vh] md:mb-0 md:px-0 lg:top-[19vh]",
    size: "t-huge",
    align: "justify-start",
    rest: { opacity: 0, transform: "translateZ(-620px) rotateY(42deg)" },
    node: "FORM",
  },
  {
    box:
      "relative mb-[4vh] px-[7vw] " +
      "md:absolute md:left-[33vw] md:top-[44vh] md:mb-0 md:px-0 lg:left-[34vw] lg:top-[45vh]",
    size: "t-large",
    align: "justify-end md:justify-start",
    rest: { opacity: 0, transform: "translateZ(-620px) rotateY(-36deg)" },
    node: (
      <>
        AND <span className="text-gold">MATERIAL</span>
      </>
    ),
  },
  {
    box:
      "relative mb-[4vh] px-[7vw] " +
      "md:absolute md:left-[13vw] md:top-[68vh] md:mb-0 md:px-0 lg:top-[69vh]",
    size: "t-large",
    align: "justify-start",
    rest: { opacity: 0, transform: "translateZ(-620px) rotateY(28deg)" },
    node: (
      <>
        AND <span className="text-gold">LIGHT</span>
      </>
    ),
  },
];

const HIDDEN_LINE: CSSProperties = { transform: "translateY(112%)" };
const DEEP_META: CSSProperties = { opacity: 0, transform: "translateZ(-300px)" };

export default function Architecture() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initArchitecture(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="architecture"
      data-chapter="architecture"
      data-tone="dark"
      className="chapter bg-ink [--persp:900px] md:[--persp:1200px] lg:[--persp:1450px]"
    >
      <div
        className="arch-stage relative w-full overflow-hidden py-[13vh] md:h-[calc(var(--vh,1vh)*100)] md:py-0"
        style={{ perspective: "var(--persp)", perspectiveOrigin: "50% 44%" }}
      >
        {/* .arch-camera exists so the pointer tilt has an element of its own —
            the scrubbed timeline owns rotationX on .arch-shell, and the two
            must never write to the same property. */}
        <div
          className="arch-camera relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="arch-shell will-t relative h-full w-full"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* the deepest plane — an outlined word only ever glimpsed in the
                gaps between the photographic planes */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              <span
                className="arch-watermark watermark will-anim whitespace-nowrap"
                style={{
                  opacity: 0,
                  fontSize: "20vw",
                  WebkitTextStroke: "2px rgb(242 239 232 / 0.13)",
                  transform: "translateZ(-1450px)",
                }}
              >
                MATERIAL
              </span>
            </div>

            {/* Planes and word marks are interleaved in the DOM so the mobile
                flow layout alternates plane / word / plane without needing any
                reordering; from md up every one of them is hung absolutely and
                the composition is sorted by its Z position instead. */}
            {PLANES.map((plane, p) => {
              const word = WORDS[p];
              return (
              <Fragment key={p}>
              <div
                data-plane={p + 1}
                className={`arch-plane will-anim overflow-hidden ${plane.box} ${plane.pose}`}
                style={{
                  transform:
                    "translateZ(var(--pz)) rotateY(var(--pry)) rotateX(var(--prx)) scale(var(--psc))",
                }}
              >
                {/* .arch-row carries the scrubbed horizontal parallax… */}
                <div className="arch-row absolute inset-0 will-anim">
                  {/* …and .arch-drift the never-stopping idle marquee. Two
                      elements, so the two motions can never overwrite each
                      other's transform. */}
                  <div className="arch-drift absolute left-[-14vw] top-[-12%] flex h-[124%] w-max items-stretch will-anim">
                    {COPIES.map((copy) =>
                      plane.frames.map((f, i) => (
                        <ImageFrame
                          key={`${copy}-${i}`}
                          name={f.name}
                          className={`arch-frame mr-[1.4vw] h-full shrink-0 ${f.w}`}
                          innerClassName="arch-img"
                          imgClassName="object-[50%_45%]"
                          sizes="(max-width: 767px) 55vw, (max-width: 1023px) 38vw, 30vw"
                          scrim={plane.scrim}
                          cursor="drag"
                          style={{
                            transform: `rotate(${
                              (copy * 3 + i) % 2 === 0 ? "-1.4" : "0.9"
                            }deg)`,
                          }}
                        />
                      )),
                    )}
                  </div>
                </div>
              </div>

              {/* the word mark that belongs to this seam, in front of every
                  plane. mix-blend-mode sits on the same element that carries
                  the 3D pose: an element blends into its PARENT's group, so the
                  blend still resolves against the planes even though this
                  transform makes it a stacking context for its own children. */}
              {word ? (
                <div
                  className={`arch-type will-anim pointer-events-none z-20 mix-blend-difference ${word.box}`}
                  style={word.rest}
                >
                  <div className={`arch-type-drift flex ${word.align}`}>
                    <span className="mask-line">
                      <span
                        className={`arch-type-line u-display ${word.size} block whitespace-nowrap pb-[0.1em] pt-[0.06em] text-ivory`}
                        style={HIDDEN_LINE}
                      >
                        {word.node}
                      </span>
                    </span>
                  </div>
                </div>
              ) : null}
              </Fragment>
              );
            })}

            {/* ---------- foreground meta ---------- */}
            <div
              className="arch-meta will-anim pointer-events-none absolute left-[6vw] top-[-9vh] z-30 flex items-start gap-[1.1rem] md:top-[7vh] md:gap-[1.4rem]"
              style={DEEP_META}
            >
              <div className="flex flex-col items-center pt-[0.4rem]">
                <span
                  aria-hidden
                  className="arch-diamond block h-[7px] w-[7px] rotate-45 bg-gold"
                />
                <span
                  aria-hidden
                  className="arch-rule hairline-v mt-[0.95rem] h-[9vh] origin-top"
                  style={{ transform: "scaleY(0)" }}
                />
              </div>
              <div className="u-eyebrow text-bone/70">
                <span className="mask-line">
                  <span className="arch-mask-line block" style={HIDDEN_LINE}>
                    FORM
                  </span>
                </span>
                <span className="mask-line">
                  <span className="arch-mask-line block" style={HIDDEN_LINE}>
                    AND MATERIAL
                  </span>
                </span>
              </div>
            </div>

            {/* closing italic — the nearest thing in the room, arriving last */}
            <div
              className="arch-coda will-anim relative z-30 mt-[7vh] px-[7vw] text-right md:absolute md:right-[7vw] md:top-[83vh] md:mt-0 md:w-[30vw] md:px-0 lg:w-[26vw]"
              style={{ opacity: 0, transform: "translateZ(-520px) rotateY(12deg)" }}
            >
              <span
                aria-hidden
                className="arch-rule gold-rule mb-[1.5rem] ml-auto block w-[7vw] origin-right"
                style={{ transform: "scaleX(0)" }}
              />
              <span className="mask-line">
                <span
                  className="arch-coda-line block pb-[0.16em] font-serif text-[clamp(1.2rem,2.4vw,2.05rem)] font-light italic leading-[1.25] text-bone"
                  style={HIDDEN_LINE}
                >
                  Material is memory made visible.
                </span>
              </span>
            </div>

            <div
              className="arch-meta will-anim pointer-events-none relative z-30 mt-[6vh] px-[7vw] md:absolute md:left-[6vw] md:top-[86vh] md:mt-0 md:px-0"
              style={DEEP_META}
            >
              <span
                aria-hidden
                className="arch-rule hairline mb-[1.1rem] block w-[9vw] origin-left"
                style={{ transform: "scaleX(0)" }}
              />
              <div className="u-eyebrow text-bone/55">
                <span className="mask-line">
                  <span className="arch-mask-line block" style={HIDDEN_LINE}>
                    SIX STUDIES IN LIGHT
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
