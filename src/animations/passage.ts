"use client";

import { gsap, MQ, scoped, adoptRestingTransforms } from "@/lib/gsap";

/**
 * THE PASSAGE — a scroll-driven flight down a corridor of portals.
 *
 * THE MATHS
 * ---------
 * Seven portals sit on one axis: portal `i` is parked at `translateZ(-i * GAP)`
 * inside `.psg-camera`, a preserve-3d child of the stage that carries the
 * perspective. Scroll drives exactly ONE value — the camera's own Z — and the
 * whole corridor streams past the lens as a result. No portal is ever animated
 * along the flight axis itself.
 *
 *   distance of portal i from the lens:  d = i * GAP - cameraZ
 *   camera range:  -VIEW  ->  (N - 1) * GAP - VIEW
 *
 * VIEW is the "well-framed" distance (0.34 * GAP), so the first portal opens
 * the chapter already composed and the last one is left hanging at that same
 * reading distance instead of being flown through. Everything else — fog, the
 * portal's own rotation, the caption reveal, the inner image parallax — is
 * derived from `d` inside a single onUpdate and pushed out through
 * quickSetters. One ScrollTrigger, one timeline, seven portals.
 *
 * DEPTH FOG
 * ---------
 * Opacity ramps up as a portal crosses the far plane and ramps back to zero
 * BEFORE it reaches the camera plane, so nothing ever tears through the lens.
 * There is no blur anywhere in this file, by design: depth is Z, scale and
 * opacity only.
 */

const clamp01 = gsap.utils.clamp(0, 1);
const clamp1 = gsap.utils.clamp(-1, 1);
/** Hermite smoothstep — a linear falloff reads mechanical at these speeds. */
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Smoothstepped 0->1 ramp between two thresholds. */
const ramp = (v: number, a: number, b: number) => smooth(clamp01((v - a) / (b - a)));

/** Lateral / vertical placement per portal, as a fraction of the lateral unit.
 *  First and last are dead centre: the chapter opens and lands square. */
const LAT = [0, 1, -0.95, 0.62, -1, 0.55, 0];
const VER = [0, -0.5, 0.34, -0.22, 0.46, -0.36, 0];

type Corridor = {
  end: string;
  /** Z spacing between portals, px. */
  gap: number;
  /** Ideal viewing distance, as a multiple of gap. */
  view: number;
  /** Fog band, all as multiples of gap. */
  nearOut: number;
  nearIn: number;
  farIn: number;
  farOut: number;
  /** Lateral offset unit, as a fraction of viewport width. */
  lateral: number;
  /** Base rotationY of an off-axis portal, degrees. */
  tilt: number;
};

const DESKTOP: Corridor = {
  end: "+=600%",
  gap: 900,
  view: 0.18,
  nearOut: 0.05,
  nearIn: 0.26,
  farIn: 2.4,
  farOut: 3.5,
  lateral: 0.058,
  tilt: 4.5,
};

/* Tablet holds a shorter corridor: the far plane sits at 2.5 gaps, so three
   portals are alive at once instead of four. */
const TABLET: Corridor = {
  end: "+=460%",
  gap: 700,
  view: 0.22,
  nearOut: 0.06,
  nearIn: 0.28,
  farIn: 1.7,
  farOut: 2.5,
  lateral: 0.05,
  tilt: 4,
};

/** Mobile is not a tunnel — see buildProcession. */
const MOBILE = {
  end: "+=340%",
  /** Vertical spacing, as a fraction of stage height. */
  step: 0.66,
  /** How far back a portal falls once it is off the reading line. */
  depth: 240,
  /** Tilt as a portal crosses the reading line. */
  tiltX: 15,
  /** Half-band, in steps, at which a portal has faded out. */
  band: 1.25,
  lateral: 0.05,
};

