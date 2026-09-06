"use client";

import { gsap, scoped, MQ, split, adoptRestingTransforms } from "@/lib/gsap";

/**
 * CHAPTER 01 — HERO
 *
 * A camera move through space, not a curtain.
 *
 * The chapter is built as a volume. Three photographic planes sit at genuinely
 * different depths inside one perspective container, and the scroll dollies the
 * lens forward through all three:
 *
 *   NEAR  z    0 → +520   two door leaves, hinged on the centre of the frame
 *   MID   z -480 → -150 → -760   the sharp film, pushed in then let go
 *   FAR   z -820 → -300   the reveal, opening through a growing iris
 *
 * The headline lives in its own camera on the same axis: LUXURY nearest the
 * viewer and passing it, DIFFERENTLY growing out of deep space toward the lens.
 * The five watermark letters each hold their own Z so the wordmark occupies a
 * volume instead of a line.
 *
 * Rules this module holds to:
 *   1. Every scrubbed tween is a fromTo() and the timeline defaults to
 *      { ease:"none", immediateRender:false } — scrubbing backwards restores
 *      state instead of stranding it.
 *   2. No clip-path ever crosses shape functions. inset() stays inset(),
 *      circle() stays circle().
 *   3. Window listeners created inside an mm.add() callback are torn down by
 *      the teardown returned from THAT callback.
 *   4. Nothing is ever blurred. Depth is made with Z, not with focus.
 */

/* ------------------------------------------------------------------
   Camera
------------------------------------------------------------------ */

/** Stage perspective, in px. Shared by the stage and the world container. */
const P = 1500;

/** Scale that keeps an inset-0 plane exactly full-bleed at depth z. */
const fill = (z: number) => (P - z) / P;

/** Round to 3dp so the value written into the TSX matches the tween exactly. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Resting depth + the compensating scale for each photographic plane.
 * Each plane's scale is sized against the DEEPEST z it ever reaches, so the
 * frame is full-bleed across the whole dolly and never exposes an edge.
 *
 * Consumed by both this module and <Hero/>, which writes them as inline styles
 * so the composition is correct on the very first painted frame.
 */
export const HERO_PLANES = {
  perspective: P,
  /** Door leaves — flush with the lens, then past it. */
  door: { z: 0, scale: 1.02 },
  /** The sharp film. Deepest point is -760 on the way out. */
  mid: { z: -480, scale: r3(fill(-760) * 1.05), ry: 5, rx: -2 },
  /** The reveal. Deepest point is its own start. */
  far: { z: -820, scale: r3(fill(-820) * 1.05), ry: -7, rx: 3 },
} as const;

/** How far apart the leaves sit once the overture has cracked them open, in
 *  percent of the viewport. ~10px of sharp film at 1440. */
const SLIT = 0;

/**
 * A U R U M — five letters, five depths, five angles.
 * `left` is pre-compensated for the perspective shrink at each letter's z so
 * the row still spans the frame once it is scattered through the volume.
 */
export const HERO_WATERMARK = [
  { char: "A", left: "-2.5%", z: -140, ry: 13 },
  { char: "U", left: "19.4%", z: -420, ry: -9 },
  { char: "R", left: "37%", z: -680, ry: 18 },
  { char: "U", left: "55.3%", z: -320, ry: -14 },
  { char: "M", left: "77.5%", z: -80, ry: 9 },
] as const;

/** Perspective for the watermark's own camera — flatter, so it reads as depth
 *  rather than as distortion at 25vw glyph sizes. */
export const HERO_LETTER_PERSPECTIVE = 2200;

/* ------------------------------------------------------------------
   Per-breakpoint choreography
------------------------------------------------------------------ */

type Cfg = {
  /** ScrollTrigger end offset. */
  end: string;
  /** Scales every Z travel in the chapter. */
  depth: number;
  /** Door hinge angle at full open. */
  swing: number;
  /**
   * Which axis the doors hinge on. "y" splits the frame down the middle;
   * "x" turns them into shutters, which is the only split that reads on a
   * portrait phone. The matching clip-paths live in <Hero/>'s media query.
   */
  doorAxis: "y" | "x";
  /** Headline lateral drift at full travel, in vw. */
  drift: number;
  /** Per-letter horizontal drift for A U R U M, in px. Null = row mode. */
  letterX: number[] | null;
  /** Mobile: one slow drift on the whole watermark row instead. */
  rowX: number | null;
};

