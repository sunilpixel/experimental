"use client";

import { gsap, MQ, scoped, adoptRestingTransforms } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";
import { RESIDENCES } from "@/lib/chapters";

/* ------------------------------------------------------------------
   CHAPTER 03 — ICONIC RESIDENCES

   The set-piece: a 3D carousel arc. Vertical scroll drives a horizontal
   track that is laid out on a cylinder. The panel in front of the lens
   faces it flat at z = 0; everything either side rotates away on Y and
   recedes into the stage. Depth is carried by real Z, rotation and
   luminance — there is no blur anywhere in this chapter.

   Z planes:
     -820  wordmark            (deepest, slowest lateral drift)
     -520  horizon rig         (hairlines, scaling open)
        0  the arc             (panels swing 0 → -420 as they leave centre)
      +70  chrome / index      (head, rail, runway)
     +120  captions            (float in front of their own photograph)
------------------------------------------------------------------ */

/** Scale the panel in front of the lens settles on. */
const ACTIVE_SCALE = 1.12;
/** Scale a panel falls back to once it swings off the axis. */
const IDLE_SCALE = 0.9;
const IDLE_OPACITY = 0.5;
const IDLE_META_OPACITY = 0.28;
const IDLE_BRIGHT = 0.5;

/** The track finishes crossing the frame here. */
const TRACK_END = 0.72;
/** Chrome and captions leave before the deck squares up. */
const EXIT_IN = 0.64;
const EXIT_OUT = 0.73;
/** The deck squares itself up in 3D across this window. */
const COLLAPSE_IN = 0.72;
const COLLAPSE_FULL = 0.85;
/** The squared deck falls away into the stage. */
const RECEDE_IN = 0.85;
/** The resolving full-bleed plate. */
const PLATE_IN = 0.86;

const clamp01 = gsap.utils.clamp(0, 1);
const clampSigned = gsap.utils.clamp(-1, 1);

type Cfg = {
  /** Pin length, as a percentage appended to "+=". */
  scroll: number;
  /** Panel width multiplier (`--res-k`). */
  k: number;
  /** Maximum rotationY at the edge of the arc. */
  rotY: number;
  /** Maximum recession at the edge of the arc. */
  depth: number;
};

const DESKTOP: Cfg = { scroll: 600, k: 1, rotY: 38, depth: 420 };
const TABLET: Cfg = { scroll: 500, k: 1.32, rotY: 26, depth: 280 };

type Cache = {
  vw: number;
  stageH: number;
  stageLeft: number;
  travel: number;
  left: number[];
  width: number[];
  yOff: number[];
  /** x needed to bring each panel to the centre of frame at the collapse. */
  collapseX: number[];
  /** uniform scale that matches every panel to the dominant panel's width. */
  collapseScale: number[];
  /** panel indices ordered outermost -> innermost at the end of the track */
  order: number[];
};

