"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useIsoLayoutEffect } from "@/lib/useIsoLayoutEffect";
import ImageFrame from "@/components/ImageFrame";
import { RESIDENCES } from "@/lib/chapters";
import { initResidences } from "@/animations/residences";

/**
 * CHAPTER 03 — ICONIC RESIDENCES
 *
 * A 3D carousel arc. Vertical scroll drives a horizontal track that lives on a
 * cylinder: the panel in front of the lens faces it flat at z = 0, everything
 * either side rotates away on Y and recedes into the stage. Depth is carried by
 * real Z and rotation — never by blur.
 *
 * Four Z planes, each on its own rate:
 *   -820  the wordmark, deep behind everything
 *   -520  the horizon rig (hairlines)
 *      0  the carousel arc (panels swing between 0 and -420)
 *   +60/+120  chrome and captions, floating in front of the photography
 *
 * Widths/heights ride on custom properties so the animation module can rescale
 * the whole rhythm per breakpoint (`--res-k`) without touching layout in a
 * tween. `data-rot` / `data-y` / `data-gap` are read back by the animation
 * module so the numbers live in exactly one place.
 */
const GEOMETRY = [
  { w: 27, h: 66, y: 6, rot: -5, gap: 9, z: 2, align: "self-start md:self-auto" },
  { w: 20, h: 40, y: -16, rot: 3, gap: 13, z: 4, align: "self-end md:self-auto" },
  { w: 36, h: 78, y: 2, rot: -1.5, gap: 8, z: 6, align: "self-start md:self-auto" },
  { w: 22, h: 46, y: 15, rot: 6, gap: 14, z: 4, align: "self-end md:self-auto" },
  { w: 31, h: 60, y: -8, rot: -3.5, gap: 0, z: 3, align: "self-start md:self-auto" },
] as const;

/** Resting state for every masked line — declared inline so nothing flashes. */
const HIDDEN_LINE: CSSProperties = { transform: "translateY(118%)" };

/**
 * Panels are their own 3D rendering context so a caption can sit on a plane in
 * front of its own photograph. Their deep-Z resting pose is written by the
 * animation module in useLayoutEffect — before first paint, and only on the
 * breakpoints that actually build the arc.
 */
const PANEL_REST: CSSProperties = { transformStyle: "preserve-3d" };

const TOTAL = String(RESIDENCES.length).padStart(2, "0");

