"use client";

import { gsap, DrawSVGPlugin, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/* --------------------------------------------------------------------------
   CHAPTER 07 — GET IN TOUCH

   One pinned, scrubbed master timeline normalised to a 0 → 1 duration, driving
   a room rather than a page. Five Z registers move at five different rates:

     .ct-bed      -700px            the wall (photography), camera move on it
     .ct-mark     -360px            the AURUM watermark, slow lateral drift
     .ct-panel    -820 → 0 → -140   the concierge plane, hinged on the right
     .ct-travel   -420 → +180 → +760  the title: arrives, travels, PASSES
     .ct-meta / .ct-rail  +90px     the nearest plane, almost on the lens

   Three things are NOT on the scroll timeline because they belong to the
   visitor, not to the scroll position:
     · the intent stack re-deals itself in 3D on selection (GSAP, never CSS);
     · the concierge detail is re-dealt out of Z when the intent changes;
     · the gold call has a hover timeline and a real 3D press.

   Two rules this module holds to:
     1. Every scrubbed tween is a fromTo() and the timeline declares
        immediateRender:false, so scrubbing backwards restores state instead of
        stranding it. The pre-scroll pose is established by gsap.set() below and
        mirrored as inline style in the TSX, so nothing flashes on hydration.
     2. Every listener added inside an mm.add() callback is removed by the
        teardown RETURNED FROM THAT CALLBACK — matchMedia cannot reclaim a
        window/element listener, and a dead branch would keep writing
        transforms onto the live one after a breakpoint change.
-------------------------------------------------------------------------- */

type Branch = {
  /** ScrollTrigger pin distance. */
  end: string;
  /** Global multiplier on every Z travel. */
  depth: number;
  /** Camera on the wall. */
  rotFrom: number;
  rotTo: number;
  scaleFrom: number;
  scaleTo: number;
  yFrom: number;
  yTo: number;
  /** Diagonal travel of the title, as a fraction of the viewport. */
  travelX: number;
  travelY: number;
  /** How far past the lens the title finally goes. */
  passZ: number;
  /** Concierge plane: arrival angle, resting angle, hinge. */
  panelFrom: number;
  panelRot: number;
  panelOrigin: string;
  /** Multiplier on the intent stack's internal depth. */
  plateDepth: number;
  /** Closing recession of the whole room. */
  worldZ: number;
  worldRotX: number;
  /** How dark the closing veil goes. */
  veil: number;
};

const GOLD_BRIGHT = "#e8d3a3";
const IVORY = "#f2efe8";
const BONE = "#b9b3a7";
const ASH = "#6f6b62";

const HOVER_DURATION = 0.55;

export function initContact(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  /* ------------------------------------------------------------------
     THE INTENT STACK

     Three plates in a shallow deck. The chosen one lifts toward the viewer and
     squares up to the camera; the others fall back and angle away, fanning on
     both rotationY and rotationX so the deck reads as a physical stack.

     Scroll owns .ct-plate-in (arrival: y / opacity / rotationX).
     Selection owns .ct-plate  (z / rotationY / rotationX / x / scale).
     Two elements, two disjoint property sets — they can never fight.
  ------------------------------------------------------------------ */
  const wireStack = (depth: number, swap: number): (() => void) => {
    const plates = q(".ct-plate") as HTMLElement[];
    const hits = q(".ct-plate-in") as HTMLElement[];
    const rules = q(".ct-plate-rule") as HTMLElement[];
    const nums = q(".ct-plate-num") as HTMLElement[];
    const titles = q(".ct-plate-title") as HTMLElement[];
    const arrows = q(".ct-plate-arrow") as HTMLElement[];
    const detail = q(".ct-detail-in")[0] as HTMLElement | undefined;

    if (!plates.length) return () => {};

    /* Read the live selection out of the DOM rather than assuming 0 — a
       breakpoint change rebuilds this branch while React's state survives. */
    let activeIdx = Math.max(
      0,
      hits.findIndex((el) => el.getAttribute("aria-pressed") === "true"),
    );
    let hoverIdx = -1;

    const pose = (i: number) => {
      if (i === activeIdx) {
        return { z: 82 * depth, rotationY: 0, rotationX: 0, x: 0, scale: 1, opacity: 1 };
      }
      const d = i - activeIdx;
      const away = Math.abs(d);
      const hovered = i === hoverIdx;
      return {
        z: (hovered ? -58 : -118 - 52 * (away - 1)) * depth,
        rotationY: (d < 0 ? 13 : -13) * depth,
        rotationX: -d * 3.2 * depth,
        x: (d < 0 ? -12 : 12) * depth,
        scale: 1 - 0.03 * away,
        opacity: hovered ? 0.84 : 0.48,
      };
    };

    const deal = (dur: number) => {
      plates.forEach((plate, i) => {
        const on = i === activeIdx;
        const warm = on || i === hoverIdx;

        gsap.to(plate, {
          ...pose(i),
          duration: dur,
          ease: "aurum",
          transformOrigin: "50% 50%",
          force3D: true,
          overwrite: "auto",
        });

        if (rules[i]) {
          gsap.to(rules[i], {
            scaleX: on ? 1 : 0,
            duration: dur * 0.95,
            ease: "aurum",
            transformOrigin: "0% 50%",
            overwrite: "auto",
          });
        }
        if (nums[i]) {
          gsap.to(nums[i], {
            color: on ? GOLD_BRIGHT : ASH,
            duration: dur * 0.7,
            ease: "aurum",
            overwrite: "auto",
          });
        }
        if (titles[i]) {
          gsap.to(titles[i], {
            color: warm ? IVORY : BONE,
            duration: dur * 0.7,
            ease: "aurum",
            overwrite: "auto",
          });
        }
        if (arrows[i]) {
          gsap.to(arrows[i], {
            x: on ? 9 : warm ? 5 : 0,
            opacity: on ? 1 : warm ? 0.75 : 0.35,
            duration: dur * 0.7,
            ease: "aurum",
            overwrite: "auto",
          });
        }
      });
    };

    /* Content has already swapped by the time this runs, so the detail block is
       re-DEALT rather than crossfaded: it drops back into Z and returns. */
    const redealDetail = () => {
      if (!detail) return;
      gsap.fromTo(
        detail,
        { z: -260 * depth, rotationY: -14 * depth, y: 22 * depth, opacity: 0 },
        {
          z: 0,
          rotationY: 0,
          y: 0,
          opacity: 1,
          duration: swap * 0.82,
          ease: "aurum",
          force3D: true,
          overwrite: "auto",
        },
      );
    };

    const onIntent = (e: Event) => {
      const next = (e as CustomEvent<{ index: number }>).detail?.index ?? 0;
      if (next === activeIdx) return;
      activeIdx = next;
      deal(swap);
      redealDetail();
    };

    const enters: Array<() => void> = [];
    const leaves: Array<() => void> = [];

    hits.forEach((hit, i) => {
      const onEnter = () => {
        hoverIdx = i;
        deal(swap * 0.55);
      };
      const onLeave = () => {
        if (hoverIdx !== i) return;
        hoverIdx = -1;
        deal(swap * 0.62);
      };
      enters.push(onEnter);
      leaves.push(onLeave);
      hit.addEventListener("mouseenter", onEnter);
      hit.addEventListener("mouseleave", onLeave);
      hit.addEventListener("focus", onEnter);
      hit.addEventListener("blur", onLeave);
    });

    root.addEventListener("aurum:contact-intent", onIntent);

    // Sync the deck to its live state, instantly, before anything scrolls.
    deal(0);

    return () => {
      root.removeEventListener("aurum:contact-intent", onIntent);
      hits.forEach((hit, i) => {
        hit.removeEventListener("mouseenter", enters[i]);
        hit.removeEventListener("mouseleave", leaves[i]);
        hit.removeEventListener("focus", enters[i]);
        hit.removeEventListener("blur", leaves[i]);
      });
    };
  };

  /* ------------------------------------------------------------------
     THE GOLD CALL

     A paused hover timeline played and reversed by pointer events — the disc
     expands from nothing, the arrow swings 45deg, the label slides up out of
     its mask while the next slides in behind it, and the ink flips to near
     black over the gold. Nothing here is a CSS transition.

     The press is genuinely three-dimensional: the disc tips INTO the screen,
     away from wherever the finger landed, on its own local perspective.
  ------------------------------------------------------------------ */
  const wireCta = (dur: number, press3d: boolean): (() => void) => {
    const cta = q(".ct-cta")[0] as HTMLElement | undefined;
    const body = q(".ct-cta-body")[0] as HTMLElement | undefined;
    if (!cta || !body) return () => {};

    const disc = q(".ct-cta-disc")[0] as HTMLElement | undefined;
    const labelA = q(".ct-cta-a")[0] as HTMLElement | undefined;
    const labelB = q(".ct-cta-b")[0] as HTMLElement | undefined;
    const arrow = q(".ct-cta-arrow")[0] as HTMLElement | undefined;
    const inks = q(".ct-cta-ink") as HTMLElement[];

    gsap.set(body, {
      transformOrigin: "50% 50%",
      transformPerspective: 700,
      force3D: true,
    });
    if (disc) gsap.set(disc, { transformOrigin: "50% 50%" });
    if (arrow) gsap.set(arrow, { transformOrigin: "50% 50%" });

    const hover = gsap.timeline({
      paused: true,
      defaults: { ease: "aurum", force3D: true },
    });

    if (disc) hover.to(disc, { scale: 1, duration: dur }, 0);
    if (arrow) hover.to(arrow, { rotation: 45, duration: dur * 0.9 }, 0);
    if (labelA) hover.to(labelA, { yPercent: -118, duration: dur * 0.66 }, 0);
    if (labelB) hover.to(labelB, { yPercent: 0, duration: dur * 0.66 }, dur * 0.16);
    if (inks.length) hover.to(inks, { color: "#05060a", duration: dur * 0.5 }, dur * 0.12);

    /* Press lives on the inner body so it never collides with the scale the
       scrubbed timeline owns on .ct-cta itself. */
    const settle = () =>
      gsap.to(body, {
        rotationX: 0,
        rotationY: 0,
        z: 0,
        scale: 1,
        duration: 0.5,
        ease: "aurum",
        force3D: true,
        overwrite: "auto",
      });

    const onDown = (e: PointerEvent) => {
      if (!press3d) {
        gsap.to(body, { scale: 0.94, duration: 0.3, ease: "aurum", overwrite: "auto" });
        return;
      }
      const r = cta.getBoundingClientRect();
      const nx = r.width ? (e.clientX - r.left) / r.width - 0.5 : 0;
      const ny = r.height ? (e.clientY - r.top) / r.height - 0.5 : 0;
      gsap.to(body, {
        // Tip AWAY from the finger: the disc is being pushed into the panel.
        rotationY: nx * 16,
        rotationX: -ny * 16,
        z: -52,
        scale: 0.95,
        duration: 0.26,
        ease: "aurum",
        force3D: true,
        overwrite: "auto",
      });
    };

    const onEnter = () => hover.play();
    const onLeave = () => {
      settle();
      hover.reverse();
    };
    const onUp = () => settle();

    cta.addEventListener("mouseenter", onEnter);
    cta.addEventListener("mouseleave", onLeave);
    cta.addEventListener("focus", onEnter);
    cta.addEventListener("blur", onLeave);
    cta.addEventListener("pointerdown", onDown);
    cta.addEventListener("pointerup", onUp);
    cta.addEventListener("pointercancel", onUp);
    cta.addEventListener("pointerleave", onUp);

    return () => {
      cta.removeEventListener("mouseenter", onEnter);
      cta.removeEventListener("mouseleave", onLeave);
      cta.removeEventListener("focus", onEnter);
      cta.removeEventListener("blur", onLeave);
      cta.removeEventListener("pointerdown", onDown);
      cta.removeEventListener("pointerup", onUp);
      cta.removeEventListener("pointercancel", onUp);
      cta.removeEventListener("pointerleave", onUp);
      hover.kill();
    };
  };

  /* ------------------------------------------------------------------
     THE SCRUBBED FILM
  ------------------------------------------------------------------ */
  const build = (cfg: Branch): (() => void) => {
    const stage = q(".ct-stage")[0] as HTMLElement | undefined;
    const world = q(".ct-world")[0] as HTMLElement | undefined;
    const bed = q(".ct-bed")[0] as HTMLElement | undefined;
    const bedInner = q(".ct-bed-inner")[0] as HTMLElement | undefined;
    const veil = q(".ct-veil")[0] as HTMLElement | undefined;
    const mark = q(".ct-mark")[0] as HTMLElement | undefined;
    const travel = q(".ct-travel")[0] as HTMLElement | undefined;
    const panel = q(".ct-panel")[0] as HTMLElement | undefined;
    const form = q(".ct-form")[0] as HTMLElement | undefined;
    const cta = q(".ct-cta")[0] as HTMLElement | undefined;
    const ring = q(".ct-ring-circle")[0] as unknown as SVGElement | undefined;

    const lines = q(".ct-line") as HTMLElement[];
    const bodyCopy = q(".ct-body")[0] as HTMLElement | undefined;
    const rule = q(".ct-rule")[0] as HTMLElement | undefined;
    const meta = q(".ct-meta")[0] as HTMLElement | undefined;
    const metaRule = q(".ct-meta-rule")[0] as HTMLElement | undefined;
    const fields = q(".ct-field") as HTMLElement[];
    const plateIns = q(".ct-plate-in") as HTMLElement[];
    const clocks = q(".ct-clock") as HTMLElement[];
    const rail = q(".ct-rail")[0] as HTMLElement | undefined;
    const railLines = q(".ct-rail-line") as HTMLElement[];
    const railRule = q(".ct-rail-rule")[0] as HTMLElement | undefined;

    if (!stage || !world || !travel || !panel || !form) return () => {};

    const teardownCta = wireCta(HOVER_DURATION, cfg.depth > 0.6);
    const teardownStack = wireStack(cfg.plateDepth, 0.95);

    /* ---- authoritative pre-scroll pose (mirrored inline in the TSX) ------- */
    gsap.set(world, { transformOrigin: "50% 50%", transformStyle: "preserve-3d" });
    if (bed) gsap.set(bed, { z: -700, scale: 1.62, transformOrigin: "50% 50%", force3D: true });
    if (bedInner) gsap.set(bedInner, { transformOrigin: "50% 50%" });
    if (mark) gsap.set(mark, { z: -360, scale: 1.3, force3D: true });
    if (meta) gsap.set(meta, { z: 90, force3D: true });
    if (metaRule) gsap.set(metaRule, { scaleY: 0, transformOrigin: "50% 0%" });

    gsap.set(travel, {
      z: -420 * cfg.depth,
      rotationY: 14,
      transformOrigin: "18% 50%",
      force3D: true,
    });
    gsap.set(lines, { yPercent: 115, rotationX: -68, transformOrigin: "50% 0%" });
    if (bodyCopy) gsap.set(bodyCopy, { yPercent: 115 });
    if (rule) gsap.set(rule, { scaleX: 0, transformOrigin: "0% 50%" });

    gsap.set(panel, {
      z: -820 * cfg.depth,
      rotationY: cfg.panelFrom,
      xPercent: 14,
      opacity: 0,
      transformOrigin: cfg.panelOrigin,
      force3D: true,
    });
    gsap.set(form, { clipPath: "inset(0% 0% 100% 0%)" });
    gsap.set(fields, { y: 48 });
    gsap.set(plateIns, { y: 34, opacity: 0 });
    gsap.set(clocks, { y: 16, opacity: 0 });
    if (cta) gsap.set(cta, { scale: 0.62, opacity: 0, y: 42, transformOrigin: "50% 50%" });
    if (ring) gsap.set(ring, { drawSVG: "0%" });
    if (veil) gsap.set(veil, { opacity: 0 });

    if (rail) gsap.set(rail, { z: 90, x: 0, force3D: true });
    gsap.set(railLines, { yPercent: 115 });
    if (railRule) gsap.set(railRule, { scaleX: 0, transformOrigin: "0% 50%" });

    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: cfg.end,
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        scrub: 1,
      },
    });

    /* ---- 0.00 → 0.56  the wall: one continuous camera move ---------------- */
    if (bedInner) {
      tl.fromTo(
        bedInner,
        { rotation: cfg.rotFrom, scale: cfg.scaleFrom, yPercent: cfg.yFrom },
        {
          rotation: cfg.rotTo,
          scale: cfg.scaleTo,
          yPercent: cfg.yTo,
          duration: 0.56,
          ease: "cine",
          force3D: true,
        },
        0,
      );
    }

    /* ---- 0.00 → 0.72  the watermark drifts against the wall --------------- */
    if (mark) {
      tl.fromTo(
        mark,
        { xPercent: -3.5, yPercent: 3 },
        { xPercent: 3.5, yPercent: -3, duration: 0.72, force3D: true },
        0,
      );
    }

    /* ---- 0.01 → 0.10  the chapter mark draws its hairline ----------------- */
    if (metaRule) {
      tl.fromTo(metaRule, { scaleY: 0 }, { scaleY: 1, duration: 0.09, ease: "aurum" }, 0.01);
    }

    /* ---- 0.03 → 0.28  the title comes up out of the depth ----------------- */
    tl.fromTo(
      travel,
      { z: -420 * cfg.depth, rotationY: 14 },
      { z: 0, rotationY: 0, duration: 0.25, ease: "aurum", force3D: true },
      0.03,
    );

    /* Lines stand up on their own X axis as the block flies forward. */
    tl.fromTo(
      lines,
      { yPercent: 115, rotationX: -68 },
      {
        yPercent: 0,
        rotationX: 0,
        duration: 0.15,
        ease: "aurum",
        stagger: 0.055,
        transformOrigin: "50% 0%",
        transformPerspective: 900,
        force3D: true,
      },
      0.05,
    );

    if (rule) {
      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.11, ease: "aurum" }, 0.2);
    }
    if (bodyCopy) {
      tl.fromTo(bodyCopy, { yPercent: 115 }, { yPercent: 0, duration: 0.13, ease: "aurum" }, 0.22);
    }

    /* ---- 0.30 → 0.54  the title travels diagonally, turning as it comes --- */
    const tx1 = () => -window.innerWidth * cfg.travelX;
    const ty1 = () => -window.innerHeight * cfg.travelY;
    const tx2 = () => -window.innerWidth * cfg.travelX * 2.7;
    const ty2 = () => -window.innerHeight * cfg.travelY * 2.1;
    const midZ = 180 * cfg.depth;

    tl.fromTo(
      travel,
      { x: 0, y: 0, z: 0, rotationY: 0, rotationX: 0 },
      {
        x: tx1,
        y: ty1,
        z: midZ,
        rotationY: 12,
        rotationX: -5,
        duration: 0.24,
        ease: "cine",
        force3D: true,
      },
      0.3,
    );

    /* ---- 0.54 → 0.70  and passes the lens, uncovering the panel behind --- */
    tl.fromTo(
      travel,
      { x: tx1, y: ty1, z: midZ, rotationY: 12, rotationX: -5, opacity: 1 },
      {
        x: tx2,
        y: ty2,
        z: cfg.passZ,
        rotationY: 24,
        rotationX: -9,
        opacity: 0,
        duration: 0.16,
        ease: "cine",
        force3D: true,
      },
      0.54,
    );

    /* ---- 0.40 → 0.68  the concierge plane arrives from behind the title --- */
    tl.fromTo(
      panel,
      { z: -820 * cfg.depth, rotationY: cfg.panelFrom, xPercent: 14, opacity: 0 },
      {
        z: 0,
        rotationY: cfg.panelRot,
        xPercent: 0,
        opacity: 1,
        duration: 0.28,
        ease: "aurum",
        force3D: true,
      },
      0.4,
    );

    /* ---- 0.48 → 0.74  the vertical mask lifts. No fade — the content is
            already lit inside the mask and simply becomes visible. --------- */
    tl.fromTo(
      form,
      { clipPath: "inset(0% 0% 100% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.26, ease: "curtain" },
      0.48,
    );

    /* .ct-form carries a clip-path, which flattens everything inside it, so the
       fields get their depth from their OWN transformPerspective. */
    tl.fromTo(
      fields,
      { y: 48, rotationX: -12 },
      {
        y: 0,
        rotationX: 0,
        duration: 0.16,
        ease: "aurum",
        stagger: 0.035,
        transformPerspective: 800,
        transformOrigin: "50% 100%",
        force3D: true,
      },
      0.52,
    );

    /* ---- 0.56 → 0.76  the deck deals itself into the panel ---------------- */
    tl.fromTo(
      plateIns,
      { y: 34, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.13, ease: "aurum", stagger: 0.05, force3D: true },
      0.56,
    );

    /* ---- 0.56 → 0.74  the rail rises into the space the title vacated ----- */
    if (rail) {
      tl.fromTo(
        rail,
        { z: -300 * cfg.depth, x: -60 },
        { z: 90, x: 0, duration: 0.18, ease: "aurum", force3D: true },
        0.56,
      );
    }
    tl.fromTo(
      railLines,
      { yPercent: 115 },
      { yPercent: 0, duration: 0.13, ease: "aurum", stagger: 0.05 },
      0.58,
    );
    if (railRule) {
      tl.fromTo(railRule, { scaleX: 0 }, { scaleX: 1, duration: 0.1, ease: "aurum" }, 0.68);
    }

    /* ---- 0.66 → 0.84  the clocks, then the gold call and its ring --------- */
    tl.fromTo(
      clocks,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.1, ease: "aurum", stagger: 0.04 },
      0.66,
    );

    if (cta) {
      tl.fromTo(
        cta,
        { scale: 0.62, opacity: 0, y: 42, rotationY: -28, z: -300 * cfg.depth },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          rotationY: 0,
          z: 0,
          duration: 0.2,
          ease: "aurum",
          transformPerspective: 900,
          force3D: true,
        },
        0.68,
      );
    }
    if (ring) {
      tl.fromTo(ring, { drawSVG: "0%" }, { drawSVG: "0% 100%", duration: 0.2, ease: "cine" }, 0.7);
    }

    /* ---- 0.86 → 1.00  the settle: the room recedes and hands over --------- */
    if (veil) {
      tl.fromTo(veil, { opacity: 0 }, { opacity: cfg.veil, duration: 0.14 }, 0.86);
    }
    tl.fromTo(
      world,
      { z: 0, rotationX: 0 },
      {
        z: cfg.worldZ,
        rotationX: cfg.worldRotX,
        duration: 0.14,
        ease: "cine",
        transformOrigin: "50% 50%",
        force3D: true,
      },
      0.86,
    );
    tl.fromTo(
      panel,
      { z: 0, rotationY: cfg.panelRot },
      {
        z: -150 * cfg.depth,
        rotationY: cfg.panelRot - 6,
        duration: 0.14,
        ease: "aurumIn",
        force3D: true,
      },
      0.86,
    );
    if (meta) {
      tl.fromTo(meta, { opacity: 1 }, { opacity: 0.28, duration: 0.12 }, 0.88);
    }

    return () => {
      teardownStack();
      teardownCta();
    };
  };

  mm.add(MQ.desktop, () =>
    build({
      end: "+=560%",
      depth: 1,
      rotFrom: -6,
      rotTo: 3,
      scaleFrom: 1.26,
      scaleTo: 1.04,
      yFrom: 6,
      yTo: -4,
      travelX: 0.1,
      travelY: 0.14,
      passZ: 760,
      panelFrom: -26,
      panelRot: -8,
      panelOrigin: "100% 50%",
      plateDepth: 1,
      worldZ: -150,
      worldRotX: 3,
      veil: 0.5,
    }),
  );

  mm.add(MQ.tablet, () =>
    build({
      end: "+=430%",
      depth: 0.72,
      rotFrom: -5,
      rotTo: 2.4,
      scaleFrom: 1.26,
      scaleTo: 1.06,
      yFrom: 5,
      yTo: -3.5,
      travelX: 0.07,
      travelY: 0.12,
      passZ: 520,
      panelFrom: -20,
      panelRot: -6,
      panelOrigin: "100% 50%",
      plateDepth: 0.75,
      worldZ: -110,
      worldRotX: 2.2,
      veil: 0.48,
    }),
  );

  /* Mobile is redesigned, not shrunk. The panel is a full-width shelf on the
     floor of the frame rather than a hinged plane — there is no room to turn
     one — so it arrives flat, and the title has nowhere to go sideways and
     simply rises through the lens. */
  mm.add(MQ.mobile, () =>
    build({
      end: "+=300%",
      depth: 0.5,
      rotFrom: -3,
      rotTo: 1.6,
      scaleFrom: 1.32,
      scaleTo: 1.12,
      yFrom: 4,
      yTo: -3,
      travelX: 0,
      travelY: 0.1,
      passZ: 380,
      panelFrom: -12,
      panelRot: 0,
      panelOrigin: "50% 50%",
      plateDepth: 0.55,
      worldZ: -70,
      worldRotX: 1.4,
      veil: 0.44,
    }),
  );

  /* ---- reduced motion: the complete composition, at rest ----------------- */
  mm.add(MQ.reduced, () => {
    gsap.set(q(".ct-world"), { z: 0, rotationX: 0 });
    gsap.set(q(".ct-bed"), { z: -700, scale: 1.62, transformOrigin: "50% 50%" });
    gsap.set(q(".ct-bed-inner"), { rotation: 0, scale: 1.04, yPercent: 0 });
    gsap.set(q(".ct-veil"), { opacity: 0 });
    gsap.set(q(".ct-mark"), { z: -360, scale: 1.3, xPercent: 0, yPercent: 0 });

    gsap.set(q(".ct-meta"), { z: 90, opacity: 1 });
    gsap.set(q(".ct-meta-rule"), { scaleY: 1, transformOrigin: "50% 0%" });

    gsap.set(q(".ct-travel"), {
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      opacity: 1,
    });
    gsap.set(q(".ct-line"), { yPercent: 0, rotationX: 0 });
    gsap.set(q(".ct-rule"), { scaleX: 1, transformOrigin: "0% 50%" });
    gsap.set(q(".ct-body"), { yPercent: 0 });

    gsap.set(q(".ct-panel"), {
      z: 0,
      rotationY: 0,
      xPercent: 0,
      opacity: 1,
      transformOrigin: "100% 50%",
    });
    gsap.set(q(".ct-form"), { clipPath: "inset(0% 0% 0% 0%)" });
    gsap.set(q(".ct-field"), { y: 0, rotationX: 0 });
    gsap.set(q(".ct-plate-in"), { y: 0, opacity: 1 });
    gsap.set(q(".ct-detail-in"), { z: 0, rotationY: 0, y: 0, opacity: 1 });
    gsap.set(q(".ct-clock"), { y: 0, opacity: 1 });

    gsap.set(q(".ct-rail"), { z: 90, x: 0 });
    gsap.set(q(".ct-rail-line"), { yPercent: 0 });
    gsap.set(q(".ct-rail-rule"), { scaleX: 1, transformOrigin: "0% 50%" });

    gsap.set(q(".ct-cta"), { scale: 1, opacity: 1, y: 0, rotationY: 0, z: 0 });
    gsap.set(q(".ct-cta-body"), { scale: 1, rotationX: 0, rotationY: 0, z: 0 });
    gsap.set(q(".ct-ring-circle"), { drawSVG: "0% 100%" });

    /* The deck still changes state on selection — it just changes instantly,
       with no perceptible motion, and the button swaps its label the same way. */
    const teardownStack = wireStack(0, 0.001);
    const teardownCta = wireCta(0.001, false);
    return () => {
      teardownStack();
      teardownCta();
    };
  });

  return () => mm.revert();
}

/* Keep the plugin reference alive through tree-shaking — drawSVG is only ever
   referenced as a tween property string above. */
void DrawSVGPlugin;
