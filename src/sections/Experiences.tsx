"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { EXPERIENCES } from "@/lib/chapters";
import { initExperiences } from "@/animations/experiences";

/**
 * CHAPTER 04 — CURATED EXPERIENCES
 *
 * A real orbit, in real space. The stage carries a 1400px perspective whose
 * vanishing point sits on the circle's centre — off-axis, right of centre — so
 * every Z move in this chapter converges on the photograph rather than on the
 * middle of the screen.
 *
 * Three Z planes:
 *   -560px  .exp-deep    numeral watermark, ghost wordmark, horizon hairline
 *      0px  .exp-core    the growing circle + the tilted orbit the nodes ride
 *   +60/140 .exp-labels / .exp-marker  the typographic foreground
 *
 * The four nodes are NOT children of the tilted ring: they are positioned by an
 * explicit projection of their orbit angle (x, y·cosθ, z = sin·R·sinθ), so each
 * photograph carries genuine translateZ and stays upright without ever being
 * sheared by the plane it travels on. Hairlines tie each node back to its label.
 *
 * No blur, no glass, no panels. Monumental type, hairlines, air.
 */

/* Resting poses declared inline so nothing flashes before hydration. */
const DEEP_REST: CSSProperties = { transform: "translateZ(-560px)" };
const CORE_CLIP: CSSProperties = { clipPath: "circle(4.5% at 68% 52%)" };
const CORE_REST: CSSProperties = { transform: "scale(1.55)", transformOrigin: "50% 50%" };
const PLANE_REST: CSSProperties = { transform: "rotateX(88deg)", opacity: 0 };
const NODE_REST: CSSProperties = { transform: "translateZ(-820px) scale(0.34)", opacity: 0 };
const LINE_REST: CSSProperties = { transform: "translateY(112%) rotateX(-72deg)" };
const ROW_REST: CSSProperties = {
  transform: "perspective(1400px) translateZ(-460px) translateX(-70px) rotateY(34deg)",
  opacity: 0,
};

/** One line of editorial per discipline — the labels are not just captions. */
const NOTE = [
  "A table for six, set where the map runs out.",
  "Thermal water drawn from the rock beneath the floor.",
  "Sixty metres of teak, and nowhere in particular to be.",
  "The keys to a city that does not advertise.",
];

