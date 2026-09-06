"use client";

import { gsap, ScrollTrigger, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/* ------------------------------------------------------------------
   CHAPTER 02 — NATURE / OUR PHILOSOPHY

   Built as a room, not a page. Three Z planes live inside one
   perspective and move at three different rates:

     DEEP  (.nature-deep)   the photograph, starting 560px back as a
                            letterboxed slot and arriving at the glass.
     MID   (.nature-char)   the word NATURE — six independently hinged
                            panels, each a window onto the same picture.
     FORE  (.nature-fore)   the editorial furniture, sitting 90px in
                            FRONT of the glass and receding first.

   The word keeps background-clip:text — that is the chapter's identity.
   Each glyph is handed its own slice of nature.webp, offset by the
   letter's layout position inside the word, so at rest the six windows
   compose one continuous photograph. The instant the letters hinge apart
   in 3D each one carries its slice with it and the picture breaks into
   six views of the same forest seen from six angles.

   The photograph's crop inside the letters lives in three inherited
   custom properties on the <h2> (--nt-bw / --nt-bx / --nt-by), so a
   single tween on the parent drives the image inside all six windows at
   once while GSAP owns the transform of each char outright — the two
   never touch the same property.
------------------------------------------------------------------ */

export const NATURE_BG_IMAGE = "url(/images/nature.webp)";
export const NATURE_WORD = ["N", "A", "T", "U", "R", "E"] as const;

/** nature.webp is 3200x2400 — needed to resolve "115% auto" into pixels. */
const IMG_RATIO = 2400 / 3200;
const MID = (NATURE_WORD.length - 1) / 2;

type Mode = {
  /** Pin length. */
  end: string;
  /** Horizontal fan of the folding screen, as a fraction of stage width. */
  fan: number;
  /** Global multiplier on every Z distance. */
  depth: number;
  /** rotationY of the outermost letter at full open, in degrees. */
  hinge: number;
  /** Peak scale of the word. */
  wordScale: number;
  /**
   * Mobile redesign: instead of a symmetric folding screen the letters
   * stack into a one-point staircase running away from the reader, and
   * the word climbs rather than spreads. A phone has no room to fan.
   */
  cascade: boolean;
  /** Pointer-parallax tilt on the word wrapper. */
  tilt: boolean;
};

const DESKTOP: Mode = {
  end: "+=380%",
  fan: 0.085,
  depth: 1,
  hinge: 46,
  wordScale: 1.14,
  cascade: false,
  tilt: true,
};

const TABLET: Mode = {
  end: "+=300%",
  fan: 0.052,
  depth: 0.68,
  hinge: 34,
  wordScale: 1.1,
  cascade: false,
  tilt: false,
};

const MOBILE: Mode = {
  end: "+=230%",
  fan: 0.016,
  depth: 0.44,
  hinge: 26,
  wordScale: 1.06,
  cascade: true,
  tilt: false,
};

export function initNature(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  const one = (sel: string) => q(sel)[0] as HTMLElement;
  const all = (sel: string) => q(sel) as HTMLElement[];

  const build = (mode: Mode): (() => void) => {
    const stage = one(".nature-stage");
    const ground = one(".nature-ground");
    const deep = one(".nature-deep");
    const reveal = one(".nature-reveal");
    const revealInner = one(".nature-reveal-inner");
    const scrim = one(".nature-reveal-scrim");

    const enter = one(".nature-type-enter");
    const tilt = one(".nature-tilt");
    const scaler = one(".nature-type-scaler");
    const h2 = one(".nature-type");
    const chars = all(".nature-char");

    const fore = all(".nature-fore");
    const meta = one(".nature-meta");
    const thesis = one(".nature-thesis");
    const copy = one(".nature-copy");
    const quote = one(".nature-quote");

    const ruleDeep = one(".nature-rule-deep");
    const ruleFore = one(".nature-rule-fore");
    const ribbon = one(".nature-ribbon");
    const ribbonTrack = one(".nature-ribbon-track");
    const ribbonLoop = one(".nature-ribbon-loop");

    /* ---------------- geometry ---------------------------------------- */

    const cx: number[] = [];
    const cy: number[] = [];
    let SW = 0;
    let SH = 0;
    let W = 0;
    let H = 0;

    /* Resolve background-size "<k>00% auto" and background-position into
       pixels against the <h2> box, with an optional drift. */
    const bgW = (k: number) => W * k;
    const bgX = (k: number, driftX: number) => (W - W * k) / 2 - W * driftX;
    const bgY = (k: number, driftY: number) => (H - W * k * IMG_RATIO) * 0.45 - H * driftY;

    const d = (i: number) => i - MID; // -2.5 … 2.5
    const sg = (i: number) => Math.sign(d(i));
    const ad = (i: number) => Math.abs(d(i));

    /* Open pose — the folding screen. Outer panels swing outward AND back,
       the two centre panels come forward, so the word becomes a shallow
       bay you look into rather than a line that spreads. */
    const fanX = (i: number) =>
      mode.cascade
        ? d(i) * SW * mode.fan
        : sg(i) * SW * mode.fan * (0.34 + ad(i) * 0.3);

    const fanY = (i: number) =>
      mode.cascade ? -SH * 0.012 * (i - MID) : (i % 2 === 0 ? -1 : 1) * SH * 0.018;

    const fanZ = (i: number) =>
      mode.cascade
        ? -(i * 165) * mode.depth // one-point staircase into the screen
        : (150 - ad(i) * 172) * mode.depth;

    const fanRY = (i: number) =>
      mode.cascade ? -mode.hinge * 0.9 : sg(i) * mode.hinge * (0.3 + ad(i) * 0.28);

    const fanRX = (i: number) =>
      mode.cascade ? 4 * mode.depth : (i % 2 === 0 ? -1 : 1) * 5.5 * mode.depth;

    /* Every panel hinges on the edge that faces the centre of the word —
       that is what makes it read as one folding object instead of six
       unrelated letters. */
    const hingeOrigin = (i: number) =>
      mode.cascade ? "0% 50%" : d(i) < 0 ? "100% 50%" : "0% 50%";

    /* Exit pose — the letters fall away from the reader and the picture
       behind them takes the room. */
    const exitZ = (i: number) => -(580 + ad(i) * 150) * mode.depth;
    const exitX = (i: number) => fanX(i) * 1.5;
    const exitRY = (i: number) =>
      mode.cascade ? -mode.hinge * 1.6 : sg(i) * mode.hinge * 1.45;

    /* Paint one glyph's window. The shared crop lives in --nt-* on the
       <h2>; this element subtracts its own layout offset so at rest the
       six windows line up into a single continuous photograph. */
    const applyWindow = (c: HTMLElement, i: number) => {
      const s = c.style;
      s.setProperty("background-image", NATURE_BG_IMAGE);
      s.setProperty("background-repeat", "no-repeat");
      s.setProperty("background-size", "var(--nt-bw, " + bgW(1.15) + "px) auto");
      s.setProperty(
        "background-position",
        "calc(var(--nt-bx, " +
          bgX(1.15, 0) +
          "px) - " +
          cx[i] +
          "px) calc(var(--nt-by, " +
          bgY(1.15, 0) +
          "px) - " +
          cy[i] +
          "px)",
      );
      s.setProperty("-webkit-background-clip", "text");
      s.setProperty("background-clip", "text");
      s.setProperty("-webkit-text-fill-color", "transparent");
      s.setProperty("color", "transparent");
    };

    /* Rects are only true when nothing is transformed, so neutralise the
       whole word chain first. ScrollTrigger re-renders the scrub straight
       after refreshInit, which puts every pose back. */
    const measure = () => {
      SW = stage.clientWidth;
      SH = stage.clientHeight;

      gsap.set([enter, tilt], { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0 });
      gsap.set(scaler, { x: 0, y: 0, z: 0, scale: 1, rotationX: 0, rotationY: 0 });
      gsap.set(chars, { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, opacity: 1 });

      W = h2.offsetWidth;
      H = h2.offsetHeight;

      const hr = h2.getBoundingClientRect();
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        cx[i] = r.left - hr.left;
        cy[i] = r.top - hr.top;
      });
      chars.forEach(applyWindow);

      gsap.set(h2, {
        "--nt-bw": bgW(1.15) + "px",
        "--nt-bx": bgX(1.15, 0) + "px",
        "--nt-by": bgY(1.15, 0) + "px",
      });
    };

    measure();

    /* Once the six windows own their own crops the parent must stop
       painting its own, or the two crops fight each other. */
    h2.style.backgroundImage = "none";

    gsap.set(chars, {
      transformOrigin: (i: number) => hingeOrigin(i),
      force3D: true,
    });

    const onRefreshInit = () => measure();
    ScrollTrigger.addEventListener("refreshInit", onRefreshInit);

    /* ---------------- arrival, before the pin engages ------------------ */

    gsap
      .timeline({
        defaults: { ease: "none", immediateRender: false },
        scrollTrigger: {
          trigger: root,
          start: "top 82%",
          end: "top 8%",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
      /* The word swings up out of the floor of the room. */
      .fromTo(
        enter,
        { z: -520, rotationX: -13 },
        {
          z: 0,
          rotationX: 0,
          duration: 0.72,
          ease: "cine",
          transformOrigin: "50% 100%",
          force3D: true,
        },
        0,
      )
      /* Foreground furniture arrives from in front of the picture plane,
         each block on its own slightly different axis. */
      .fromTo(
        fore,
        {
          z: -420,
          rotationY: (i: number) => (i % 2 === 0 ? 15 : -15),
          opacity: 0,
        },
        {
          z: 90,
          rotationY: 0,
          opacity: 1,
          duration: 0.6,
          ease: "aurum",
          stagger: 0.07,
          force3D: true,
        },
        0.12,
      )
      .fromTo(
        all(".nature-rise"),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.5, ease: "aurum", stagger: 0.035 },
        0.2,
      )
      .fromTo(
        all(".nature-vrule"),
        { scaleY: 0 },
        { scaleY: 1, duration: 0.44, ease: "curtain", transformOrigin: "50% 0%" },
        0.3,
      )
      .fromTo(
        ruleDeep,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.6, ease: "curtain", transformOrigin: "0% 50%" },
        0.24,
      )
      .fromTo(
        ruleFore,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.5, ease: "curtain", transformOrigin: "100% 50%" },
        0.36,
      )
      .fromTo(ribbon, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.42);

    /* Endless base drift of the ribbon — eight identical cells, so a
       -50% travel is seamless. */
    gsap.to(ribbonLoop, {
      xPercent: -50,
      duration: 40,
      ease: "none",
      repeat: -1,
      force3D: true,
    });

    /* ---------------- the pinned master timeline ----------------------- */

    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: mode.end,
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    /* 0.00 → 0.30  the camera pushes INSIDE the letters, and the word as
       a whole leans a step closer to the reader. */
    tl.fromTo(
      h2,
      {
        "--nt-bw": () => bgW(1.15) + "px",
        "--nt-bx": () => bgX(1.15, 0) + "px",
        "--nt-by": () => bgY(1.15, 0) + "px",
      },
      {
        "--nt-bw": () => bgW(1.5) + "px",
        "--nt-bx": () => bgX(1.5, 0.04) + "px",
        "--nt-by": () => bgY(1.5, 0.5) + "px",
        duration: 0.3,
        ease: "cine",
      },
      0,
    ).fromTo(
      scaler,
      { scale: 1, z: 0, y: 0 },
      {
        scale: mode.wordScale,
        z: 130 * mode.depth,
        y: 0,
        duration: 0.3,
        ease: "cine",
        force3D: true,
      },
      0,
    );

    /* 0.04 → 0.44  the folding screen opens. Each panel hinges on the
       edge facing the centre, so the word turns into a volume. */
    tl.fromTo(
      chars,
      { x: 0, y: 0, z: 0, rotationY: 0, rotationX: 0 },
      {
        x: (i: number) => fanX(i),
        y: (i: number) => fanY(i),
        z: (i: number) => fanZ(i),
        rotationY: (i: number) => fanRY(i),
        rotationX: (i: number) => fanRX(i),
        duration: 0.4,
        ease: "cine",
        stagger: { each: 0.018, from: (mode.cascade ? "start" : "center") as "start" | "center" },
        force3D: true,
      },
      0.04,
    );

    /* 0.26 → 0.78  the photograph travels 560px forward, from a
       letterboxed slot suspended in porcelain to the glass itself. */
    tl.fromTo(
      deep,
      { z: -560 },
      { z: 120, duration: 0.52, ease: "cine", force3D: true },
      0.26,
    );

    /* 0.40 → 0.74  and, arriving, it opens. One clip-path function
       throughout — inset() only, never a shape swap. */
    tl.fromTo(
      reveal,
      { clipPath: "inset(34% 0% 34% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.34, ease: "curtain" },
      0.4,
    ).fromTo(
      revealInner,
      { scale: 1.24, yPercent: 3 },
      { scale: 1, yPercent: 0, duration: 0.38, ease: "cine", force3D: true },
      0.4,
    );

    /* 0.32 → 0.54  the foreground leaves first, and it leaves BACKWARD —
       past the reader's shoulder is a cheap trick; falling away from the
       picture as the picture advances is the depth exchange. Everything
       ink-coloured is gone before the photograph reaches it. */
    tl.fromTo(
      [meta, thesis, copy],
      { z: 90, rotationY: 0, opacity: 1 },
      {
        z: -470,
        rotationY: (i: number) => (i % 2 === 0 ? -17 : 17),
        opacity: 0,
        duration: 0.18,
        ease: "aurumIn",
        stagger: 0.03,
        force3D: true,
      },
      0.32,
    )
      .fromTo(
        quote,
        { z: 90, rotationY: 0, opacity: 1 },
        {
          z: -520,
          rotationY: -21,
          opacity: 0,
          duration: 0.16,
          ease: "aurumIn",
          force3D: true,
        },
        0.38,
      )
      .fromTo(
        ruleFore,
        { scaleX: 1 },
        { scaleX: 0, duration: 0.12, ease: "aurumIn", transformOrigin: "100% 50%" },
        0.36,
      )
      .fromTo(
        ruleDeep,
        { scaleX: 1 },
        { scaleX: 0, duration: 0.14, ease: "aurumIn", transformOrigin: "0% 50%" },
        0.44,
      );

    /* 0.50 → 0.84  the letters retreat into the picture they were cut
       from — further, and turned further, than they ever fanned. */
    tl.fromTo(
      chars,
      {
        x: (i: number) => fanX(i),
        z: (i: number) => fanZ(i),
        rotationY: (i: number) => fanRY(i),
        opacity: 1,
      },
      {
        x: (i: number) => exitX(i),
        z: (i: number) => exitZ(i),
        rotationY: (i: number) => exitRY(i),
        opacity: 0,
        duration: 0.34,
        ease: "aurumIn",
        stagger: { each: 0.022, from: (mode.cascade ? "end" : "center") as "end" | "center" },
        force3D: true,
      },
      0.5,
    ).fromTo(
      scaler,
      { scale: mode.wordScale, z: 130 * mode.depth, y: 0 },
      {
        scale: mode.wordScale * 1.05,
        z: 40 * mode.depth,
        y: () => -SH * 0.08,
        duration: 0.34,
        ease: "aurumIn",
        force3D: true,
      },
      0.5,
    );

    /* 0.00 → 1.00  three planes, three rates. This is the parallax that
       keeps the room feeling like a room. */
    tl.fromTo(ribbonTrack, { xPercent: 0 }, { xPercent: -34, duration: 1, force3D: true }, 0)
      .fromTo(meta, { y: 0 }, { y: () => -SH * 0.3, duration: 1, force3D: true }, 0)
      .fromTo(thesis, { y: 0 }, { y: () => -SH * 0.15, duration: 1, force3D: true }, 0)
      .fromTo(copy, { y: 0 }, { y: () => -SH * 0.23, duration: 1, force3D: true }, 0)
      .fromTo(quote, { y: 0 }, { y: () => -SH * 0.35, duration: 1, force3D: true }, 0);

    /* 0.58 → 0.72  the ribbon is the last thing standing, and the ground
       under it turns from porcelain to photograph — so its ink flips to
       ivory exactly as the frame's bottom edge passes beneath it. */
    tl.fromTo(
      ribbon,
      { color: "rgba(5,6,10,0.62)" },
      { color: "rgba(242,239,232,0.86)", duration: 0.14 },
      0.58,
    );

    /* 0.76 → 0.92  the frame grades down for the handoff. */
    tl.fromTo(scrim, { opacity: 0 }, { opacity: 0.34, duration: 0.16 }, 0.76);

    /* 0.84 → 1.00  the porcelain ground tips away from the reader on its
       bottom edge and wipes up off the screen, handing chapter 03 ink. */
    tl.fromTo(
      ground,
      { rotationX: 0, y: 0, clipPath: "inset(0% 0% 0% 0%)" },
      {
        rotationX: 9,
        y: "-5vh",
        // No wipe. A pinned 100vh stage still has ~1 viewport of scroll left
        // after its pin releases, and the stage occupies all of it. Clipping
        // the ground away turns that stretch into a hole between chapters;
        // leaving it whole means the frame simply scrolls off under the next
        // section, with no gap at all. The tip and lift carry the handoff.
        duration: 0.16,
        ease: "curtain",
        transformOrigin: "50% 100%",
        force3D: true,
      },
      0.84,
    ).fromTo(ribbon, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "aurumIn" }, 0.86);

    /* ---------------- pointer parallax --------------------------------
     * Written to .nature-tilt, a wrapper that the scrubbed timeline never
     * touches — the timeline owns z/scale on .nature-type-scaler and
     * rotationY/z on every .nature-char, and two writers on one property
     * would overwrite each other every frame. Live only while the word is
     * the subject, so the arrival and the retreat stay choreography. */
    if (!mode.tilt) {
      return () => {
        ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
        chars.forEach((c) => c.removeAttribute("style"));
        h2.style.backgroundImage = NATURE_BG_IMAGE;
      };
    }

    const setY = gsap.quickTo(tilt, "rotationY", { duration: 0.9, ease: "power3" });
    const setX = gsap.quickTo(tilt, "rotationX", { duration: 0.9, ease: "power3" });

    let live = false;
    const gate = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: mode.end,
      onUpdate: (self) => {
        live = self.progress > 0.08 && self.progress < 0.5;
        if (!live) {
          setY(0);
          setX(0);
        }
      },
    });

    const onMove = (e: PointerEvent) => {
      if (!live) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setY(nx * 7);
      setX(-ny * 4.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    /* Returned to matchMedia, never pushed to an outer array — otherwise a
       breakpoint change leaves this dead branch's listener writing
       transforms onto the live one. */
    return () => {
      window.removeEventListener("pointermove", onMove);
      gate.kill();
      ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
      chars.forEach((c) => c.removeAttribute("style"));
      h2.style.backgroundImage = NATURE_BG_IMAGE;
    };
  };

  mm.add(MQ.desktop, () => build(DESKTOP));
  mm.add(MQ.tablet, () => build(TABLET));
  mm.add(MQ.mobile, () => build(MOBILE));

  /* ---- reduced motion -----------------------------------------------
   * Lands on progress 0 of the scroll path exactly: the word at full
   * bleed as one continuous photograph, the picture behind it held as a
   * letterboxed slot 560px back, and every word of copy legible on
   * porcelain. Nothing here is a pose the scrub cannot also produce.
   *
   * measure()/applyWindow never runs in this branch, so the <h2> keeps
   * its own background-clip:text crop and the word still paints. */
  mm.add(MQ.reduced, () => {
    gsap.set(all(".nature-rise"), { yPercent: 0 });
    gsap.set(all(".nature-vrule"), { scaleY: 1, transformOrigin: "50% 0%" });
    gsap.set(one(".nature-rule-deep"), { scaleX: 1, transformOrigin: "0% 50%" });
    gsap.set(one(".nature-rule-fore"), { scaleX: 1, transformOrigin: "100% 50%" });
    gsap.set(all(".nature-fore"), { z: 90, rotationY: 0, y: 0, opacity: 1 });
    gsap.set(one(".nature-type-enter"), { z: 0, rotationX: 0, y: 0 });
    gsap.set(one(".nature-tilt"), { rotationX: 0, rotationY: 0 });
    gsap.set(one(".nature-type-scaler"), { scale: 1, z: 0, y: 0 });
    gsap.set(all(".nature-char"), {
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      opacity: 1,
    });
    gsap.set(one(".nature-deep"), { z: -560 });
    gsap.set(one(".nature-reveal"), { clipPath: "inset(34% 0% 34% 0%)" });
    gsap.set(one(".nature-reveal-inner"), { scale: 1.24, yPercent: 3 });
    gsap.set(one(".nature-reveal-scrim"), { opacity: 0 });
    gsap.set(one(".nature-ribbon"), { opacity: 1, color: "rgba(5,6,10,0.62)" });
    gsap.set(one(".nature-ribbon-track"), { xPercent: 0 });
    gsap.set(one(".nature-ground"), {
      rotationX: 0,
      y: 0,
      clipPath: "inset(0% 0% 0% 0%)",
    });
  });

  return () => mm.revert();
}
