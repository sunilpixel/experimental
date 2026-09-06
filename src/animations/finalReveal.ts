"use client";

import { gsap, ScrollTrigger, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/* ------------------------------------------------------------------
   08 — FINAL REVEAL / END CREDITS

   ONE pinned scrub timeline, authored in units of 100 so every position
   below reads as the scroll progress percentage from the storyboard:

     00 – 26  the frame settles into the room: the pivot un-turns from
              rotateY(7) / z(-160) while the image pushes in
     06 – 28  the deep hairline armature arrives from z -740 to z -520
     14 – 28  the scroll cue rushes FORWARD past the camera and out
     16 – 32  the chapter marker recedes BACKWARD and turns away
     26 – 46  aperture: full bleed -> a TRUE circle; pivot starts turning
     46 – 62  circle -> tall lens; pivot to -35% of its travel, z -430
     62 – 76  lens -> vertical slit; pivot to -74%, z -820, image to 1.45
     76 – 82  slit -> nothing, pivot to full edge-on at z -1000. Black.
     26 – 82  the aperture centre drifts off-axis, 50/50 -> 41/47
     72 – 96  the far watermark resolves — 24 units against the
              logotype's 5.5, so the back wall crawls while the title lands
     80 – 90  the title card rides forward from z -240 to z 0
     82 – 91  the five letters arrive out of z -800, staggered
     91 – 95  the gold rule draws outward from its centre
     93 – 98  the credits rise on the opposite rail
     98 – 100 hold

   THE CLIP-PATH CONTRACT (see also FinalReveal.tsx)
   clip-path is
     ellipse(calc(var(--fx) * 1%) calc(var(--fy) * 1%)
          at calc(var(--cx) * 1%) calc(var(--cy) * 1%))
   and only those four unitless custom properties are ever tweened. A
   browser cannot interpolate inset() -> circle() or circle() -> ellipse();
   the shape function must match on both sides of a tween. So the resting
   "full bleed" state is 75%/75% rather than inset(0) — 70.71% (1/sqrt2)
   is the mathematical minimum that covers a rectangle, 75% is the round
   number above it, and it renders pixel-identical to inset(0).

   Independent radii also make the circle beat a real circle at any aspect
   ratio: radius = 46% of the stage's SHORT side, re-expressed as a
   percentage of width and of height. Plain circle(46%) resolves against
   the box diagonal and would balloon past the frame edges on a portrait
   phone, which is exactly where this shot must read cleanest.

   The DRAMA of the collapse is carried by the 3D pivot, not by the shape:
   the frame turns edge-on to the viewer at the moment it vanishes, which
   is what an end-of-film cut actually feels like.
------------------------------------------------------------------ */

type Cfg = {
  /** Pin length, in % of viewport height. */
  end: number;
  /** Global multiplier on every Z travel and out-of-plane rotation. */
  depth: number;
  /** Total rotationY the frame turns through before it vanishes, degrees. */
  turn: number;
  /** Horizontal radius of the final slit, in % of stage width. */
  slitX: number;
  /** Push-in start scale for the held opening frame. */
  push: number;
  /** Enable the pointer-parallax tilt on the whole stage. */
  tilt: boolean;
};

/* Mobile is not the desktop shot scaled down: the frame barely turns (an
   edge-on plane on a 390px screen reads as a glitch, not as cinema), the
   Z travel is halved so the letters stay legible, and the slit is wide
   enough to still carry image. */
const DESKTOP: Cfg = { end: 520, depth: 1, turn: 96, slitX: 0.35, push: 1.16, tilt: true };
const TABLET: Cfg = { end: 420, depth: 0.72, turn: 64, slitX: 0.55, push: 1.14, tilt: false };
const MOBILE: Cfg = { end: 300, depth: 0.46, turn: 38, slitX: 1.1, push: 1.12, tilt: false };

/** Radius of the circle beat, as a fraction of the stage's short side. */
const CIRCLE_R = 0.46;

/** Vertical radii of the lens and slit beats, in % of stage height. */
const LENS_Y = 44;
const SLIT_Y = 30;
/** Horizontal radius of the lens beat, in % of stage width. */
const LENS_X = 9;

/** Where the aperture ends up, so the slit does not die dead-centre. */
const CX_END = 41;
const CY_END = 47;

export function initFinalReveal(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  /* --- footer: shared by every motion branch, identical at all sizes --- */
  const buildFooter = () => {
    const rows = q(".final-footer-row");
    const rule = q(".final-footer-rule");
    const footer = q(".final-footer")[0];
    if (!footer) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: footer, start: "top 92%", once: true },
    });

    tl.fromTo(
      rule,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.6, ease: "curtain", force3D: true },
      0,
    ).fromTo(
      rows,
      { opacity: 0, yPercent: 55 },
      { opacity: 1, yPercent: 0, duration: 1.5, stagger: 0.11, ease: "aurum", force3D: true },
      0.18,
    );
  };

  const build = (cfg: Cfg): (() => void) | void => {
    const stage = q(".final-stage")[0] as HTMLElement | undefined;
    if (!stage) return;

    const tilt = q(".final-tilt")[0] as HTMLElement | undefined;
    const pivot = q(".final-pivot");
    const bed = q(".final-bed");
    const bedInner = q(".final-bed-inner");
    const deep = q(".final-deep");
    const far = q(".final-far");
    const card = q(".final-card");
    const letters = q(".final-letter");

    /* Re-assert the resting custom properties that the TSX declared inline.
       GSAP removes a custom property it has tweened when the timeline is
       reverted, and React will not put it back — it reuses the same DOM node
       and its props have not changed. The inline `clip-path: ellipse(calc(var(--fx)...))`
       then resolves against an undefined var, computes to 0, and the whole
       frame is clipped away: the chapter renders black. Setting them here makes
       the resting state survive any revert. */
    

    const rule = q(".final-rule");
    const sub = q(".final-sub");
    const year = q(".final-year");
    const meta = q(".final-meta");
    const cue = q(".final-cue");
    const edge = q(".final-edge");

    const d = cfg.depth;

    /* Measured live so the circle beat survives resize + orientation change;
       invalidateOnRefresh re-runs these function-based values on refresh. */
    const short = () => Math.min(stage.clientWidth, stage.clientHeight);
    const circleX = () => (CIRCLE_R * short() * 100) / stage.clientWidth;
    const circleY = () => (CIRCLE_R * short() * 100) / stage.clientHeight;

    /* Pivot keyframes. Written out so each segment's `from` is literally the
       previous segment's `to` — a scrubbed timeline has to be able to run
       backwards through them without drift. */
    const R = [0, -cfg.turn * 0.09, -cfg.turn * 0.35, -cfg.turn * 0.74, -cfg.turn];
    const X = [0, 2 * d, 4 * d, 7 * d, 9 * d];
    const Z = [0, -140 * d, -430 * d, -820 * d, -1000 * d];

    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false, force3D: true },
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "+=" + cfg.end + "%",
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1.2,
        invalidateOnRefresh: true,
      },
    });

    /* Pin the resting aperture INTO the timeline at position 0. A scrubbed
       timeline is the only authority on these custom properties once it exists,
       so asserting the rest state outside it always loses the race; asserted
       here, time 0 is guaranteed to be the open frame. */
    tl.set(bed, { "--fx": 75, "--fy": 75, "--cx": 50, "--cy": 50 }, 0);


    /* ---- 00–26  the frame settles into the room -------------------------- */
    tl.fromTo(
      bedInner,
      { scale: cfg.push, yPercent: 4 },
      { scale: 1, yPercent: 0, duration: 26, ease: "cine" },
      0,
    ).fromTo(
      pivot,
      { rotationY: 7 * d, rotationX: -2 * d, z: -160 * d },
      { rotationY: R[0], rotationX: X[0], z: Z[0], duration: 26, ease: "cine" },
      0,
    );

    /* ---- 06–28  the deep armature arrives, then keeps its own slow rate --- */
    tl.fromTo(
      deep,
      { opacity: 0, z: -740 * d, yPercent: 5 },
      { opacity: 1, z: -520 * d, yPercent: 0, duration: 22, ease: "cine" },
      6,
    ).fromTo(deep, { yPercent: 0 }, { yPercent: -5, duration: 38 }, 62);

    /* ---- 04–20  the edge wordmark slides in from off-frame --------------- */
    tl.fromTo(edge, { opacity: 0, xPercent: 45 }, { opacity: 1, xPercent: 0, duration: 16 }, 4);

    /* ---- 14–32  the near furniture leaves in TWO directions --------------
       The cue rushes forward past the camera; the marker recedes and turns
       away. Opposite Z directions is what sells the room as a room. */
    tl.fromTo(
      cue,
      { opacity: 1, z: 0, yPercent: 0 },
      { opacity: 0, z: 240 * d, yPercent: 40, duration: 14, ease: "aurumIn" },
      14,
    ).fromTo(
      meta,
      { opacity: 1, z: 0, rotationY: 0 },
      { opacity: 0, z: -360 * d, rotationY: -24 * d, duration: 16, ease: "aurumIn" },
      16,
    );

    /* ---- 26–46  full bleed -> a true circle; the pivot begins its turn ---- */
    tl.fromTo(
      bed,
      { "--fx": 75, "--fy": 75 },
      { "--fx": () => circleX(), "--fy": () => circleY(), duration: 20, ease: "curtain" },
      26,
    ).fromTo(
      pivot,
      { rotationY: R[0], rotationX: X[0], z: Z[0] },
      { rotationY: R[1], rotationX: X[1], z: Z[1], duration: 20, ease: "cine" },
      26,
    );

    /* ---- 26–82  the aperture walks off the centre line -------------------- */
    tl.fromTo(
      bed,
      { "--cx": 50, "--cy": 50 },
      { "--cx": CX_END, "--cy": CY_END, duration: 56, ease: "cine" },
      26,
    );

    /* ---- 46–62  circle -> tall lens --------------------------------------- */
    tl.fromTo(
      bed,
      { "--fx": () => circleX(), "--fy": () => circleY() },
      { "--fx": LENS_X, "--fy": LENS_Y, duration: 16 },
      46,
    ).fromTo(
      pivot,
      { rotationY: R[1], rotationX: X[1], z: Z[1] },
      { rotationY: R[2], rotationX: X[2], z: Z[2], duration: 16, ease: "cine" },
      46,
    );

    /* ---- 62–76  lens -> vertical slit. The image pushes to 1.45 so the last
       sliver still carries real detail instead of a squashed thumbnail. ----- */
    tl.fromTo(
      bed,
      { "--fx": LENS_X, "--fy": LENS_Y },
      { "--fx": cfg.slitX, "--fy": SLIT_Y, duration: 14, ease: "aurumIn" },
      62,
    )
      .fromTo(bedInner, { scale: 1 }, { scale: 1.45, duration: 14 }, 62)
      .fromTo(
        pivot,
        { rotationY: R[2], rotationX: X[2], z: Z[2] },
        { rotationY: R[3], rotationX: X[3], z: Z[3], duration: 14, ease: "cine" },
        62,
      );

    /* ---- 76–82  the slit closes as the plane goes edge-on. Black. --------- */
    tl.fromTo(
      bed,
      { "--fx": cfg.slitX, "--fy": SLIT_Y },
      { "--fx": 0, "--fy": 0, duration: 6, ease: "aurumIn" },
      76,
    ).fromTo(
      pivot,
      { rotationY: R[3], rotationX: X[3], z: Z[3] },
      { rotationY: R[4], rotationX: X[4], z: Z[4], duration: 6, ease: "aurumIn" },
      76,
    );

    /* ---- 72–96  the far wall resolves, at a crawl ------------------------- */
    tl.fromTo(
      far,
      { opacity: 0, z: -1700 * d, xPercent: 6, rotationY: 8 * d },
      { opacity: 0.85, z: -1050 * d, xPercent: 0, rotationY: 0, duration: 24, ease: "cine" },
      72,
    );

    /* ---- 80–90  the title card rides forward ------------------------------ */
    tl.fromTo(card, { z: -240 * d }, { z: 0, duration: 10, ease: "cine" }, 80);

    /* ---- 82–91  the letters arrive out of deep space, one by one ---------- */
    letters.forEach((el, i) => {
      tl.fromTo(
        el,
        {
          opacity: 0,
          z: -(800 + i * 70) * d,
          yPercent: 40,
          rotationY: (26 - i * 4) * d,
          rotationX: (i % 2 === 0 ? -14 : -8) * d,
        },
        {
          opacity: 1,
          z: 0,
          yPercent: 0,
          rotationY: 0,
          rotationX: 0,
          duration: 5.5,
          ease: "aurum",
          transformOrigin: "50% 60%",
        },
        82 + i * 0.85,
      );
    });

    /* ---- 91–95  the gold rule draws outward from its own centre ----------- */
    tl.fromTo(
      rule,
      { scaleX: 0 },
      { scaleX: 1, duration: 4, ease: "curtain", transformOrigin: "50% 50%" },
      91,
    );

    /* ---- 93–98  the credits rise on the opposite rail --------------------- */
    tl.fromTo(
      sub,
      { opacity: 0, yPercent: 70 },
      { opacity: 1, yPercent: 0, duration: 5, ease: "aurum" },
      93,
    ).fromTo(
      year,
      { opacity: 0, yPercent: 95 },
      { opacity: 1, yPercent: 0, duration: 4, ease: "aurum" },
      94,
    );

    /* Dummy tween that carries the timeline to exactly 100, so the finished
       card sits perfectly still through the last 2% of the pin. */
    tl.to({ hold: 0 }, { hold: 1, duration: 2 }, 98);

    buildFooter();

    /* ---- pointer parallax -------------------------------------------------
     * Driven on .final-tilt, which the scrubbed timeline never touches — the
     * whole room leans as one body, so every Z plane parallaxes correctly.
     * Only armed while the shot is HELD (the opening frame and the finished
     * title card); during the collapse the scrub owns the drama. */
    if (cfg.tilt && tilt) {
      const setY = gsap.quickTo(tilt, "rotationY", { duration: 1.1, ease: "power3" });
      const setX = gsap.quickTo(tilt, "rotationX", { duration: 1.1, ease: "power3" });

      let armed = true;
      const st = ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: "+=" + cfg.end + "%",
        onUpdate: (self) => {
          const next = self.progress < 0.24 || self.progress > 0.84;
          if (next === armed) return;
          armed = next;
          // Return the room to square the moment the tilt is disarmed,
          // otherwise a stale lean rides through the whole collapse.
          if (!armed) {
            setY(0);
            setX(0);
          }
        },
      });

      const onMove = (e: PointerEvent) => {
        if (!armed) return;
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setY(nx * 3.6);
        setX(-ny * 2.4);
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      // Returned to matchMedia, NOT collected outside it — otherwise a
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

  /* ---- reduced motion: the complete composition, at rest ------------------
     No pin, no collapse. The frame stays open, the title card sits on it
     behind a veil that guarantees contrast, and the footer is fully drawn.
     Every inline resting state authored in the TSX is undone here. */
  mm.add(MQ.reduced, () => {
    gsap.set(q(".final-tilt"), { rotationX: 0, rotationY: 0 });
    gsap.set(q(".final-pivot"), { rotationX: 0, rotationY: 0, z: 0 });
    gsap.set(q(".final-bed"), { "--fx": 75, "--fy": 75, "--cx": 50, "--cy": 50 });
    gsap.set(q(".final-bed-inner"), { scale: 1, yPercent: 0 });
    gsap.set(q(".final-deep"), { opacity: 1, z: 0, yPercent: 0 });
    gsap.set(q(".final-veil"), { opacity: 0.62 });
    gsap.set(q(".final-far"), { opacity: 0.85, z: 0, xPercent: 0, rotationY: 0 });
    gsap.set(q(".final-meta"), { opacity: 1, z: 0, rotationY: 0 });
    gsap.set(q(".final-cue"), { opacity: 1, z: 0, yPercent: 0 });
    gsap.set(q(".final-edge"), { opacity: 1, xPercent: 0 });
    gsap.set(q(".final-card"), { z: 0 });
    gsap.set(q(".final-letter"), {
      opacity: 1,
      z: 0,
      yPercent: 0,
      rotationX: 0,
      rotationY: 0,
    });
    gsap.set(q(".final-rule"), { scaleX: 1 });
    gsap.set(q(".final-sub"), { opacity: 1, yPercent: 0 });
    gsap.set(q(".final-year"), { opacity: 1, yPercent: 0 });
    gsap.set(q(".final-footer-rule"), { scaleX: 1 });
    gsap.set(q(".final-footer-row"), { opacity: 1, yPercent: 0 });
  });

  return () => mm.revert();
}