export default function Experiences() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initExperiences(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="experiences"
      data-chapter="experiences"
      data-tone="dark"
      className="chapter bg-ink"
    >
      <div
        className="exp-stage pin-stage bg-ink"
        style={{ perspective: "1400px", perspectiveOrigin: "68% 52%" }}
      >
        <div
          className="exp-shell absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ============ Z-PLANE 1 — the far ground, z −560 ============ */}
          <div
            aria-hidden
            className="exp-deep will-anim pointer-events-none absolute inset-0"
            style={DEEP_REST}
          >
            <span className="exp-watermark watermark-solid absolute left-[4vw] top-[16vh] block whitespace-nowrap text-[34vw] md:left-[3vw] md:top-[12vh] md:text-[24vw]">
              IV
            </span>

            {/* horizon — the line the orbit sits on */}
            <span className="hairline absolute left-0 top-[52%] block w-full opacity-40" />

            <span className="watermark absolute bottom-[4vh] left-[6vw] hidden whitespace-nowrap text-[7vw] tracking-[0.42em] md:block">
              EXPERIENCES
            </span>
          </div>

          {/* ============ Z-PLANE 2 — the growing circle, z 0 ============ */}
          <div className="exp-core absolute inset-0" style={CORE_CLIP}>
            <ImageFrame
              name="experience-spa"
              className="exp-core-frame absolute inset-0"
              innerClassName="exp-core-inner"
              imgClassName="object-[56%_46%]"
              sizes="100vw"
              vignette
              scrim={0.12}
              cursor="scroll"
              style={CORE_REST}
            />
          </div>

          {/* One directional wash, so the label column holds on the photograph. */}
          <div
            aria-hidden
            className="exp-wash pointer-events-none absolute inset-0"
            style={{
              opacity: 0,
              background:
                "linear-gradient(96deg, rgba(5,6,10,0.74) 0%, rgba(5,6,10,0.36) 34%, rgba(5,6,10,0) 64%)",
            }}
          />

          {/* ============ the orbit ============
              .exp-orbit-anchor  static, never transformed — its layout offset is
                                 the orbit centre (a −50%/−50% translate puts the
                                 box centre exactly on left/top).
              .exp-orbit-plane   genuinely tilted in 3D; renders the true
                                 perspective ellipse the nodes travel.
              .exp-node          projected onto that ellipse from JS, upright.  */}
          <div
            className="exp-orbit-anchor pointer-events-none absolute left-1/2 top-[44%] h-[68vw] w-[68vw] -translate-x-1/2 -translate-y-1/2 md:left-[68%] md:top-[52%] md:h-[min(66vh,60vw)] md:w-[min(66vh,60vw)] lg:h-[min(72vh,48vw)] lg:w-[min(72vh,48vw)]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              aria-hidden
              className="exp-orbit-plane absolute inset-0"
              style={PLANE_REST}
            >
              <span className="absolute inset-0 block rounded-full border border-ivory/15" />
              <span className="absolute inset-[7%] block rounded-full border border-gold/12" />
              {[0, 90, 180, 270].map((deg) => (
                <span
                  key={deg}
                  className="absolute left-1/2 top-1/2 block h-px w-1/2 origin-left bg-ivory/8"
                  style={{ transform: `rotate(${deg}deg)` }}
                />
              ))}
            </div>

            {EXPERIENCES.map((e, i) => (
              <div
                key={e.label}
                className="exp-node will-anim pointer-events-auto absolute inset-0 m-auto h-[64vw] w-[64vw] md:h-[clamp(122px,11.5vw,172px)] md:w-[clamp(122px,11.5vw,172px)]"
                style={NODE_REST}
              >
                <ImageFrame
                  name={e.image}
                  className="absolute inset-0 rounded-full"
                  innerClassName="exp-node-inner"
                  sizes="(max-width: 767px) 68vw, 180px"
                  scrim={0.1}
                  cursor="view"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 block rounded-full border border-gold/30"
                />

                {/* Mobile only: the label travels with its photograph. */}
                <div className="exp-node-meta pointer-events-none absolute left-[-6vw] top-full mt-[2.6vh] w-[80vw] md:hidden">
                  <span className="u-display block text-[11vw] leading-[0.78] text-gold-deep">
                    0{i + 1}
                  </span>
                  <span className="hairline my-3 block w-[8rem]" />
                  <span className="u-eyebrow block text-ivory">{e.label}</span>
                  <span className="u-body mt-2 block max-w-[34ch] text-bone/70">
                    {NOTE[i]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ============ Z-PLANE 3 — foreground type ============ */}

          {/* the typographic column, opposite the circle */}
          <div className="exp-labels absolute bottom-[22vh] left-[6vw] top-[22vh] z-30 hidden w-[30vw] flex-col justify-between pr-[2vw] md:flex lg:w-[26vw]">
            <span
              aria-hidden
              className="exp-spine hairline-v absolute bottom-0 right-0 top-0 block origin-top"
              style={{ transform: "scaleY(0)" }}
            />

            {EXPERIENCES.map((e, i) => (
              <div key={e.label} className="exp-label-row relative">
                {/* zero-size measurement point — never animated, never painted */}
                <span
                  aria-hidden
                  className="exp-tie-anchor absolute right-0 top-1/2 block h-0 w-0"
                />
                <div
                  className="exp-label-move will-anim flex items-start gap-[1.4vw]"
                  style={ROW_REST}
                >
                  <span className="u-display block text-[clamp(1.5rem,3.2vw,3.4rem)] leading-[0.78] text-gold-deep">
                    0{i + 1}
                  </span>
                  <span className="block pt-[0.5em]">
                    <span className="u-eyebrow block text-ivory">{e.label}</span>
                    <span className="u-body mt-2 block max-w-[26ch] text-bone/65">
                      {NOTE[i]}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Narrow + reduced motion only. The stack choreography cannot resolve
              into a still frame on one phone-height viewport, so that branch
              hides the flying nodes and reveals the four disciplines as a plain
              typographic index instead. Kept display:none until it does. */}
          <div
            className="exp-rlist absolute left-[6vw] right-[6vw] top-[44vh] z-40 md:hidden"
            style={{ display: "none" }}
          >
            {EXPERIENCES.map((e, i) => (
              <div key={e.label} className="flex items-baseline gap-4 py-[1.1vh]">
                <span className="u-display block text-[1.1rem] leading-none text-gold-deep">
                  0{i + 1}
                </span>
                <span className="u-eyebrow block text-ivory">{e.label}</span>
              </div>
            ))}
          </div>

          {/* chapter marker */}
          <div
            className="exp-marker will-anim absolute left-[6vw] top-[10vh] z-40 flex items-start gap-4 md:left-[5vw] md:top-[11vh] md:gap-5"
            style={{ transform: "translateZ(140px)" }}
          >
            <span
              className="exp-fade u-display text-[clamp(1rem,1.4vw,1.5rem)] leading-none text-gold"
              style={{ opacity: 0 }}
            >
              04
            </span>
            <span
              aria-hidden
              className="hairline-v mt-[0.15em] block h-[clamp(30px,3.6vw,54px)]"
            />
            <span className="exp-fade u-eyebrow block text-bone" style={{ opacity: 0 }}>
              CURATED
              <br />
              EXPERIENCES
            </span>
          </div>

          {/* headline — passes the camera on exit */}
          <div
            className="exp-text-l will-anim absolute bottom-[16vh] left-[6vw] z-40 md:bottom-[14vh] md:left-[5vw]"
            style={{ transform: "translateZ(20px)" }}
          >
            <span className="mask-line">
              <span
                className="exp-line u-display t-large block text-ivory"
                style={LINE_REST}
              >
                MORE
              </span>
            </span>
            <span className="mask-line">
              <span
                className="exp-line u-display t-large block whitespace-nowrap text-ivory"
                style={LINE_REST}
              >
                THAN A <span className="text-gold">STAY</span>
              </span>
            </span>
          </div>

          {/* headline — recedes on exit */}
          <div
            className="exp-text-r will-anim absolute left-[6vw] top-[26vh] z-40 md:left-[42vw] md:top-[15vh]"
            style={{ transform: "translateZ(20px)" }}
          >
            <span className="mask-line">
              <span
                className="exp-line u-display t-large block whitespace-nowrap text-gold-bright"
                style={LINE_REST}
              >
                A FEELING
              </span>
            </span>
            <span className="mask-line mt-[1.6vh] block">
              <span
                className="exp-line u-eyebrow block whitespace-nowrap text-bone"
                style={LINE_REST}
              >
                FOUR DISCIPLINES · ONE INTENTION
              </span>
            </span>
          </div>

          {/* the invitation, hung low on the right */}
          <div
            className="exp-cta will-anim absolute bottom-[9vh] right-[6vw] z-40 md:bottom-[8vh] md:right-[5vw]"
            style={{ transform: "translateZ(60px)" }}
          >
            <a
              href="#contact"
              data-cursor="enter"
              className="exp-fade group inline-flex items-center gap-3"
              style={{ opacity: 0 }}
            >
              <span className="u-eyebrow text-ivory transition-colors duration-500 group-hover:text-gold">
                EXPLORE EXPERIENCES
              </span>
              <span
                aria-hidden
                className="gold-rule block w-[clamp(20px,2.6vw,44px)] transition-transform duration-700 group-hover:translate-x-1.5"
              />
            </a>
          </div>
        </div>

        {/* ============ connectors ============
            Outside the 3D shell on purpose: these are drawn in flat screen
            pixels from the projected node positions, so they never inherit a
            parent rotation. Base width is 200px; length is pure scaleX. */}
        <div
          aria-hidden
          className="exp-ties pointer-events-none absolute inset-0 z-30 hidden md:block"
        >
          {EXPERIENCES.map((e) => (
            <span
              key={e.label}
              className="exp-tie absolute left-0 top-0 block h-px w-[200px]"
              style={{ opacity: 0, background: "rgb(200 167 106 / 0.42)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
