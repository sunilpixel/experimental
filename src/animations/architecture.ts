"use client";

import { gsap, ScrollTrigger, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/* ------------------------------------------------------------------
   ◆ ARCHITECTURE — the corridor.

   One pinned, scrubbed master timeline normalised to a 0 → 1 duration.
   Four marquee planes are hung at four different depths inside the stage
   perspective and raked on rotationX so they read as ceiling, two flat
   middles and a floor. The camera advances through them; the word marks
   float in front on their own Z; the whole room finally tips back and
   compresses as chapter 05 takes the screen.

   Four separate elements carry four separate motions, so no two tweens ever
   write to the same property of the same node:

     .arch-plane       depth pose      z / rotationX / rotationY / scale
     .arch-row         scrubbed parallax   x, in vw
     .arch-drift       idle marquee        xPercent, repeat -1, never stops
     .arch-img         counter-move        scale / yPercent
     .arch-camera      pointer tilt        rotationX / rotationY (desktop)

   The drift translates by exactly one third of its own width — the frame
   list is rendered three times — so the wrap is seamless, and the two spare
   list-widths absorb the parallax offset without ever exposing an edge.
------------------------------------------------------------------ */

type PlanePlan = {
  /** Settled depth, in px, before the breakpoint depth multiplier. */
  z: number;
  /** Settled rake. Negative tips the top edge away — a ceiling. */
  rx: number;
  ry: number;
  /** Where the plane flies in from. */
  arriveZ: number;
  arriveRx: number;
  /** Scrubbed horizontal travel, in vw. Nearer planes travel further. */
  x0: number;
  x1: number;
  /** -1 drifts left, +1 drifts right. */
  dir: -1 | 1;
  /** Seconds for one full idle wrap. Deeper planes are slower. */
  loop: number;
};

/* Speed is a function of depth: plane 2 sits at -70 and covers 30vw in 60s,
   plane 0 sits at -560 and covers 10vw in 124s. That is what sells the room. */
const PLANES: PlanePlan[] = [
  { z: -560, rx: -38, ry: 0, arriveZ: -1280, arriveRx: -60, x0: 5, x1: -5, dir: -1, loop: 124 },
  { z: -220, rx: -11, ry: 7, arriveZ: -940, arriveRx: -32, x0: -13, x1: 8, dir: 1, loop: 86 },
  { z: -70, rx: 9, ry: -6, arriveZ: -840, arriveRx: 28, x0: 10, x1: -20, dir: -1, loop: 60 },
  { z: -400, rx: 34, ry: 0, arriveZ: -1180, arriveRx: 56, x0: -8, x1: 5, dir: 1, loop: 104 },
];

type WordPlan = {
  /** Progress at which the word arrives. */
  at: number;
  /** Settled depth — in front of every plane. */
  z: number;
  /** Settled turn off the picture plane. */
  ry: number;
  x0: number;
  x1: number;
};

const WORDS: WordPlan[] = [
  { at: 0.13, z: 190, ry: 15, x0: -7, x1: 6 },
  { at: 0.31, z: 265, ry: -13, x0: 6, x1: -8 },
  { at: 0.49, z: 125, ry: 10, x0: -5, x1: 7 },
];

/** One list-width, expressed as a percentage of the three-copy track. */
const WRAP = 100 / 3;

type Cfg = {
  pin: boolean;
  start: string;
  end: string;
  /** Multiplies every translateZ. */
  depth: number;
  /** Multiplies every rotationX / rotationY. */
  tilt: number;
  /** Multiplies every horizontal travel distance, in vw. */
  strength: number;
  /** Closing tip-and-compress handoff — only where the stage is pinned. */
  handoff: boolean;
  pointer: boolean;
};

const DESKTOP: Cfg = {
  pin: true,
  start: "top top",
  end: "+=360%",
  depth: 1,
  tilt: 1,
  strength: 1,
  handoff: true,
  pointer: true,
};

const TABLET: Cfg = {
  pin: true,
  start: "top top",
  end: "+=250%",
  depth: 0.72,
  tilt: 0.72,
  strength: 0.72,
  handoff: true,
  pointer: false,
};

/* Mobile is a different layout, not a smaller one: the planes fall into a
   flowing vertical rhythm, so there is nothing to pin and the timeline runs
   across the section as it passes the viewport. */
const MOBILE: Cfg = {
  pin: false,
  start: "top 85%",
  end: "bottom 15%",
  depth: 0.42,
  tilt: 0.45,
  strength: 0.5,
  handoff: false,
  pointer: false,
};

export function initArchitecture(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  const build = (cfg: Cfg): (() => void) | void => {
    const stage = q(".arch-stage")[0] as HTMLElement | undefined;
    if (!stage) return;

    const camera = q(".arch-camera")[0] as HTMLElement | undefined;
    const shell = q(".arch-shell");
    const planes = q(".arch-plane");
    const rows = q(".arch-row");
    const drifts = q(".arch-drift");
    const types = q(".arch-type");
    const typeDrifts = q(".arch-type-drift");
    const typeLines = q(".arch-type-line");
    const watermark = q(".arch-watermark");
    const coda = q(".arch-coda");

    /* --- idle marquee: outside the timeline, on its own element ---------- */
    drifts.forEach((drift, i) => {
      const p = PLANES[i];
      if (!p) return;
      const head = p.dir === -1 ? 0 : -WRAP;
      const tail = p.dir === -1 ? -WRAP : 0;
      gsap.fromTo(
        drift,
        { xPercent: head },
        { xPercent: tail, duration: p.loop, ease: "none", repeat: -1, force3D: true },
      );
    });

    /* The diamond already carries a static 45deg from CSS; a full turn lands
       back on itself, so the repeat is invisible. */
    gsap.to(q(".arch-diamond"), { rotation: 405, duration: 26, ease: "none", repeat: -1 });

    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: cfg.pin ? stage : root,
        start: cfg.start,
        end: cfg.end,
        pin: cfg.pin ? stage : false,
        pinSpacing: cfg.pin,
        anticipatePin: cfg.pin ? 1 : 0,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    /* --- 0.00 → 0.14  the deepest plane surfaces ------------------------- */
    tl.fromTo(
      watermark,
      { opacity: 0, z: -1450 * cfg.depth, scale: 0.92 },
      { opacity: 1, z: -1050 * cfg.depth, scale: 1, duration: 0.14, ease: "aurum", force3D: true },
      0,
    )
      .fromTo(
        watermark,
        { x: `${3 * cfg.strength}vw` },
        { x: `${-4 * cfg.strength}vw`, duration: 1, force3D: true },
        0,
      )
      /* it recedes again with everything else */
      .fromTo(
        watermark,
        { z: -1050 * cfg.depth },
        { z: -1600 * cfg.depth, duration: 0.14, ease: "cine", force3D: true },
        0.86,
      );

    /* --- the four planes: arrive, travel, recede ------------------------- */
    planes.forEach((plane, i) => {
      const p = PLANES[i];
      if (!p) return;

      const baseZ = p.z * cfg.depth;
      const baseRx = p.rx * cfg.tilt;
      const baseRy = p.ry * cfg.tilt;
      /* Mid-flight pose: the camera has advanced, so every plane is nearer and
         has flattened toward the picture plane. */
      const midZ = baseZ + 150 * cfg.depth;
      const midRx = baseRx * 0.62;
      const midRy = baseRy * -0.45;

      const arriveAt = i * 0.02;
      const settled = arriveAt + 0.17;

      // 0.00 → 0.22  out of deep space, staggered by plane
      tl.fromTo(
        plane,
        {
          z: p.arriveZ * cfg.depth,
          rotationX: p.arriveRx * cfg.tilt,
          rotationY: baseRy * 1.8,
          scale: 0.86,
        },
        {
          z: baseZ,
          rotationX: baseRx,
          rotationY: baseRy,
          scale: 1,
          duration: 0.17,
          ease: "aurum",
          force3D: true,
        },
        arriveAt,
      );

      // settled → 0.86  the camera advances down the corridor
      tl.fromTo(
        plane,
        { z: baseZ, rotationX: baseRx, rotationY: baseRy },
        {
          z: midZ,
          rotationX: midRx,
          rotationY: midRy,
          duration: 0.86 - settled,
          force3D: true,
        },
        settled,
      );

      // 0.86 → 1.00  the room folds away
      tl.fromTo(
        plane,
        { z: midZ, rotationX: midRx, rotationY: midRy, scale: 1 },
        {
          z: baseZ - 700 * cfg.depth,
          rotationX: midRx * 2.1,
          rotationY: midRy * 2.2,
          scale: 0.92,
          duration: 0.14,
          ease: "cine",
          force3D: true,
        },
        0.86,
      );

      // horizontal parallax, whole timeline, on the row — never the drift
      const row = rows[i];
      if (row) {
        tl.fromTo(
          row,
          { x: `${p.x0 * cfg.strength}vw` },
          { x: `${p.x1 * cfg.strength}vw`, duration: 1, force3D: true },
          0,
        );
      }

      // the photographs counter-move inside their own frames
      const imgs = gsap.utils.selector(plane)(".arch-img");
      if (imgs.length) {
        const sign = i % 2 === 0 ? 1 : -1;
        tl.fromTo(
          imgs,
          { scale: 1.16, yPercent: 5 * sign },
          { scale: 1.04, yPercent: -5 * sign, duration: 1, force3D: true },
          0,
        );
      }
    });

    /* --- the word marks: nearer Z, turned off the picture plane ---------- */
    types.forEach((type, i) => {
      const w = WORDS[i];
      if (!w) return;
      const z = w.z * cfg.depth;
      const ry = w.ry * cfg.tilt;

      tl.fromTo(
        type,
        { opacity: 0, z: -620 * cfg.depth, rotationY: ry * 2.8 },
        { opacity: 1, z, rotationY: ry, duration: 0.14, ease: "aurum", force3D: true },
        w.at,
      );

      const line = typeLines[i];
      if (line) {
        tl.fromTo(line, { yPercent: 112 }, { yPercent: 0, duration: 0.11, ease: "curtain" }, w.at + 0.01);
      }

      const drift = typeDrifts[i];
      if (drift) {
        tl.fromTo(
          drift,
          { x: `${w.x0 * cfg.strength}vw` },
          { x: `${w.x1 * cfg.strength}vw`, duration: 0.92, force3D: true },
          0,
        );
      }

      tl.fromTo(
        type,
        { opacity: 1, z, rotationY: ry },
        {
          opacity: 0,
          z: z - 620 * cfg.depth,
          rotationY: -ry * 2.4,
          duration: 0.13,
          ease: "aurumIn",
          force3D: true,
        },
        0.87,
      );
    });

    /* --- foreground meta ------------------------------------------------- */
    tl.fromTo(
      q(".arch-meta"),
      { opacity: 0, z: -300 * cfg.depth, y: "3vh" },
      {
        opacity: 1,
        z: 240 * cfg.depth,
        y: 0,
        duration: 0.14,
        ease: "aurum",
        stagger: 0.05,
        force3D: true,
      },
      0.02,
    )
      .fromTo(
        q(".arch-mask-line"),
        { yPercent: 112 },
        { yPercent: 0, duration: 0.12, ease: "curtain", stagger: 0.05 },
        0.05,
      )
      .fromTo(
        q(".arch-rule"),
        { scaleX: 0, scaleY: 0 },
        { scaleX: 1, scaleY: 1, duration: 0.14, ease: "curtain", stagger: 0.06 },
        0.07,
      )
      .fromTo(
        q(".arch-meta"),
        { opacity: 1, z: 240 * cfg.depth },
        { opacity: 0, z: -260 * cfg.depth, duration: 0.12, ease: "aurumIn", force3D: true },
        0.88,
      );

    /* --- the closing italic: nearest thing in the room, arriving last ---- */
    tl.fromTo(
      coda,
      { opacity: 0, z: -520 * cfg.depth, rotationY: 12 * cfg.tilt, x: `${4 * cfg.strength}vw` },
      {
        opacity: 1,
        z: 300 * cfg.depth,
        rotationY: -5 * cfg.tilt,
        x: 0,
        duration: 0.16,
        ease: "aurum",
        force3D: true,
      },
      0.62,
    )
      .fromTo(
        q(".arch-coda-line"),
        { yPercent: 112 },
        { yPercent: 0, duration: 0.13, ease: "curtain" },
        0.64,
      )
      .fromTo(
        coda,
        { opacity: 1, z: 300 * cfg.depth },
        { opacity: 0, z: -240 * cfg.depth, duration: 0.12, ease: "aurumIn", force3D: true },
        0.88,
      );

    /* --- 0.86 → 1.00  the whole room tips back and compresses ------------ */
    if (cfg.handoff) {
      tl.fromTo(
        shell,
        { rotationX: 0, scaleY: 1, y: 0 },
        {
          rotationX: 9 * cfg.tilt,
          scaleY: 0.52,
          y: "-5vh",
          duration: 0.14,
          ease: "cine",
          transformOrigin: "50% 50%",
          force3D: true,
        },
        0.86,
      );
    }

    /* --- pointer parallax, desktop only ----------------------------------
     * Driven on .arch-camera, an element nothing else touches. The scrubbed
     * timeline owns rotationX on .arch-shell and rotationX/rotationY on every
     * plane; writing the tilt onto either would have the two overwrite each
     * other every frame. */
    if (cfg.pointer && camera) {
      const setY = gsap.quickTo(camera, "rotationY", { duration: 1.1, ease: "power3" });
      const setX = gsap.quickTo(camera, "rotationX", { duration: 1.1, ease: "power3" });

      let active = false;
      const st = ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          active = self.isActive;
          if (!active) {
            setY(0);
            setX(0);
          }
        },
      });

      const onMove = (e: PointerEvent) => {
        if (!active) return;
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setY(nx * 4.2);
        setX(-ny * 2.6);
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      /* Returned to matchMedia, never pushed to an outer array — otherwise a
         breakpoint change leaves this dead branch's listener writing
         transforms onto the live one. */
      return () => {
        window.removeEventListener("pointermove", onMove);
        st.kill();
      };
    }
  };

  mm.add(MQ.desktop, () => build(DESKTOP));
  mm.add(MQ.tablet, () => build(TABLET));
  mm.add(MQ.mobile, () => build(MOBILE));

  /* ---- reduced motion: the complete composition, at rest, flattened
     enough to stay legible without any of the travel. -------------------- */
  mm.add(MQ.reduced, () => {
    q(".arch-plane").forEach((plane, i) => {
      const p = PLANES[i];
      if (!p) return;
      gsap.set(plane, {
        z: p.z * 0.5,
        rotationX: p.rx * 0.5,
        rotationY: p.ry * 0.5,
        scale: 1,
      });
    });
    q(".arch-type").forEach((type, i) => {
      const w = WORDS[i];
      gsap.set(type, { opacity: 1, z: (w ? w.z : 160) * 0.5, rotationY: 0 });
    });
    gsap.set(q(".arch-row"), { x: 0 });
    gsap.set(q(".arch-drift"), { xPercent: 0 });
    gsap.set(q(".arch-img"), { scale: 1.06, yPercent: 0 });
    gsap.set(q(".arch-type-drift"), { x: 0 });
    gsap.set(q(".arch-type-line"), { yPercent: 0 });
    gsap.set(q(".arch-coda-line"), { yPercent: 0 });
    gsap.set(q(".arch-mask-line"), { yPercent: 0 });
    gsap.set(q(".arch-rule"), { scaleX: 1, scaleY: 1 });
    gsap.set(q(".arch-meta"), { opacity: 1, z: 120, y: 0 });
    gsap.set(q(".arch-coda"), { opacity: 1, z: 150, rotationY: 0, x: 0 });
    gsap.set(q(".arch-watermark"), { opacity: 1, z: -520, x: 0, scale: 1 });
    gsap.set(q(".arch-shell"), { rotationX: 0, scaleY: 1, y: 0 });
    gsap.set(q(".arch-camera"), { rotationX: 0, rotationY: 0 });
    gsap.set(q(".arch-diamond"), { rotation: 45 });
  });

  return () => mm.revert();
}
