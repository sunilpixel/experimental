"use client";

import { gsap, ScrollTrigger, DrawSVGPlugin, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/**
 * CHAPTER 05 — A BETTER TOMORROW
 *
 * One pinned, scrubbed master timeline normalised to a 0 → 1 duration. The
 * chapter is built in Z: the manifesto card swings on its own Y axis, the three
 * statistic plates fly in from deep space along the drawn gold thread, and the
 * whole shell finally tips and compresses into a letterbox as chapter 06 takes
 * the screen.
 *
 * Two rules this module holds to, because the previous version broke both:
 *   1. The photograph is NEVER animated to invisible. It is the floor of the
 *      composition; if a tween fails the section still reads.
 *   2. Every scrubbed tween is a fromTo() with immediateRender:false, so
 *      scrubbing backwards restores state instead of stranding it.
 */

type Cfg = {
  end: string;
  /** How far the plates start back in Z. */
  depth: number;
  /** Card swing-in angle. */
  swing: number;
  /** Final vertical squash of the shell. */
  squash: number;
  /** Enable the pointer-parallax tilt. */
  tilt: boolean;
};

const DESKTOP: Cfg = { end: "+=520%", depth: 1, swing: 46, squash: 0.42, tilt: true };
const TABLET: Cfg = { end: "+=400%", depth: 0.75, swing: 36, squash: 0.5, tilt: false };
const MOBILE: Cfg = { end: "+=280%", depth: 0.5, swing: 24, squash: 0.6, tilt: false };

export function initSustainability(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  const build = (cfg: Cfg): (() => void) | void => {
    const stage = q(".sus-stage")[0] as HTMLElement;
    const shell = q(".sus-shell");
    const bedInner = q(".sus-bed-inner");
    const card = q(".sus-card");
    const rule = q(".sus-rule");
    const lines = q(".sus-line");
    const heads = q(".sus-head");
    const stats = q(".sus-stat");
    const plates = q(".sus-plate");
    const plateRules = q(".sus-plate-rule");
    const curve = q(".sus-curve");
    const ghost = q(".sus-ghost");
    const vertical = q(".sus-vertical");

    /* The thread starts undrawn. DrawSVG needs this set before the scrub
       timeline renders, so it is a plain set() outside the timeline. */
    gsap.set([curve, ghost], { drawSVG: "0%" });

    /* Card begins edge-on and pushed back — it swings into the room. */
    gsap.set(card, {
      transformPerspective: 1400,
      rotationY: -cfg.swing,
      z: -260 * cfg.depth,
      opacity: 0,
      force3D: true,
    });

    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: cfg.end,
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    /* ---- 0.00 → 0.86  the camera pushes through the forest ---------------- */
    tl.fromTo(
      bedInner,
      { scale: 1.22, yPercent: 5, rotation: -0.6 },
      { scale: 1.04, yPercent: -5, rotation: 0.4, duration: 0.86, ease: "cine", force3D: true },
      0,
    );

    /* ---- 0.02 → 0.20  the manifesto card swings in ------------------------ */
    tl.fromTo(
      card,
      { rotationY: -cfg.swing, z: -260 * cfg.depth, opacity: 0, xPercent: -12 },
      {
        rotationY: 0,
        z: 0,
        opacity: 1,
        xPercent: 0,
        duration: 0.18,
        ease: "aurum",
        force3D: true,
      },
      0.02,
    );

    /* ---- 0.08 → 0.34  the type stands up in 3D ---------------------------- */
    tl.fromTo(
      heads,
      { yPercent: 112, rotationX: -74, opacity: 0 },
      {
        yPercent: 0,
        rotationX: 0,
        opacity: 1,
        duration: 0.16,
        ease: "aurum",
        stagger: 0.045,
        transformOrigin: "50% 0%",
        force3D: true,
      },
      0.08,
    )
      .fromTo(
        lines,
        { yPercent: 112, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.13, ease: "aurum", stagger: 0.035 },
        0.12,
      )
      .fromTo(
        rule,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.1, ease: "aurum", transformOrigin: "50% 0%" },
        0.16,
      );

    /* ---- 0.18 → 0.62  the gold thread draws itself ------------------------ */
    tl.fromTo(ghost, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.42, ease: "cine" }, 0.18)
      .fromTo(curve, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.44, ease: "cine" }, 0.22);

    /* ---- 0.26 → 0.72  the plates arrive out of deep space ----------------- */
    stats.forEach((stat, i) => {
      const at = 0.26 + i * 0.13;
      const dir = i % 2 === 0 ? 1 : -1;

      tl.fromTo(
        stat,
        { opacity: 0, x: 70 * dir, y: 40 },
        { opacity: 1, x: 0, y: 0, duration: 0.16, ease: "aurum", force3D: true },
        at,
      ).fromTo(
        plates[i],
        {
          z: -(620 + i * 90) * cfg.depth,
          rotationY: (i === 1 ? -42 : 34) * (cfg.depth || 1),
          rotationX: (i === 1 ? -10 : 13) * (cfg.depth || 1),
          scale: 0.55,
        },
        {
          z: 0,
          rotationY: 0,
          rotationX: 0,
          scale: 1,
          duration: 0.2,
          ease: "aurum",
          transformPerspective: 1200,
          transformOrigin: "50% 50%",
          force3D: true,
        },
        at,
      ).fromTo(
        plateRules[i],
        { scaleX: 0 },
        { scaleX: 1, duration: 0.1, ease: "aurum", transformOrigin: "0% 50%" },
        at + 0.1,
      );
    });

    /* ---- 0.30 → 0.90  parallax between the plates, so depth stays alive --- */
    stats.forEach((stat, i) => {
      tl.fromTo(
        stat,
        { yPercent: 0 },
        { yPercent: (i - 1) * -9, duration: 0.6, ease: "none", force3D: true },
        0.3,
      );
    });

    tl.fromTo(
      vertical,
      { opacity: 0, yPercent: 8 },
      { opacity: 1, yPercent: -8, duration: 0.7, ease: "none" },
      0.2,
    );

    /* ---- 0.72 → 0.86  the card retreats, the plates turn away ------------- */
    tl.fromTo(
      card,
      { rotationY: 0, z: 0, opacity: 1 },
      {
        rotationY: cfg.swing * 0.55,
        z: -200 * cfg.depth,
        opacity: 0.25,
        duration: 0.14,
        ease: "aurumIn",
        force3D: true,
      },
      0.72,
    ).fromTo(
      plates,
      { rotationY: 0, z: 0 },
      {
        rotationY: -18,
        z: -180 * cfg.depth,
        duration: 0.14,
        ease: "aurumIn",
        stagger: 0.02,
        force3D: true,
      },
      0.74,
    );

    /* ---- 0.84 → 1.00  the shell tips and compresses to a letterbox -------- */
    tl.fromTo(
      shell,
      { rotationX: 0, scaleY: 1, y: 0 },
      {
        rotationX: 9,
        scaleY: cfg.squash,
        y: "-6vh",
        duration: 0.16,
        ease: "cine",
        transformOrigin: "50% 50%",
        transformPerspective: 1600,
        force3D: true,
      },
      0.84,
    ).fromTo(
      bedInner,
      { scaleY: 1 },
      { scaleY: 1 / cfg.squash, duration: 0.16, ease: "cine", force3D: true },
      0.84,
    );

    /* ---- pointer parallax: the plates hold their own depth at rest --------
     * Driven on a WRAPPER, never on .sus-plate itself. The master timeline owns
     * rotationX/rotationY on the plates from 0.26 and again from 0.74; writing
     * to the same properties here would have the tilt and the scrub overwrite
     * each other every frame. */
    if (cfg.tilt && stats.length) {
      const setY = stats.map((el) =>
        gsap.quickTo(el, "rotationY", { duration: 0.9, ease: "power3" }),
      );
      const setX = stats.map((el) =>
        gsap.quickTo(el, "rotationX", { duration: 0.9, ease: "power3" }),
      );

      // Only tilt once the plates have actually landed, so the arrival reads
      // as choreography rather than as the pointer shoving them around.
      let landed = false;
      const st = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: cfg.end,
        onUpdate: (self) => {
          landed = self.progress > 0.62 && self.progress < 0.74;
        },
      });

      const onMove = (e: PointerEvent) => {
        if (!landed) return;
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        for (let i = 0; i < stats.length; i++) {
          setY[i](nx * 6);
          setX[i](-ny * 4);
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      // Returned to matchMedia, NOT pushed to the outer array — otherwise a
      // breakpoint change leaves a dead branch's listener writing transforms
      // onto the live one.
      return () => {
        window.removeEventListener("pointermove", onMove);
        st.kill();
      };
    }
  };

  mm.add(MQ.desktop, () => build(DESKTOP));
  mm.add(MQ.tablet, () => build(TABLET));
  mm.add(MQ.mobile, () => build(MOBILE));

  /* ---- reduced motion: the complete composition, at rest ----------------- */
  mm.add(MQ.reduced, () => {
    gsap.set(q(".sus-card"), { rotationY: 0, z: 0, opacity: 1, xPercent: 0 });
    gsap.set([...q(".sus-line"), ...q(".sus-head")], {
      yPercent: 0,
      rotationX: 0,
      opacity: 1,
    });
    gsap.set(q(".sus-rule"), { scaleY: 1, transformOrigin: "50% 0%" });
    gsap.set(q(".sus-stat"), { opacity: 1, x: 0, y: 0, yPercent: 0 });
    gsap.set(q(".sus-plate"), { z: 0, rotationX: 0, rotationY: 0, scale: 1 });
    gsap.set(q(".sus-plate-rule"), { scaleX: 1 });
    gsap.set(q(".sus-bed-inner"), { scale: 1, yPercent: 0, rotation: 0, scaleY: 1 });
    gsap.set(q(".sus-shell"), { rotationX: 0, scaleY: 1, y: 0 });
    gsap.set(q(".sus-vertical"), { opacity: 1, yPercent: 0 });
    gsap.set([q(".sus-curve"), q(".sus-ghost")], { drawSVG: "100%" });
  });

  return () => mm.revert();
}

/* Keep the plugin reference alive through tree-shaking — drawSVG is only ever
   referenced as a tween property string above. */
void DrawSVGPlugin;