export default function Residences() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    return initResidences(root.current);
  }, []);

  return (
    <section
      ref={root}
      id="residences"
      data-chapter="residences"
      data-tone="dark"
      className="chapter bg-ink text-ivory"
    >
      <div
        className="res-stage relative w-full overflow-hidden md:h-[calc(var(--vh,1vh)*100)]"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 50%" }}
      >
        {/* ================= PLANE -820 : the wordmark, deep ================= */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 hidden items-center justify-center md:flex"
          style={{ transform: "translateZ(-820px)" }}
        >
          <span className="res-watermark watermark-solid whitespace-nowrap text-[30vw]">
            RESIDENCES
          </span>
        </div>

        {/* ================= PLANE -520 : the horizon rig ================= */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 hidden md:block"
          style={{ transform: "translateZ(-520px)" }}
        >
          <span
            className="res-horizon hairline absolute left-0 right-0 top-1/2 origin-center"
            style={{ transform: "scaleX(0.35)" }}
          />
          <span className="res-vrule hairline-v absolute bottom-[14%] left-[19%] top-[14%]" />
          <span className="res-vrule hairline-v absolute bottom-[22%] left-[77%] top-[22%]" />
        </div>

        {/* ================= PLANE +70 : chapter mark ================= */}
        <div
          className="res-head absolute left-[6vw] top-[7vh] z-40 hidden md:block"
          style={{ transform: "translateZ(70px)" }}
        >
          <div className="res-head-inner flex items-start gap-[1.1rem]">
            <span className="u-display text-[0.95rem] leading-none tracking-[0.1em] text-gold">
              03
            </span>
            <span aria-hidden className="mt-[0.2rem] h-[3.4rem] w-px bg-bone/25" />
            <div>
              <span className="mask-line">
                <span
                  className="res-head-line u-eyebrow block text-bone/75"
                  style={HIDDEN_LINE}
                >
                  Iconic
                </span>
              </span>
              <span className="mask-line">
                <span
                  className="res-head-line u-eyebrow block text-bone/75"
                  style={HIDDEN_LINE}
                >
                  Residences
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ================= PLANE 0 : the carousel arc ================= */}
        <div className="res-track relative z-10 flex w-full flex-col gap-[11vh] px-[6vw] py-[16vh] md:absolute md:inset-y-0 md:left-0 md:w-max md:flex-row md:items-center md:gap-0 md:px-0 md:py-0 md:pl-[42vw] md:pr-[30vw]">
          {/* mobile-only chapter header — first item in the stack */}
          <div className="res-mobile-head md:hidden">
            <div className="flex items-center gap-[0.9rem]">
              <span className="u-display text-[0.9rem] leading-none text-gold">03</span>
              <span aria-hidden className="h-px w-[3rem] bg-bone/30" />
              <span className="u-eyebrow text-bone/70">Iconic Residences</span>
            </div>
            <h2 className="u-display t-large mt-[3vh] text-ivory">
              Extraordinary
              <br />
              homes in
              <br />
              <span className="text-gold">extraordinary</span>
              <br />
              places.
            </h2>
          </div>

          {RESIDENCES.map((r, i) => {
            const g = GEOMETRY[i % GEOMETRY.length];
            const index = String(i + 1).padStart(2, "0");

            return (
              <article
                key={r.name}
                data-index={i}
                data-rot={g.rot}
                data-y={g.y}
                data-gap={g.gap}
                className={`res-panel relative shrink-0 ${g.align}`}
                style={
                  {
                    "--pw": String(g.w),
                    "--ph": String(g.h),
                    width: "calc(var(--pw) * var(--res-k, 1) * 1vw)",
                    height: "calc(var(--ph) * 1vh)",
                    zIndex: g.z,
                    ...PANEL_REST,
                  } as CSSProperties
                }
              >
                {/*
                  No `will-anim` here: `will-change: opacity` forces
                  transform-style back to flat, which would collapse the
                  caption's forward plane onto the photograph. The promotion
                  hint lives on the luminance layer instead.
                */}
                <div
                  className="res-dom relative h-full w-full"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/*
                    Luminance layer. `filter` flattens its own subtree, so it
                    wraps the photograph ALONE — the caption above it has to
                    stay in the panel's 3D space to sit on a nearer plane.
                    Opacity lives here too, for the same reason.
                  */}
                  <div
                    className="res-lum will-anim absolute inset-0"
                    style={
                      {
                        "--res-bright": "0.5",
                        filter: "brightness(var(--res-bright))",
                      } as CSSProperties
                    }
                  >
                    <ImageFrame
                      name={r.image}
                      className="res-frame absolute inset-0"
                      innerClassName="res-img"
                      imgClassName="object-[50%_45%]"
                      sizes="(max-width: 767px) 92vw, 40vw"
                      cursor="drag"
                      vignette
                      scrim={0.08}
                      style={{ clipPath: "inset(0% 0% 100% 0%)" }}
                    />
                  </div>

                  {/* panel index — floats a little in front of its panel */}
                  <div
                    className="res-idxwrap pointer-events-none absolute right-[5%] top-[5%] overflow-hidden"
                    style={{ transform: "translateZ(70px)" }}
                  >
                    <span
                      className="res-index u-eyebrow block text-ivory/60"
                      style={HIDDEN_LINE}
                    >
                      {index} / {TOTAL}
                    </span>
                  </div>

                  {/*
                    Caption sits on its own forward plane and deliberately
                    overhangs the left edge of the photograph — type crossing
                    the image, not boxed inside it.
                  */}
                  <div
                    className="res-meta pointer-events-none absolute bottom-[7%] left-[-7%] w-[114%]"
                    style={{ transform: "translateZ(120px)" }}
                  >
                    <span className="mask-line">
                      <span
                        className="res-cap-line u-display t-medium block whitespace-nowrap text-ivory"
                        style={HIDDEN_LINE}
                      >
                        {r.name}
                      </span>
                    </span>
                    <span className="mask-line mt-[0.9rem] pl-[6%]">
                      <span
                        className="res-cap-line u-eyebrow block text-gold"
                        style={HIDDEN_LINE}
                      >
                        {r.place}
                      </span>
                    </span>
                    <span className="mask-line mt-[0.25rem] pl-[6%]">
                      <span
                        className="res-cap-line u-eyebrow block text-bone/55"
                        style={HIDDEN_LINE}
                      >
                        {r.year} &mdash; {r.area}
                      </span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ================= PLANE +70 : the rail ================= */}
        <div
          className="res-rail absolute right-[6vw] top-1/2 z-40 hidden w-[26vw] max-w-[27rem] md:block"
          style={{ transform: "translateY(-50%) translateZ(70px)" }}
        >
          <div className="res-rail-inner">
            <h2
              className="u-display text-ivory"
              style={{ fontSize: "clamp(1.15rem, 2.5vw, 2.5rem)", lineHeight: 1.04 }}
            >
              <span className="mask-line">
                <span className="res-rail-line block" style={HIDDEN_LINE}>
                  Extraordinary
                </span>
              </span>
              <span className="mask-line">
                <span className="res-rail-line block" style={HIDDEN_LINE}>
                  homes in
                </span>
              </span>
              <span className="mask-line">
                <span className="res-rail-line block text-gold" style={HIDDEN_LINE}>
                  extraordinary
                </span>
              </span>
              <span className="mask-line">
                <span className="res-rail-line block" style={HIDDEN_LINE}>
                  places.
                </span>
              </span>
            </h2>

            <div className="res-rail-foot mt-[3.2vh]" style={{ opacity: 0 }}>
              <div aria-hidden className="hairline w-full" />
              <p className="u-body mt-[2.4vh] max-w-[24rem] text-bone/70">
                Five houses, five landscapes, one discipline &mdash; architecture
                that defers to the ground it stands on.
              </p>

              <a
                href="#residences"
                data-cursor="enter"
                className="res-explore u-eyebrow mt-[3vh] inline-flex items-center gap-[0.9rem] text-ivory transition-colors duration-500 hover:text-gold"
              >
                Explore Residences
                <span aria-hidden className="text-[1.15em] leading-none">
                  &#8594;
                </span>
              </a>

              <div className="mt-[3.4vh] flex items-center gap-[1.3rem]">
                <button
                  type="button"
                  aria-label="Previous residence"
                  data-dir="-1"
                  data-cursor="enter"
                  className="res-arrow flex h-[2.6rem] w-[2.6rem] items-center justify-center border border-bone/25 text-ivory transition-colors duration-500 hover:border-gold hover:text-gold"
                >
                  <span aria-hidden className="text-[0.85rem] leading-none">
                    &#8592;
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Next residence"
                  data-dir="1"
                  data-cursor="enter"
                  className="res-arrow flex h-[2.6rem] w-[2.6rem] items-center justify-center border border-bone/25 text-ivory transition-colors duration-500 hover:border-gold hover:text-gold"
                >
                  <span aria-hidden className="text-[0.85rem] leading-none">
                    &#8594;
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PLANE +90 : the ledger ================= */}
        <div
          className="res-ledger absolute bottom-[13vh] left-[6vw] z-[45] hidden md:block"
          style={{ transform: "translateZ(90px)" }}
        >
          <div className="res-ledger-inner">
            <div className="flex items-end gap-[1.1rem]">
              <span
                className="res-bignum u-display block leading-[0.78] text-ivory"
                style={{ fontSize: "clamp(3rem,7vw,7.6rem)", letterSpacing: "-0.01em" }}
              >
                01
              </span>
              <span className="u-eyebrow mb-[1.1rem] block text-bone/45">/ {TOTAL}</span>
            </div>
            <div aria-hidden className="hairline mt-[1.4rem] w-[11vw]" />
            <span className="res-nowplace u-eyebrow mt-[1.2rem] block text-gold">
              {RESIDENCES[0].place}
            </span>
          </div>
        </div>

        {/* ================= PLANE +60 : the runway ================= */}
        <div
          className="res-runway absolute bottom-[5vh] left-[6vw] right-[6vw] z-[45] hidden md:block"
          style={{ transform: "translateZ(60px)" }}
        >
          <div className="relative h-px w-full bg-bone/15">
            <span
              aria-hidden
              className="res-runway-fill absolute inset-y-0 left-0 w-full origin-left bg-gold"
              style={{ transform: "scaleX(0)" }}
            />
            {RESIDENCES.map((r, i) => (
              <span
                key={r.name}
                className="absolute top-0 block"
                style={{ left: `${((i + 0.5) / RESIDENCES.length) * 100}%` }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-[-5px] block h-[11px] w-px -translate-x-1/2 bg-bone/30"
                />
                <span
                  className="res-tick-label u-eyebrow absolute left-0 top-[1.1rem] block -translate-x-1/2 whitespace-nowrap"
                  style={{ color: i === 0 ? "var(--color-gold)" : "rgb(185 179 167 / 0.4)" }}
                >
                  {r.name}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* ================= the resolving plate ================= */}
        <ImageFrame
          name="residence-ocean"
          className="res-plate absolute inset-0 z-30 hidden md:block"
          innerClassName="res-plate-inner"
          imgClassName="object-[50%_45%]"
          sizes="100vw"
          scrim={0.08}
          cursor="scroll"
          style={{ clipPath: "inset(100% 0% 0% 0%)" }}
        />

        <div
          className="res-plate-cap pointer-events-none absolute bottom-[9vh] left-[6vw] z-40 hidden md:block"
          style={{ transform: "translateZ(80px)" }}
        >
          <span className="mask-line">
            <span
              className="res-plate-line u-display t-large block text-ivory"
              style={HIDDEN_LINE}
            >
              The Ocean
            </span>
          </span>
          <span className="mask-line mt-[1rem]">
            <span className="res-plate-line u-eyebrow block text-gold" style={HIDDEN_LINE}>
              Milos, Greece &mdash; 1,140 m&sup2;
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