export function initPassage(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  const stage = q(".psg-stage")[0] as HTMLElement | undefined;
  const camera = q(".psg-camera")[0] as HTMLElement | undefined;
  const portals = q(".psg-portal") as HTMLElement[];
  const plates = q(".psg-plate") as HTMLElement[];
  const caps = q(".psg-cap") as HTMLElement[];
  const capIns = q(".psg-cap-in") as HTMLElement[];
  const imgs = q(".psg-img") as HTMLElement[];
  const marks = q(".psg-mark") as HTMLElement[];
  const chrome = q(".psg-fg") as HTMLElement[];
  const bar = q(".psg-bar")[0] as HTMLElement | undefined;
  const count = q(".psg-count")[0] as HTMLElement | undefined;

  if (!stage || !camera || !portals.length) return () => mm.revert();

  const n = portals.length;

  /* ------------------------------------------------------------------
     Shared setter rig. quickSetter writes straight to the element with no
     interpolation, which is what a scrubbed derivation wants: the scrub
     already smooths the camera, and a lagging tween would let a portal punch
     through the lens at full opacity on a fast flick.

     Opacity is deliberately NOT written to .psg-portal. An element with
     opacity < 1 is forced to transform-style: flat, which would collapse the
     caption out of the portal's own 3D space. The portal stays fully opaque
     and preserve-3d; the plate and the caption carry their own alpha.
  ------------------------------------------------------------------ */
  const setPlateAlpha = plates.map((el) => gsap.quickSetter(el, "opacity"));
  const setPlateSX = plates.map((el) => gsap.quickSetter(el, "scaleX"));
  const setPlateSY = plates.map((el) => gsap.quickSetter(el, "scaleY"));
  const setCapAlpha = caps.map((el) => gsap.quickSetter(el, "opacity"));
  const setCapY = capIns.map((el) => gsap.quickSetter(el, "yPercent", "%"));
  const setImgX = imgs.map((el) => gsap.quickSetter(el, "xPercent", "%"));
  const setMarkAlpha = marks.map((el) => gsap.quickSetter(el, "opacity"));

  let shown = -1;
  const writeCount = (i: number) => {
    if (!count || i === shown) return;
    shown = i;
    count.textContent = String(i + 1).padStart(2, "0");
  };

  /** Fixed foreground frame + progress rule. Identical in every motion branch. */
  const addChrome = (tl: gsap.core.Timeline) => {
    if (chrome.length) {
      tl.fromTo(
        chrome,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.05, ease: "aurum", stagger: 0.012 },
        0.004,
      ).fromTo(
        chrome,
        { opacity: 1, y: 0 },
        { opacity: 0, y: -12, duration: 0.045, ease: "aurumIn" },
        0.955,
      );
    }
    if (bar) {
      tl.fromTo(
        bar,
        { scaleX: 0 },
        { scaleX: 1, duration: 1, transformOrigin: "0% 50%", force3D: true },
        0,
      );
    }
  };

  /* ==================================================================
     DESKTOP + TABLET — the corridor
  ================================================================== */
  const buildCorridor = (cfg: Corridor) => {
    const GAP = cfg.gap;
    const VIEW = cfg.view * GAP;
    const startZ = -VIEW;
    const endZ = (n - 1) * GAP - VIEW;

    const nearOut = cfg.nearOut * GAP;
    const nearIn = cfg.nearIn * GAP;
    const farIn = cfg.farIn * GAP;
    const farOut = cfg.farOut * GAP;
    /** Width of the well-framed window either side of VIEW. */
    const frameBand = 1.35 * GAP;

    /** An off-axis portal turns its far edge back, so it faces the axis of
     *  flight rather than sitting parallel like a billboard. */
    const baseRot = LAT.slice(0, n).map((l) => Math.sign(l) * cfg.tilt);

    const setPlateRY = plates.map((el) => gsap.quickSetter(el, "rotationY", "deg"));

    /* Portal placement is pure layout: recomputed on refresh, never scrubbed. */
    const layout = () => {
      const vw = window.innerWidth;
      const vh = stage.offsetHeight || window.innerHeight;
      const unit = vw * cfg.lateral;

      portals.forEach((p, i) => {
        gsap.set(p, {
          x: (LAT[i] ?? 0) * unit,
          y: (VER[i] ?? 0) * unit * 0.62,
          z: -i * GAP,
          rotationX: 0,
          force3D: true,
        });
      });

      /* The watermarks are the corridor's side walls: angled panels hung
         between the portals, each on its own Z plane so they parallax. */
      marks.forEach((m, k) => {
        const side = k % 2 ? 1 : -1;
        gsap.set(m, {
          x: side * vw * 0.46,
          y: (k % 3 === 0 ? -0.17 : 0.21) * vh,
          z: -(k * GAP * 0.92 + GAP * 0.5),
          rotationY: side * 34,
          force3D: true,
        });
      });
    };

    gsap.set(camera, { z: startZ, y: 0, force3D: true });
    /* quickSetter writes are not recorded by matchMedia, so a breakpoint change
       out of the mobile procession would leave its plate rotationX / z baked
       into the inline style. Reset the props this branch does not own. */
    gsap.set(plates, { rotationX: 0, z: 0 });
    layout();

    /** True while a portal is inside the fog band — lets us skip dead writes. */
    const live = new Array<boolean>(n).fill(true);

    const fogAt = (d: number) =>
      ramp(d, nearOut, nearIn) * (1 - ramp(d, farIn, farOut));

    let tl: gsap.core.Timeline | null = null;

    const paint = () => {
      if (!tl) return;
      const camZ = (gsap.getProperty(camera, "z") as number) || 0;

      let best = 0;
      let bestE = -1;

      for (let i = 0; i < n; i++) {
        const d = i * GAP - camZ;
        const fog = fogAt(d);

        /* How well the portal is framed: 1 at the sweet spot, 0 a gap and a
           half either side of it. Drives rotation, scale and the caption. */
        const e = 1 - clamp01(Math.abs(d - VIEW) / frameBand);
        if (e > bestE) {
          bestE = e;
          best = i;
        }

        if (fog <= 0.002) {
          if (live[i]) {
            setPlateAlpha[i](0);
            setCapAlpha[i](0);
            live[i] = false;
          }
          continue;
        }
        live[i] = true;

        const es = smooth(e);
        setPlateAlpha[i](fog);
        // Squares itself up as it arrives, turns away again as it leaves.
        setPlateRY[i](baseRot[i] * (1 - 0.75 * es));
        const s = 0.93 + 0.07 * es;
        setPlateSX[i](s);
        setPlateSY[i](s);

        // The photograph slides against its aperture: a window, not a poster.
        setImgX[i]((LAT[i] ?? 0) * -4.5 * (1 - es));

        // The caption is only legible while its portal is well framed.
        const cap = ramp(e, 0.34, 0.78) * fog;
        setCapAlpha[i](cap);
        setCapY[i]((1 - cap) * 112);
      }

      for (let k = 0; k < marks.length; k++) {
        setMarkAlpha[k](fogAt(k * GAP * 0.92 + GAP * 0.5 - camZ));
      }

      writeCount(best);
    };

    tl = gsap.timeline({
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
        onRefreshInit: layout,
        onRefresh: paint,
      },
      onUpdate: paint,
    });

    /* THE ONLY FLIGHT TWEEN. Every portal effect above is derived from it. */
    tl.fromTo(camera, { z: startZ }, { z: endZ, duration: 1, force3D: true }, 0);
    addChrome(tl);

    paint();
  };

  /* ==================================================================
     MOBILE — same language, different grammar.

     A phone GPU should not be asked to composite a seven-deep tunnel, so the
     corridor is rotated into a vertical procession: the portals queue on the Y
     axis, the camera tracks down the queue, and each portal falls back in Z,
     tips on X and scales as it crosses the reading line. Shallow — 240px of Z
     travel, three portals alive at once — but still dimensional.
  ================================================================== */
  const buildProcession = () => {
    const setPlateZ = plates.map((el) => gsap.quickSetter(el, "z", "px"));
    const setPlateRX = plates.map((el) => gsap.quickSetter(el, "rotationX", "deg"));

    let STEP = (stage.offsetHeight || window.innerHeight) * MOBILE.step;

    const layout = () => {
      const vw = window.innerWidth;
      STEP = (stage.offsetHeight || window.innerHeight) * MOBILE.step;

      portals.forEach((p, i) => {
        gsap.set(p, {
          x: (LAT[i] ?? 0) * vw * MOBILE.lateral,
          y: i * STEP,
          z: 0,
          force3D: true,
        });
      });

      marks.forEach((m, k) => {
        const side = k % 2 ? 1 : -1;
        gsap.set(m, {
          x: side * vw * 0.3,
          y: (k + 0.5) * STEP,
          z: -180,
          rotationY: 0,
          force3D: true,
        });
      });
    };

    gsap.set(camera, { y: 0, z: 0, force3D: true });
    gsap.set(plates, { rotationY: 0 });
    layout();

    let tl: gsap.core.Timeline | null = null;

    const paint = () => {
      if (!tl) return;
      const camY = (gsap.getProperty(camera, "y") as number) || 0;

      let best = 0;
      let bestT = -1;

      for (let i = 0; i < n; i++) {
        const dy = i * STEP + camY;
        const t = 1 - clamp01(Math.abs(dy) / (MOBILE.band * STEP));
        if (t > bestT) {
          bestT = t;
          best = i;
        }

        const ts = smooth(t);
        setPlateAlpha[i](ts);
        setPlateZ[i](-MOBILE.depth * (1 - ts));
        setPlateRX[i](clamp1(-dy / STEP) * MOBILE.tiltX);
        const s = 0.84 + 0.16 * ts;
        setPlateSX[i](s);
        setPlateSY[i](s);
        setImgX[i](clamp1(dy / STEP) * -3);

        const cap = ramp(t, 0.5, 0.92);
        setCapAlpha[i](cap);
        setCapY[i]((1 - cap) * 112);
      }

      for (let k = 0; k < marks.length; k++) {
        const dy = (k + 0.5) * STEP + camY;
        setMarkAlpha[k](smooth(1 - clamp01(Math.abs(dy) / (MOBILE.band * STEP))));
      }

      writeCount(best);
    };

    tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: MOBILE.end,
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
        onRefreshInit: layout,
        onRefresh: paint,
      },
      onUpdate: paint,
    });

    tl.fromTo(
      camera,
      { y: 0 },
      { y: () => -(n - 1) * STEP, duration: 1, force3D: true },
      0,
    );
    addChrome(tl);

    paint();
  };

  mm.add(MQ.desktop, () => buildCorridor(DESKTOP));
  mm.add(MQ.tablet, () => buildCorridor(TABLET));
  mm.add(MQ.mobile, () => buildProcession());

  /* ==================================================================
     REDUCED MOTION — no pin, no flight. The stylesheet already relaxes the
     corridor into a plain column; this undoes the inline resting states the
     TSX ships, so every portal and every caption is simply present.
  ================================================================== */
  mm.add(MQ.reduced, () => {
    gsap.set(portals, { clearProps: "transform" });
    gsap.set(camera, { clearProps: "transform" });
    gsap.set(plates, { clearProps: "transform" });
    gsap.set(caps, { clearProps: "transform" });
    gsap.set(plates, { opacity: 1 });
    gsap.set(caps, { opacity: 1 });
    gsap.set(capIns, { yPercent: 0, y: 0, opacity: 1 });
    gsap.set(imgs, { xPercent: 0 });
    gsap.set(marks, { opacity: 0 });
    if (count) count.textContent = "01";
  });

  return () => mm.revert();
}