const DESKTOP: Cfg = {
  end: "+=520%",
  depth: 1,
  swing: 84,
  doorAxis: "y",
  drift: 24,
  letterX: [-150, 100, -80, 180, -120],
  rowX: null,
};

const TABLET: Cfg = {
  end: "+=420%",
  depth: 0.74,
  swing: 68,
  doorAxis: "y",
  drift: 17,
  letterX: [-104, 70, -56, 126, -84],
  rowX: null,
};

const MOBILE: Cfg = {
  end: "+=320%",
  depth: 0.48,
  swing: 62,
  doorAxis: "x",
  drift: 11,
  letterX: null,
  rowX: -96,
};

export function initHero(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  /** The overture plays exactly once per page life, never on a resize. */
  let introPlayed = false;

  const build = (cfg: Cfg): (() => void) | void => {
    const stage = q(".hero-stage")[0] as HTMLElement;
    const frame = q(".hero-frame");
    const cut = q(".hero-cut");

    const doorA = q(".hero-door-a");
    const doorB = q(".hero-door-b");
    const doors = [...doorA, ...doorB];
    const doorInner = q(".hero-door-inner");

    const mid = q(".hero-plane-mid");
    const midInner = q(".hero-mid-inner");

    const far = q(".hero-plane-far");
    const circle = q(".hero-circle");
    const circleInner = q(".hero-circle-inner");

    const words = q(".hero-word");
    const line1 = q(".hero-line-1");
    const line2 = q(".hero-line-2");
    const line3 = q(".hero-line-3");
    const lines = [...line1, ...line2, ...line3];

    const lettersRow = q(".hero-letters");
    const letters = q(".hero-letter");

    /* Re-assert the resting custom properties that the TSX declared inline.
       GSAP removes a custom property it has tweened when the timeline is
       reverted, and React will not put it back — it reuses the same DOM node
       and its props have not changed. The inline `clip-path: ellipse(calc(var(--fx)...))`
       then resolves against an undefined var, computes to 0, and the whole
       frame is clipped away: the chapter renders black. Setting them here makes
       the resting state survive any revert. */
    


    const numerals = q(".hero-numerals");
    const subline = q(".hero-subline");
    const cue = q(".hero-scrollcue");
    const cueLine = q(".hero-cue-line");
    const film = q(".hero-film");
    const chrome = [...numerals, ...subline, ...cue, ...film];

    const d = cfg.depth;
    const vertical = cfg.doorAxis === "y";

    /** Leaf A is the left (or top) half, leaf B the right (or bottom) half. */
    const shut = (dir: 1 | -1) => ({
      z: 0,
      scale: HERO_PLANES.door.scale,
      rotationX: 0,
      rotationY: 0,
      xPercent: vertical ? -SLIT * dir : 0,
      yPercent: vertical ? 0 : -SLIT * dir,
    });

    /** Both leaves swing TOWARD the lens and sweep out past it. */
    const open = (dir: 1 | -1) => ({
      z: 520 * d,
      scale: HERO_PLANES.door.scale * 1.12,
      rotationX: vertical ? 0 : -cfg.swing * dir,
      rotationY: vertical ? cfg.swing * dir : 0,
      xPercent: vertical ? -22 * dir : 0,
      yPercent: vertical ? 0 : -26 * dir,
    });

    /* ================================================================
       INTRO — on mount, gated on the preloader, not on scroll
       ================================================================ */

    const s1 = split(q(".hero-word-1"), "chars");
    const s2 = split(q(".hero-word-2"), "chars");
    const s3 = split(q(".hero-word-3"), "chars");

    gsap.set(words, { opacity: 1 });

    // The watermark's resting pose. GSAP owns the transform cache from here so
    // the intro never has to decompose the inline matrix.
    letters.forEach((el, i) => {
      gsap.set(el, { z: HERO_WATERMARK[i].z, rotationY: HERO_WATERMARK[i].ry });
    });

    const rise = {
      yPercent: 110,
      rotation: 6,
      opacity: 0,
      duration: 1.5,
      ease: "aurum",
      force3D: true,
    };

    // Paused: the overture must land on the FIRST frame the visitor actually
    // sees. <Preloader/> covers the viewport for ~2s, so playing on mount would
    // burn the whole reveal behind the panel.
    const intro = gsap.timeline({ delay: 0.35, paused: true });

    intro
      // The doors crack apart on a hairline of sharp film.
      .fromTo(
        doorA,
        vertical ? { xPercent: 0 } : { yPercent: 0 },
        {
          ...(vertical ? { xPercent: -SLIT } : { yPercent: -SLIT }),
          duration: 1.8,
          ease: "curtain",
          force3D: true,
        },
        0.1,
      )
      .fromTo(
        doorB,
        vertical ? { xPercent: 0 } : { yPercent: 0 },
        {
          ...(vertical ? { xPercent: SLIT } : { yPercent: SLIT }),
          duration: 1.8,
          ease: "curtain",
          force3D: true,
        },
        0.1,
      )
      .from(s1.chars, { ...rise, stagger: { each: 0.034, from: "center" } }, 0.3)
      .from(s2.chars, { ...rise, stagger: { each: 0.034, from: "center" } }, 0.44)
      .from(s3.chars, { ...rise, stagger: { each: 0.026, from: "center" } }, 0.58)
      // The wordmark arrives out of the volume rather than fading up flat.
      .fromTo(
        letters,
        {
          opacity: 0,
          yPercent: 7,
          z: (i: number) => HERO_WATERMARK[i].z - 300,
          rotationY: (i: number) => HERO_WATERMARK[i].ry * 1.9,
        },
        {
          opacity: 1,
          yPercent: 0,
          z: (i: number) => HERO_WATERMARK[i].z,
          rotationY: (i: number) => HERO_WATERMARK[i].ry,
          duration: 2.1,
          ease: "aurum",
          stagger: 0.07,
          force3D: true,
        },
        0.85,
      )
      .fromTo(
        chrome,
        { opacity: 0, y: 26, z: -220, rotationX: -16 },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotationX: 0,
          duration: 1.35,
          ease: "aurum",
          stagger: 0.08,
          transformPerspective: 1400,
          force3D: true,
        },
        1.05,
      )
      // The masks have done their job; from here the words move in Z and must
      // be allowed to outgrow their own line boxes.
      .set(lines, { overflow: "visible" });

    let cleanup: (() => void) | undefined;

    if (introPlayed) {
      intro.progress(1, true);
    } else {
      intro.eventCallback("onComplete", () => {
        introPlayed = true;
      });

      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        intro.play();
      };

      if (document.documentElement.hasAttribute("data-aurum-loaded")) {
        start();
      } else {
        window.addEventListener("aurum:loaded", start, { once: true });
        // Returned to matchMedia, never collected outside it — otherwise a
        // breakpoint change leaves a dead branch's listener alive.
        cleanup = () => window.removeEventListener("aurum:loaded", start);
        // Failsafe: if the preloader ever throws before it signals, the hero
        // must still open rather than sit on an invisible headline forever.
        gsap.delayedCall(4.5, start);
      }
    }

    /* The scroll cue's hairline, drawn down and retracted, forever. */
    gsap.fromTo(
      cueLine,
      { scaleY: 0.08, transformOrigin: "top center" },
      {
        scaleY: 1,
        duration: 1.5,
        ease: "aurum",
        repeat: -1,
        yoyo: true,
        repeatDelay: 0.28,
      },
    );

    /* ================================================================
       SCROLL — one pinned, scrubbed master timeline (total duration 1)
       ================================================================ */

    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: cfg.end,
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
    tl.set(cut, { "--cut": "0%" }, 0);
    tl.set(circle, { "--circ": "0%" }, 0);


    /* ---- P01 · 0.02 → 0.22 — the meta recedes into the room ------------- */
    tl.fromTo(
      numerals,
      { x: 0, z: 0, rotationY: 0, opacity: 1 },
      {
        x: -90,
        z: -420 * d,
        rotationY: 24,
        opacity: 0,
        duration: 0.2,
        ease: "aurumIn",
        transformPerspective: 1400,
        force3D: true,
      },
      0.02,
    )
      .fromTo(
        subline,
        { y: 0, z: 0, rotationX: 0, opacity: 1 },
        {
          y: 70,
          z: -360 * d,
          rotationX: -30,
          opacity: 0,
          duration: 0.2,
          ease: "aurumIn",
          transformPerspective: 1400,
          force3D: true,
        },
        0.04,
      )
      .fromTo(
        cue,
        { y: 0, z: 0, rotationX: 0, opacity: 1 },
        {
          y: 92,
          z: -300 * d,
          rotationX: -34,
          opacity: 0,
          duration: 0.16,
          ease: "aurumIn",
          transformPerspective: 1400,
          force3D: true,
        },
        0.02,
      )
      .fromTo(
        film,
        { x: 0, z: 0, rotationY: 0, opacity: 1 },
        {
          x: 110,
          z: -380 * d,
          rotationY: -28,
          opacity: 0,
          duration: 0.2,
          ease: "aurumIn",
          transformPerspective: 1400,
          force3D: true,
        },
        0.04,
      );

    /* ---- P02 · 0.04 → 0.34 — the door swings open past the lens ---------
     * Each leaf is hinged on the centre of the frame and rotates TOWARD the
     * viewer, one positive and one negative, while it dollies forward. The
     * clip-paths are static: nothing here interpolates a shape function. */
    tl.fromTo(doorA, shut(1), { ...open(1), duration: 0.3, ease: "cine", force3D: true }, 0.04)
      .fromTo(doorB, shut(-1), { ...open(-1), duration: 0.3, ease: "cine", force3D: true }, 0.04)
      .fromTo(
        doorInner,
        { scale: 1.14, rotation: -2.4 },
        { scale: 1.24, rotation: -0.6, duration: 0.3, ease: "cine", force3D: true },
        0.04,
      )
      // They only fade once they are already edge-on, so the swing is read as
      // geometry rather than as a dissolve.
      .fromTo(
        doors,
        { opacity: 1 },
        { opacity: 0, duration: 0.1, ease: "power2.in" },
        0.24,
      );

    /* ---- P03 · 0.02 → 0.86 — the sharp film pushes in, then lets go ----- */
    tl.fromTo(
      mid,
      {
        z: HERO_PLANES.mid.z,
        rotationY: HERO_PLANES.mid.ry,
        rotationX: HERO_PLANES.mid.rx,
      },
      {
        z: -150,
        rotationY: 0,
        rotationX: 0,
        duration: 0.48,
        ease: "cine",
        force3D: true,
      },
      0.02,
    )
      .fromTo(
        midInner,
        { scale: 1.1, rotation: -1.6 },
        { scale: 1.0, rotation: 0, duration: 0.48, ease: "cine", force3D: true },
        0.02,
      )
      // It never leaves — it simply falls back behind the reveal and keeps the
      // frame full, so nothing ever cuts to black.
      .fromTo(
        mid,
        { z: -150, rotationY: 0 },
        { z: -760, rotationY: -6, duration: 0.36, ease: "cine", force3D: true },
        0.5,
      )
      .fromTo(
        midInner,
        { scale: 1.0, rotation: 0 },
        { scale: 1.08, rotation: 0.8, duration: 0.36, ease: "cine", force3D: true },
        0.5,
      );

    /* ---- P04 · 0.02 → 0.86 — the reveal rises out of deep space --------
     * It travels the whole chapter, crossing in front of the sharp film around
     * 0.6 so the iris opens on top of it rather than behind it. */
    tl.fromTo(
      far,
      {
        z: HERO_PLANES.far.z,
        rotationY: HERO_PLANES.far.ry,
        rotationX: HERO_PLANES.far.rx,
      },
      {
        z: -300,
        rotationY: 0,
        rotationX: 0,
        duration: 0.84,
        ease: "cine",
        force3D: true,
      },
      0.02,
    );

    /* ---- P05 · 0.46 → 0.78 — the iris. circle() only, never inset() ----- */
    tl.fromTo(
      circle,
      { "--circ": "0%" },
      { "--circ": "34%", duration: 0.12, ease: "curtain" },
      0.46,
    )
      .fromTo(
        circle,
        { "--circ": "34%" },
        { "--circ": "72%", duration: 0.1, ease: "none" },
        0.58,
      )
      .fromTo(
        circle,
        { "--circ": "72%" },
        { "--circ": "106%", duration: 0.1, ease: "cine" },
        0.68,
      )
      .fromTo(
        circleInner,
        { scale: 1.3, rotation: 2 },
        { scale: 1.0, rotation: 0, duration: 0.36, ease: "cine", force3D: true },
        0.46,
      );

    /* ---- P06 · 0.00 → 0.30 — LUXURY passes the viewer ------------------- */
    tl.fromTo(
      line1,
      { z: -60, x: 0, rotationY: 0, rotation: 0, scale: 1 },
      {
        z: 980 * d,
        x: () => (-cfg.drift * window.innerWidth) / 100,
        rotationY: -18,
        rotation: -2.4,
        scale: 1.08,
        duration: 0.3,
        ease: "aurumIn",
        force3D: true,
      },
      0,
    ).fromTo(
      line1,
      { opacity: 1 },
      { opacity: 0, duration: 0.1, ease: "power1.in" },
      0.18,
    );

    /* ---- P07 · 0.05 → 0.40 — LIVES follows it out, the other way -------- */
    tl.fromTo(
      line2,
      { z: -380, x: 0, rotationY: 0, rotation: 0, scale: 1 },
      {
        z: 740 * d,
        x: () => (cfg.drift * 0.86 * window.innerWidth) / 100,
        rotationY: 16,
        rotation: 2,
        scale: 1.06,
        duration: 0.35,
        ease: "aurumIn",
        force3D: true,
      },
      0.05,
    ).fromTo(
      line2,
      { opacity: 1 },
      { opacity: 0, duration: 0.1, ease: "power1.in" },
      0.28,
    );

    /* ---- P08 · 0.06 → 0.56 — DIFFERENTLY grows toward the lens ---------
     * Two chained fromTo segments rather than a keyframe block, so every
     * boundary value is explicit and a backwards scrub restores it. */
    tl.fromTo(
      line3,
      {
        z: -820,
        scale: 1,
        rotationY: 14,
        rotationX: -8,
        yPercent: 0,
        letterSpacing: "0.01em",
      },
      {
        z: -200,
        scale: 1.06,
        rotationY: 3,
        rotationX: -2,
        yPercent: -4,
        letterSpacing: "0.09em",
        duration: 0.24,
        ease: "cine",
        transformOrigin: "50% 50%",
        force3D: true,
      },
      0.06,
    )
      .fromTo(
        line3,
        {
          z: -200,
          scale: 1.06,
          rotationY: 3,
          rotationX: -2,
          yPercent: -4,
          letterSpacing: "0.09em",
        },
        {
          z: 760 * d,
          scale: 1.3,
          rotationY: -7,
          rotationX: 0,
          yPercent: -14,
          letterSpacing: "0.26em",
          duration: 0.26,
          ease: "cine",
          transformOrigin: "50% 50%",
          force3D: true,
        },
        0.3,
      )
      .fromTo(
        line3,
        { opacity: 1 },
        { opacity: 0, duration: 0.1, ease: "power2.in" },
        0.46,
      );

    /* ---- P09 · 0.00 → 0.62 — the wordmark holds its own volume ---------- */
    if (cfg.letterX) {
      const xs = cfg.letterX;
      letters.forEach((el, i) => {
        const base = HERO_WATERMARK[i];
        tl.fromTo(
          el,
          { x: 0, yPercent: 0, z: base.z, rotationY: base.ry },
          {
            x: xs[i],
            yPercent: i % 2 === 0 ? -6 : 5,
            z: base.z + (i % 2 === 0 ? 320 : -300) * d,
            rotationY: base.ry + (i % 2 === 0 ? -16 : 14),
            duration: 0.6 + i * 0.06,
            force3D: true,
          },
          0,
        )
          .fromTo(el, { "--lo": 0.09 }, { "--lo": 0.26, duration: 0.34, ease: "aurum" }, 0.06)
          .fromTo(el, { "--lo": 0.26 }, { "--lo": 0, duration: 0.4 }, 0.4);
      });
    } else {
      // Mobile: the row drifts as one, but the letters keep their depths.
      tl.fromTo(lettersRow, { x: 0 }, { x: cfg.rowX ?? 0, duration: 0.78, force3D: true }, 0);
      letters.forEach((el, i) => {
        const base = HERO_WATERMARK[i];
        tl.fromTo(
          el,
          { z: base.z, rotationY: base.ry },
          {
            z: base.z + (i % 2 === 0 ? 200 : -180) * d,
            rotationY: base.ry * 0.4,
            duration: 0.62,
            force3D: true,
          },
          0,
        );
      });
      tl.fromTo(letters, { "--lo": 0.09 }, { "--lo": 0.24, duration: 0.32, ease: "aurum" }, 0.06)
        .fromTo(letters, { "--lo": 0.24 }, { "--lo": 0, duration: 0.4 }, 0.38);
    }

    /* ---- P10 · 0.84 → 1.00 — the frame tips back and is wiped away ------
     * The tip runs on the stage's own perspective; the wipe is a single inset()
     * driven on a custom property, so no shape function is ever crossed. */
    tl.fromTo(
      frame,
      { rotationX: 0, z: 0, yPercent: 0, scale: 1 },
      {
        rotationX: 8,
        z: -180,
        yPercent: -7,
        scale: 1.16,
        duration: 0.16,
        ease: "cine",
        transformOrigin: "50% 50%",
        force3D: true,
      },
      0.84,
    ).fromTo(
      cut,
      { "--cut": "0%" },
      { "--cut": "34%", duration: 0.14, ease: "curtain" },
      0.86,
    );

    return cleanup;
  };

  mm.add(MQ.desktop, () => build(DESKTOP));
  mm.add(MQ.tablet, () => build(TABLET));
  mm.add(MQ.mobile, () => build(MOBILE));

  /* ================================================================
     REDUCED — no pin, no travel. The opening frame, complete and legible:
     doors shut on the graded film, the full headline, all chrome present.
     ================================================================ */
  mm.add(MQ.reduced, () => {
    gsap.set(q(".hero-word"), { opacity: 1 });
    gsap.set([...q(".hero-line-1"), ...q(".hero-line-2"), ...q(".hero-line-3")], {
      overflow: "visible",
      opacity: 1,
      x: 0,
      z: 0,
      yPercent: 0,
      scale: 1,
      rotation: 0,
      rotationX: 0,
      rotationY: 0,
      letterSpacing: "0.01em",
    });

    gsap.set([...q(".hero-door-a"), ...q(".hero-door-b")], {
      opacity: 1,
      z: HERO_PLANES.door.z,
      scale: HERO_PLANES.door.scale,
      rotationX: 0,
      rotationY: 0,
      xPercent: 0,
      yPercent: 0,
    });
    gsap.set(q(".hero-door-inner"), { scale: 1.14, rotation: -2.4 });

    gsap.set(q(".hero-plane-mid"), {
      z: HERO_PLANES.mid.z,
      rotationX: 0,
      rotationY: 0,
    });
    gsap.set(q(".hero-mid-inner"), { scale: 1.1, rotation: 0 });

    gsap.set(q(".hero-plane-far"), {
      z: HERO_PLANES.far.z,
      rotationX: 0,
      rotationY: 0,
    });
    gsap.set(q(".hero-circle"), { "--circ": "0%" });
    gsap.set(q(".hero-circle-inner"), { scale: 1.3, rotation: 0 });

    q(".hero-letter").forEach((el, i) => {
      gsap.set(el, {
        opacity: 1,
        x: 0,
        yPercent: 0,
        z: HERO_WATERMARK[i].z,
        rotationY: HERO_WATERMARK[i].ry,
        "--lo": 0.09,
      });
    });
    gsap.set(q(".hero-letters"), { x: 0 });

    gsap.set(q(".hero-chrome"), {
      opacity: 1,
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
    });

    gsap.set(q(".hero-cut"), { "--cut": "0%" });
    gsap.set(q(".hero-frame"), { rotationX: 0, z: 0, yPercent: 0, scale: 1 });
  });

  return () => mm.revert();
}