export function initResidences(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  const stage = q(".res-stage")[0] as HTMLElement | undefined;
  const track = q(".res-track")[0] as HTMLElement | undefined;
  if (!stage || !track) return () => mm.revert();

  const panels = q(".res-panel") as HTMLElement[];
  const doms = q(".res-dom") as HTMLElement[];
  const lums = q(".res-lum") as HTMLElement[];
  const frames = q(".res-frame") as HTMLElement[];
  const imgs = q(".res-img") as HTMLElement[];
  const metas = q(".res-meta") as HTMLElement[];
  const idxWraps = q(".res-idxwrap") as HTMLElement[];
  const capLines = q(".res-cap-line") as HTMLElement[];
  const indexLines = q(".res-index") as HTMLElement[];
  const headLines = q(".res-head-line") as HTMLElement[];
  const railLines = q(".res-rail-line") as HTMLElement[];
  const plateLines = q(".res-plate-line") as HTMLElement[];
  const tickLabels = q(".res-tick-label") as HTMLElement[];
  const railFoot = q(".res-rail-foot")[0] as HTMLElement | undefined;
  const railInner = q(".res-rail-inner")[0] as HTMLElement | undefined;
  const headInner = q(".res-head-inner")[0] as HTMLElement | undefined;
  const ledger = q(".res-ledger")[0] as HTMLElement | undefined;
  const ledgerInner = q(".res-ledger-inner")[0] as HTMLElement | undefined;
  const head = q(".res-head")[0] as HTMLElement | undefined;
  const rail = q(".res-rail")[0] as HTMLElement | undefined;
  const runway = q(".res-runway")[0] as HTMLElement | undefined;
  const runwayFill = q(".res-runway-fill")[0] as HTMLElement | undefined;
  const mobileHead = q(".res-mobile-head")[0] as HTMLElement | undefined;
  const watermark = q(".res-watermark")[0] as HTMLElement | undefined;
  const horizon = q(".res-horizon")[0] as HTMLElement | undefined;
  const vrules = q(".res-vrule") as HTMLElement[];
  const bigNum = q(".res-bignum")[0] as HTMLElement | undefined;
  const nowPlace = q(".res-nowplace")[0] as HTMLElement | undefined;
  const plate = q(".res-plate")[0] as HTMLElement | undefined;
  const plateInner = q(".res-plate-inner")[0] as HTMLElement | undefined;
  const plateCap = q(".res-plate-cap")[0] as HTMLElement | undefined;
  const arrows = q(".res-arrow") as HTMLElement[];
  const explore = q(".res-explore")[0] as HTMLElement | undefined;

  if (!panels.length) return () => mm.revert();

  const n = panels.length;
  const rotations = panels.map((p) => Number(p.dataset.rot ?? 0) || 0);
  const yUnits = panels.map((p) => Number(p.dataset.y ?? 0) || 0);
  const gaps = panels.map((p) => Number(p.dataset.gap ?? 0) || 0);
  /** THE OCEAN — the panel the whole deck squares itself up against. */
  const hero = Math.min(2, n - 1);

  /* ================================================================
     DESKTOP + TABLET — pinned 3D carousel
  ================================================================ */
  const buildWide = (cfg: Cfg): (() => void) => {
    gsap.set(root, { "--res-k": String(cfg.k) });
    // The arc only exists if the track shares one 3D rendering context with
    // the stage's perspective. Set here, not inline, so the mobile branch —
    // whose column would be wildly distorted by a single perspective origin —
    // keeps the track flat.
    gsap.set(track, { transformStyle: "preserve-3d" });
    // Resting pose: the deck is parked deep in the stage and hinged back. Set
    // here rather than inline so GSAP owns the transform cache from the first
    // frame — no matrix decomposition, nothing to mis-read. useLayoutEffect
    // means this lands before first paint.
    gsap.set(panels, { z: -620, rotationX: 9, force3D: true });
    panels.forEach((p, i) => {
      if (gaps[i]) gsap.set(p, { marginRight: gaps[i] * cfg.k + "vw" });
    });

    const measure = (): Cache => {
      const vw = window.innerWidth;
      const stageH = stage.offsetHeight || window.innerHeight;
      const stageLeft = stage.getBoundingClientRect().left;
      const trackW = Math.max(track.scrollWidth, track.offsetWidth);
      const travel = Math.max(0, trackW - vw);

      const left: number[] = [];
      const width: number[] = [];
      const yOff: number[] = [];
      const collapseX: number[] = [];
      const collapseScale: number[] = [];
      const distance: number[] = [];

      panels.forEach((p, i) => {
        left[i] = p.offsetLeft;
        width[i] = p.offsetWidth;
        yOff[i] = (yUnits[i] * stageH) / 100;
      });

      const heroW = width[hero] || 1;

      panels.forEach((_, i) => {
        // Screen-space centre once the track has travelled its full distance.
        const endCentre = stageLeft + left[i] + width[i] / 2 - travel;
        distance[i] = Math.abs(endCentre - vw / 2);
        collapseX[i] = vw / 2 - endCentre;
        // Every card is matched to the dominant card's footprint, so the deck
        // reads as one squared stack instead of five different rectangles.
        // Never a cover-the-viewport blow-up: these photographs are upscaled
        // and cannot survive a 3x magnification.
        collapseScale[i] = heroW / Math.max(width[i], 1);
      });

      const order = panels
        .map((_, i) => i)
        .sort((a, b) => distance[b] - distance[a]);

      return { vw, stageH, stageLeft, travel, left, width, yOff, collapseX, collapseScale, order };
    };

    let cache: Cache = measure();

    /** The stagger of vertical offsets is layout, not choreography — it is
     *  written straight onto the panels and only unwound by the collapse. */
    const applyOffsets = () => {
      panels.forEach((p, i) => gsap.set(p, { y: cache.yOff[i] }));
    };

    const remeasure = () => {
      cache = measure();
      applyOffsets();
    };

    applyOffsets();

    /* ---- per-panel quickTo setters: one paint pass, no extra triggers ----
       quickTo cannot drive the `scale` shorthand — GSAP warns "not eligible
       for reset" every frame and the tween never takes. Drive both axes. */
    const setScaleX = doms.map((el) =>
      gsap.quickTo(el, "scaleX", { duration: 0.42, ease: "power3", force3D: true }),
    );
    const setScaleY = doms.map((el) =>
      gsap.quickTo(el, "scaleY", { duration: 0.42, ease: "power3", force3D: true }),
    );
    const setRoll = doms.map((el) =>
      gsap.quickTo(el, "rotation", { duration: 0.5, ease: "power3", force3D: true }),
    );
    const setRotY = doms.map((el) =>
      gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3", force3D: true }),
    );
    const setZ = doms.map((el) =>
      gsap.quickTo(el, "z", { duration: 0.5, ease: "power3", force3D: true }),
    );
    const setLumOpacity = lums.map((el) =>
      gsap.quickTo(el, "opacity", { duration: 0.45, ease: "power2" }),
    );
    const setBright = lums.map((el) =>
      gsap.quickTo(el, "--res-bright", { duration: 0.45, ease: "power2" }),
    );
    const setMetaOpacity = metas.map((el) =>
      gsap.quickTo(el, "opacity", { duration: 0.45, ease: "power2" }),
    );
    const setImgX = imgs.map((el) =>
      gsap.quickTo(el, "xPercent", { duration: 0.6, ease: "power2", force3D: true }),
    );

    let shownIndex = -1;
    let tl: gsap.core.Timeline | null = null;

    const syncLedger = (i: number) => {
      if (bigNum) bigNum.textContent = String(i + 1).padStart(2, "0");
      if (nowPlace) nowPlace.textContent = RESIDENCES[i].place;
      tickLabels.forEach((el, k) => {
        el.style.color = k === i ? "var(--color-gold)" : "rgb(185 179 167 / 0.4)";
      });
    };

    const paint = () => {
      if (!tl) return;
      const c = cache;
      const p = tl.progress();
      const collapseMix = clamp01(
        gsap.utils.mapRange(COLLAPSE_IN, COLLAPSE_FULL, 0, 1, p),
      );
      const trackX = (gsap.getProperty(track, "x") as number) || 0;
      const half = c.vw / 2;
      const reach = c.vw * 0.62;

      let bestIndex = 0;
      let bestRaw = -1;

      for (let i = 0; i < n; i++) {
        const centre = c.stageLeft + c.left[i] + c.width[i] / 2 + trackX;
        const offset = centre - half;
        // -1 hard left of the lens, 0 dead centre, +1 hard right.
        const norm = clampSigned(offset / reach);

        // Normalised dominance: 1 facing the lens, 0 at the edges of the arc.
        let t = 1 - Math.abs(norm);
        t = t * t * (3 - 2 * t); // smoothstep — the falloff reads mechanical otherwise

        if (t > bestRaw) {
          bestRaw = t;
          bestIndex = i;
        }

        // The collapse forces every card to the dominant pose so the deck can
        // square up: rotation 0, z 0, full luminance.
        const te = t + (1 - t) * collapseMix;
        const arc = norm * (1 - collapseMix);

        // The cylinder. Positive arc = right of the lens, so its right edge is
        // the far edge and rotationY is positive.
        setRotY[i](arc * cfg.rotY);
        setZ[i](-cfg.depth * (1 - Math.cos(Math.abs(arc) * Math.PI * 0.5)));

        const s = IDLE_SCALE + (ACTIVE_SCALE - IDLE_SCALE) * te;
        setScaleX[i](s);
        setScaleY[i](s);
        setRoll[i](rotations[i] * (1 - te));
        setLumOpacity[i](IDLE_OPACITY + (1 - IDLE_OPACITY) * te);
        setMetaOpacity[i](IDLE_META_OPACITY + (1 - IDLE_META_OPACITY) * te);
        setBright[i](IDLE_BRIGHT + (1 - IDLE_BRIGHT) * te);
        setImgX[i](clampSigned(offset / half) * 6 * (1 - collapseMix));
      }

      if (collapseMix < 0.5 && bestIndex !== shownIndex) {
        shownIndex = bestIndex;
        syncLedger(bestIndex);
      }
    };

    /* ---- master scrubbed timeline: total duration 1 == ScrollTrigger progress ---- */
    tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=" + cfg.scroll + "%",
        pin: stage,
        pinSpacing: true,
        scrub: 1.05,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefreshInit: remeasure,
        onRefresh: paint,
      },
      onUpdate: paint,
    });

    /* The timeline's duration MUST stay exactly 1 so every constant above maps
       1:1 onto ScrollTrigger progress. This anchor pins it there no matter
       which optional element happens to be missing. */
    tl.to({}, { duration: 1 }, 0);

    /* ---- 0.00 → 0.72  the arc crosses the frame ------------------------- */
    tl.fromTo(
      track,
      { x: 0 },
      { x: () => -cache.travel, duration: TRACK_END, force3D: true },
      0,
    );

    // A slow inner push across the whole chapter. Never below 1.14: the
    // dominance parallax shifts the image by up to 6% and any less would
    // expose an edge.
    tl.fromTo(
      imgs,
      { scale: 1.22 },
      { scale: 1.14, duration: TRACK_END, force3D: true },
      0,
    );

    /* ---- the deep planes, each on its own rate -------------------------- */
    if (watermark) {
      tl.fromTo(watermark, { xPercent: 9 }, { xPercent: -15, duration: 1 }, 0);
    }
    if (horizon) {
      tl.fromTo(
        horizon,
        { scaleX: 0.35 },
        { scaleX: 1, duration: 0.84, ease: "cine", transformOrigin: "50% 50%" },
        0.02,
      );
    }
    if (vrules.length) {
      tl.fromTo(
        vrules,
        { scaleY: 0.12, opacity: 0 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.34,
          ease: "aurum",
          stagger: 0.06,
          transformOrigin: "50% 50%",
        },
        0.04,
      );
    }

    /* ---- the near plane drifts against the arc -------------------------- */
    if (headInner) {
      tl.fromTo(headInner, { y: 0 }, { y: -46, duration: 0.84, force3D: true }, 0);
    }
    if (railInner) {
      tl.fromTo(railInner, { y: 0 }, { y: 34, duration: 0.84, force3D: true }, 0);
    }
    if (ledgerInner) {
      tl.fromTo(ledgerInner, { y: 0 }, { y: -26, duration: 0.84, force3D: true }, 0);
    }
    if (runwayFill) {
      tl.fromTo(
        runwayFill,
        { scaleX: 0 },
        { scaleX: 1, duration: TRACK_END, transformOrigin: "0% 50%" },
        0,
      );
    }

    /* ---- 0.64 → 0.73  chrome and captions leave ------------------------- */
    const exitDur = EXIT_OUT - EXIT_IN;
    if (headLines.length) {
      tl.fromTo(
        headLines,
        { yPercent: 0 },
        { yPercent: -118, duration: exitDur, ease: "aurumIn", stagger: 0.008 },
        EXIT_IN,
      );
    }
    if (railLines.length) {
      tl.fromTo(
        railLines,
        { yPercent: 0 },
        { yPercent: -118, duration: exitDur, ease: "aurumIn", stagger: 0.01 },
        EXIT_IN,
      );
    }
    if (railFoot) {
      tl.fromTo(
        railFoot,
        { autoAlpha: 1, y: 0 },
        { autoAlpha: 0, y: -28, duration: exitDur, ease: "aurumIn" },
        EXIT_IN,
      );
    }
    if (capLines.length) {
      tl.fromTo(
        capLines,
        { yPercent: 0 },
        { yPercent: 118, duration: exitDur * 0.8, ease: "aurumIn", stagger: 0.004 },
        EXIT_IN + 0.01,
      );
    }
    if (indexLines.length) {
      tl.fromTo(
        indexLines,
        { yPercent: 0, opacity: 1 },
        { yPercent: -118, opacity: 0, duration: exitDur * 0.6, ease: "aurumIn" },
        EXIT_IN,
      );
    }
    // The floating planes settle back onto their panels before the squaring-up,
    // otherwise the panel scale would multiply their forward Z into the lens.
    if (metas.length) {
      tl.fromTo(
        metas,
        { z: 120 },
        { z: 0, duration: exitDur, ease: "aurumIn", force3D: true },
        EXIT_IN,
      );
    }
    if (idxWraps.length) {
      tl.fromTo(
        idxWraps,
        { z: 70 },
        { z: 0, duration: exitDur, ease: "aurumIn", force3D: true },
        EXIT_IN,
      );
    }
    if (ledger) {
      tl.fromTo(
        ledger,
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: exitDur, ease: "aurumIn" },
        EXIT_IN,
      );
    }
    if (runway) {
      tl.fromTo(
        runway,
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: exitDur, ease: "aurumIn" },
        EXIT_IN,
      );
    }

    /* ---- 0.72 → 0.85  the deck squares up in 3D, outermost card first ---- */
    tl.set(panels[hero], { zIndex: 90 }, COLLAPSE_IN - 0.005);

    cache.order.forEach((i, k) => {
      const at = COLLAPSE_IN + k * 0.014;

      tl!.fromTo(
        panels[i],
        { x: 0, y: () => cache.yOff[i], scale: 1 },
        {
          x: () => cache.collapseX[i],
          y: 0,
          scale: () => cache.collapseScale[i],
          duration: 0.075,
          ease: "cine",
          force3D: true,
        },
        at,
      );

      // The letterbox the intro left behind opens as the card lands.
      tl!.fromTo(
        frames[i],
        { clipPath: "inset(6% 0% 6% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.07, ease: "curtain" },
        at,
      );
    });

    /* ---- 0.85 → 0.92  the squared deck falls away into the stage -------- */
    tl.fromTo(
      panels,
      { z: 0, opacity: 1 },
      {
        z: -520,
        opacity: 0,
        duration: 0.05,
        ease: "aurumIn",
        stagger: 0.008,
        force3D: true,
      },
      RECEDE_IN,
    );

    /* ---- 0.86 → 1.00  the resolving plate, then the handoff tip --------- */
    if (plate) {
      tl.fromTo(
        plate,
        { clipPath: "inset(100% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.12, ease: "curtain" },
        PLATE_IN,
      );
    }
    if (plateInner) {
      tl.fromTo(
        plateInner,
        { scale: 1.18, yPercent: 4 },
        { scale: 1.02, yPercent: 0, duration: 0.14, ease: "cine", force3D: true },
        PLATE_IN,
      );
    }
    if (plateLines.length) {
      tl.fromTo(
        plateLines,
        { yPercent: 118 },
        { yPercent: 0, duration: 0.05, ease: "aurum", stagger: 0.018 },
        0.94,
      );
    }
    if (plate) {
      // Chapter 04 takes the screen off a tipped plate, not a flat cut.
      tl.fromTo(
        plate,
        { rotationX: 0, y: 0 },
        {
          rotationX: 5,
          y: "-2vh",
          duration: 0.06,
          ease: "cine",
          transformOrigin: "50% 50%",
          force3D: true,
        },
        0.94,
      );
    }

    /* ---- entrance: the deck arrives out of the stage before the pin ----- */
    const intro = gsap.timeline({
      scrollTrigger: { trigger: root, start: "top 82%", once: true },
    });
    intro
      .to(
        panels,
        { z: 0, rotationX: 0, duration: 1.7, ease: "aurum", stagger: 0.085, force3D: true },
        0,
      )
      .to(
        frames,
        { clipPath: "inset(6% 0% 6% 0%)", duration: 1.5, ease: "curtain", stagger: 0.085 },
        0.12,
      )
      .to(headLines, { yPercent: 0, duration: 1.1, stagger: 0.08 }, 0.2)
      .to(railLines, { yPercent: 0, duration: 1.2, stagger: 0.07 }, 0.34)
      .to(indexLines, { yPercent: 0, duration: 0.9, stagger: 0.03 }, 0.5)
      .to(capLines, { yPercent: 0, duration: 1, stagger: 0.028 }, 0.55);
    if (railFoot) intro.to(railFoot, { autoAlpha: 1, duration: 1.1 }, 0.7);

    syncLedger(0);
    paint();

    /* ---- rail navigation: arrows + the explore link --------------------- */
    const progressForPanel = (i: number) => {
      const c = cache;
      if (c.travel <= 0) return 0;
      const target = c.stageLeft + c.left[i] + c.width[i] / 2 - c.vw / 2;
      return gsap.utils.clamp(0, EXIT_OUT, (target / c.travel) * TRACK_END);
    };

    const scrollToProgress = (value: number) => {
      const st = tl?.scrollTrigger;
      if (!st) return;
      const y = st.start + (st.end - st.start) * clamp01(value);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 1.5 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    };

    const step = (event: Event) => {
      const el = event.currentTarget as HTMLElement;
      const dir = Number(el.dataset.dir ?? 1) || 1;
      const next = gsap.utils.clamp(0, n - 1, (shownIndex < 0 ? 0 : shownIndex) + dir);
      scrollToProgress(progressForPanel(next));
    };

    const onExplore = (event: Event) => {
      event.preventDefault();
      scrollToProgress(0.99);
    };

    arrows.forEach((a) => a.addEventListener("click", step));
    explore?.addEventListener("click", onExplore);

    // Returned from THIS callback — matchMedia cannot reclaim DOM listeners,
    // and a breakpoint change would otherwise leave a dead branch scrolling
    // the live one.
    return () => {
      arrows.forEach((a) => a.removeEventListener("click", step));
      explore?.removeEventListener("click", onExplore);
    };
  };

  mm.add(MQ.desktop, () => buildWide(DESKTOP));
  mm.add(MQ.tablet, () => buildWide(TABLET));

  /* ================================================================
     MOBILE — a redesigned vertical procession. No pin, no track.
     Each frame hinges up from its own bottom edge on rotationX, so the
     chapter still reads in 3D on a phone.
  ================================================================ */
  mm.add(MQ.mobile, () => {
    const last = n - 1;

    gsap.set(panels, {
      "--pw": "88",
      "--ph": "66",
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      marginRight: 0,
      opacity: 1,
    });
    gsap.set(panels[last], {
      "--pw": "100",
      "--ph": "88",
      alignSelf: "center",
      marginLeft: "-6vw",
      marginRight: "-6vw",
    });

    // Captions ride flat on mobile — there is no stage perspective to give a
    // forward plane any meaning here.
    gsap.set([...metas, ...idxWraps], { z: 0 });
    gsap.set(lums, { opacity: 1, "--res-bright": 1 });

    /* Resting pose, written before any ScrollTrigger exists so nothing blinks
       when a panel's trigger first engages. */
    doms.forEach((dom, i) => {
      gsap.set(dom, {
        transformPerspective: 1100,
        transformOrigin: "50% 100%",
        rotationX: 32,
        rotation: i === last ? 0 : rotations[i] * 0.6,
        y: 54,
        scaleX: 0.94,
        scaleY: 0.94,
        rotationY: 0,
        z: 0,
        opacity: 1,
        force3D: true,
      });
    });

    if (mobileHead) {
      gsap.fromTo(
        mobileHead,
        { y: 44, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 1.4,
          ease: "aurum",
          scrollTrigger: { trigger: mobileHead, start: "top 88%", once: true },
        },
      );
    }

    panels.forEach((panel, i) => {
      const qp = scoped(panel);
      const caps = qp(".res-cap-line") as HTMLElement[];
      const idx = qp(".res-index") as HTMLElement[];

      /* the hinge — bottom edge planted, top edge swinging toward the lens */
      gsap.timeline({
        defaults: { ease: "none", immediateRender: false },
        scrollTrigger: {
          trigger: panel,
          start: "top 94%",
          end: "top 34%",
          scrub: 1.05,
          invalidateOnRefresh: true,
        },
      }).fromTo(
        doms[i],
        { rotationX: 32, y: 54, scaleX: 0.94, scaleY: 0.94, rotation: i === last ? 0 : rotations[i] * 0.6 },
        {
          rotationX: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          duration: 1,
          ease: "aurum",
          force3D: true,
        },
        0,
      );

      /* the reveal + inner camera move, across the whole pass */
      gsap
        .timeline({
          defaults: { ease: "none", immediateRender: false },
          scrollTrigger: {
            trigger: panel,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.1,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(
          frames[i],
          { clipPath: "inset(0% 0% 100% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.3, ease: "curtain" },
          0.04,
        )
        .fromTo(
          imgs[i],
          { yPercent: -9, scale: 1.2 },
          { yPercent: 9, scale: 1.05, duration: 1, force3D: true },
          0,
        )
        .fromTo(
          caps,
          { yPercent: 118 },
          { yPercent: 0, duration: 0.18, ease: "aurum", stagger: 0.03 },
          0.24,
        )
        .fromTo(idx, { yPercent: 118 }, { yPercent: 0, duration: 0.16, ease: "aurum" }, 0.26);
    });
  });

  /* ================================================================
     REDUCED MOTION — the complete composition, at rest.
  ================================================================ */
  mm.add(MQ.reduced, () => {
    gsap.set(stage, { height: "auto", display: "block", perspective: "none" });
    gsap.set(track, {
      position: "relative",
      inset: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "7vh",
      width: "100%",
      padding: "8vh 6vw",
      transformStyle: "flat",
      x: 0,
    });

    gsap.set(panels, {
      "--pw": "86",
      "--ph": "62",
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      scale: 1,
      opacity: 1,
      zIndex: 1,
      alignSelf: "center",
      marginLeft: 0,
      marginRight: 0,
    });
    gsap.set(doms, {
      rotation: 0,
      rotationX: 0,
      rotationY: 0,
      z: 0,
      scale: 1,
      y: 0,
      opacity: 1,
    });
    gsap.set(lums, { opacity: 1, "--res-bright": 1, filter: "none" });
    gsap.set(frames, { clipPath: "none" });
    gsap.set(imgs, { scale: 1, xPercent: 0, yPercent: 0 });
    gsap.set([...metas, ...idxWraps], { z: 0, opacity: 1 });
    gsap.set([...capLines, ...indexLines, ...headLines, ...railLines], {
      yPercent: 0,
      y: 0,
      opacity: 1,
    });

    if (mobileHead) gsap.set(mobileHead, { display: "none" });
    if (watermark) gsap.set(watermark, { opacity: 0 });
    if (horizon) gsap.set(horizon, { scaleX: 1 });
    if (vrules.length) gsap.set(vrules, { scaleY: 1, opacity: 1 });
    if (railFoot) gsap.set(railFoot, { autoAlpha: 1, y: 0 });
    if (ledger) gsap.set(ledger, { autoAlpha: 1, position: "relative", inset: "auto", margin: "0 auto", padding: "0 6vw 6vh" });
    if (runway) gsap.set(runway, { display: "none" });
    if (arrows.length) gsap.set(arrows, { display: "none" });
    if (plate) gsap.set(plate, { display: "none" });
    if (plateCap) gsap.set(plateCap, { display: "none" });

    [head, rail].forEach((el) => {
      if (!el) return;
      gsap.set(el, {
        display: "block",
        position: "relative",
        inset: "auto",
        width: "auto",
        maxWidth: "44rem",
        margin: "0 auto",
        padding: "7vh 6vw",
        x: 0,
        y: 0,
        z: 0,
        opacity: 1,
      });
    });

    if (bigNum) bigNum.textContent = "01";
    if (nowPlace) nowPlace.textContent = RESIDENCES[0].place;
  });

  return () => mm.revert();
}
