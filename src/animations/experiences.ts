"use client";

import { gsap, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/**
 * CHAPTER 04 — CURATED EXPERIENCES
 *
 * One pinned, scrubbed master timeline normalised to 0 → 1.
 *
 * The orbit is a real orbit. A ring container is tilted on rotationX so the
 * hairline ellipse and its spokes are drawn by the browser's own 3D pipeline,
 * and the four photographic nodes are projected onto that same ellipse from
 * their angle:
 *
 *      x = cos(a)·R
 *      y = sin(a)·R·cos(tilt)
 *      z = sin(a)·R·sin(tilt)      <- genuine translateZ, near half toward camera
 *
 * Because the nodes are siblings of the tilted plane rather than children of
 * it, they carry that depth without inheriting the plane's rotation — the
 * photographs stay upright with no counter-rotation to unwind, and the stage
 * perspective (whose vanishing point is the orbit centre) does the sizing.
 *
 * ONE WRITER PER ELEMENT. The scrubbed timeline only ever tweens numbers on the
 * `st` state object and on `ns[i].p`; `render()` is the single thing that
 * touches the plane, the nodes and the connector hairlines. Nothing else in the
 * module writes to those elements, so the scrub and the idle rotation can never
 * fight over the same transform.
 */

const DEG = Math.PI / 180;

/** Orbit seats. Node 0 arrives on the near side, closest to the camera. */
const BASE = [90, 0, -90, 180];

/** Layout width of a connector hairline; length is expressed as scaleX. */
const TIE_BASE = 200;

type Mode = "orbit" | "stack";

type Cfg = {
  /** Pin length, in multiples of 100vh. */
  scroll: number;
  /** Seated tilt of the orbit plane, degrees from screen-parallel. */
  tilt: number;
  /** Tilt the plane arrives from — almost edge-on. */
  tilt0: number;
  /** How far back a node starts before it takes its seat. */
  depth: number;
  /** How far the foreground headline travels past the camera. */
  push: number;
  /** Degrees the orbit turns across the scrubbed phase. */
  spin: number;
  /** Circle / perspective origin, in % of the stage. */
  cx: number;
  cy: number;
  /** Pinhole and full radii of the clip circle, in %. */
  r0: number;
  r1: number;
  mode: Mode;
  ties: boolean;
};

const DESKTOP: Cfg = {
  scroll: 5.2, tilt: 62, tilt0: 88, depth: 860, push: 900, spin: 132,
  cx: 68, cy: 52, r0: 4.5, r1: 152, mode: "orbit", ties: true,
};

const TABLET: Cfg = {
  scroll: 4.2, tilt: 56, tilt0: 86, depth: 640, push: 660, spin: 108,
  cx: 68, cy: 52, r0: 5, r1: 156, mode: "orbit", ties: true,
};

/* Mobile is a different chapter, not a smaller one: no ring at all. The four
   experiences arrive one at a time out of deep space, hold, and pass the
   camera — each carrying its own numeral and label with it. */
const MOBILE: Cfg = {
  scroll: 4.4, tilt: 0, tilt0: 0, depth: 700, push: 620, spin: 0,
  cx: 50, cy: 44, r0: 6, r1: 168, mode: "stack", ties: false,
};

export function initExperiences(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  /* ------------------------------------------------------------------ */
  /*  The orbit system: measurement + the single per-frame writer.       */
  /* ------------------------------------------------------------------ */
  const system = (cfg: Cfg) => {
    const stage = q(".exp-stage")[0] as HTMLElement | undefined;
    const shell = q(".exp-shell")[0] as HTMLElement | undefined;
    const anchor = q(".exp-orbit-anchor")[0] as HTMLElement | undefined;
    const plane = q(".exp-orbit-plane")[0] as HTMLElement | undefined;
    const nodes = q(".exp-node") as HTMLElement[];
    const labels = q(".exp-labels")[0] as HTMLElement | undefined;
    const rows = q(".exp-label-row") as HTMLElement[];
    const tieEls = q(".exp-tie") as HTMLElement[];
    const tieAnchors = q(".exp-tie-anchor") as HTMLElement[];

    /* Scrubbed / idle state. Nothing else writes these. */
    const st = {
      idle: 0,
      spin: 0,
      tilt: cfg.tilt0,
      orbitZ: -900,
      orbitOpacity: 1,
      planeOpacity: 0,
      tie: 0,
    };
    const ns = nodes.map(() => ({ p: 0 }));

    /* Perspective geometry, refreshed with ScrollTrigger. */
    let P = 1400;
    let Ox = 0;
    let Oy = 0;
    let Lx = 0;
    let Ly = 0;
    let R = 0;
    let nodeR = 0;
    let tiePts: { x: number; y: number }[] = [];

    const measure = () => {
      if (!stage || !anchor) return;
      const cs = getComputedStyle(stage);
      P = parseFloat(cs.perspective) || 1400;

      const po = cs.perspectiveOrigin.split(" ");
      Ox = parseFloat(po[0]);
      Oy = parseFloat(po[1] ?? po[0]);
      if (!Number.isFinite(Ox)) Ox = (stage.clientWidth * cfg.cx) / 100;
      if (!Number.isFinite(Oy)) Oy = (stage.clientHeight * cfg.cy) / 100;

      // The anchor carries a static −50%/−50% translate, so its LAYOUT offset
      // is its visual centre. offsetLeft/Top are transform-independent, which
      // matters: a refresh can land while the shell is mid-tip.
      const ox = shell ? shell.offsetLeft : 0;
      const oy = shell ? shell.offsetTop : 0;
      Lx = ox + anchor.offsetLeft;
      Ly = oy + anchor.offsetTop;
      R = anchor.offsetWidth / 2;
      nodeR = nodes.length ? nodes[0].offsetWidth / 2 : 0;

      tiePts = [];
      if (!cfg.ties || !labels || labels.offsetWidth === 0) return;
      for (let i = 0; i < tieAnchors.length; i++) {
        const row = rows[i];
        const a = tieAnchors[i];
        if (!row || !a) continue;
        tiePts[i] = {
          x: ox + labels.offsetLeft + row.offsetLeft + a.offsetLeft,
          y: oy + labels.offsetTop + row.offsetTop + a.offsetTop,
        };
      }
    };

    const render = () => {
      const total = st.idle + st.spin;
      const cosT = Math.cos(st.tilt * DEG);
      const sinT = Math.sin(st.tilt * DEG);

      if (plane) {
        gsap.set(plane, {
          rotationX: st.tilt,
          rotation: total,
          z: st.orbitZ,
          opacity: st.planeOpacity,
          transformOrigin: "50% 50%",
          force3D: true,
        });
      }

      for (let i = 0; i < nodes.length; i++) {
        const p = ns[i].p;

        if (cfg.mode === "stack") {
          // 0 → 1 arrives out of depth, 1 → 2 passes the camera.
          const inK = Math.min(p, 1);
          const outK = Math.max(0, p - 1);
          gsap.set(nodes[i], {
            x: outK * 78 - (1 - inK) * 46,
            y: outK * -40,
            z: -cfg.depth * (1 - inK) + cfg.push * outK,
            rotationY: (1 - inK) * 28 - outK * 22,
            rotationX: (1 - inK) * -8,
            scale: 1,
            opacity: inK * (1 - outK) * st.orbitOpacity,
            force3D: true,
          });
          continue;
        }

        const a = (BASE[i % BASE.length] + total) * DEG;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const k = Math.min(p, 1);
        const r = R * k;

        const x = ca * r;
        const y = sa * r * cosT;
        const zOrbit = sa * R * sinT * k;
        // 0 on the far side of the ellipse, 1 on the near side.
        const near = 0.5 + 0.5 * sa;

        gsap.set(nodes[i], {
          x,
          y,
          z: zOrbit - cfg.depth * (1 - k) + st.orbitZ,
          rotationY: ca * 11,
          rotationX: 0,
          scale: 0.36 + 0.64 * k,
          opacity: k * (0.52 + 0.48 * near) * st.orbitOpacity,
          force3D: true,
        });

        if (!cfg.ties) continue;
        const tie = tieEls[i];
        const pt = tiePts[i];
        if (!tie || !pt) continue;

        // Project the node centre into flat stage pixels.
        const pk = P / Math.max(1, P - (zOrbit + st.orbitZ));
        const sx = Ox + (Lx + x - Ox) * pk;
        const sy = Oy + (Ly + y - Oy) * pk;
        const dx = sx - pt.x;
        const dy = sy - pt.y;
        const dist = Math.hypot(dx, dy);
        // Stop the hairline on the node's edge, never under it.
        const len = Math.max(0, dist - (nodeR * (0.36 + 0.64 * k) * pk + 14));

        gsap.set(tie, {
          x: pt.x,
          y: pt.y,
          rotation: Math.atan2(dy, dx) / DEG,
          scaleX: (len / TIE_BASE) * st.tie,
          opacity: st.tie * k * (0.28 + 0.72 * near) * st.orbitOpacity,
          force3D: true,
        });
      }
    };

    if (tieEls.length) gsap.set(tieEls, { transformOrigin: "0% 50%" });

    return { stage, shell, plane, nodes, st, ns, measure, render };
  };

  /* ------------------------------------------------------------------ */
  /*  Motion branches                                                    */
  /* ------------------------------------------------------------------ */
  const build = (cfg: Cfg): (() => void) | void => {
    const sys = system(cfg);
    const { stage, st, ns, measure, render } = sys;
    if (!stage || sys.nodes.length === 0) return;

    const core = q(".exp-core");
    const coreFrame = q(".exp-core-frame");
    const coreInner = q(".exp-core-inner");
    const wash = q(".exp-wash");
    const deep = q(".exp-deep");
    const watermark = q(".exp-watermark");
    const marker = q(".exp-marker");
    const textL = q(".exp-text-l");
    const textR = q(".exp-text-r");
    const cta = q(".exp-cta");
    const spine = q(".exp-spine");
    const moves = q(".exp-label-move");
    const shell = q(".exp-shell");

    const clip = (r: number) => `circle(${r}% at ${cfg.cx}% ${cfg.cy}%)`;

    /* The vanishing point rides the circle, so every Z move converges on the
       photograph rather than on the middle of the screen. */
    const prevOrigin = stage.style.perspectiveOrigin;
    stage.style.perspectiveOrigin = `${cfg.cx}% ${cfg.cy}%`;
    gsap.set(core, { clipPath: clip(cfg.r0) });

    measure();
    render();

    /* ---- entrance, before the pin takes hold --------------------------- */
    gsap.fromTo(
      q(".exp-line"),
      { yPercent: 112, rotationX: -72, opacity: 0 },
      {
        yPercent: 0,
        rotationX: 0,
        opacity: 1,
        duration: 1.5,
        ease: "aurum",
        stagger: 0.07,
        transformOrigin: "50% 0%",
        transformPerspective: 900,
        force3D: true,
        scrollTrigger: { trigger: root, start: "top 80%" },
      },
    );

    gsap.fromTo(
      q(".exp-fade"),
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "aurum",
        stagger: 0.09,
        scrollTrigger: { trigger: root, start: "top 66%" },
      },
    );

    /* ---- the orbit is alive at rest ------------------------------------ */
    if (cfg.mode === "orbit") {
      gsap.to(st, { idle: 360, duration: 118, repeat: -1, ease: "none" });
    }

    /* render() is driven off the ticker, not off any one tween, so the orbit
       keeps its geometry whether the scrub, the idle spin, or neither is
       moving. matchMedia cannot reclaim a ticker callback — the teardown
       returned from this branch does. */
    gsap.ticker.add(render);

    /* ---- the scrubbed spine -------------------------------------------- */
    const tl = gsap.timeline({
      defaults: { ease: "none", immediateRender: false },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=" + cfg.scroll * 100 + "%",
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
        onRefresh: measure,
      },
    });

    /* 0.00 → 0.70  the pinhole opens off-axis and crops off the frame edge */
    tl.fromTo(core, { clipPath: clip(cfg.r0) }, { clipPath: clip(46), duration: 0.34, ease: "curtain" }, 0)
      .fromTo(core, { clipPath: clip(46) }, { clipPath: clip(cfg.r1), duration: 0.36, ease: "cine" }, 0.34)
      .fromTo(
        coreFrame,
        { scale: 1.55, z: -140, rotation: -1.2 },
        { scale: 1, z: 0, rotation: 0.4, duration: 0.7, ease: "curtain", force3D: true },
        0,
      );

    /* 0.00 → 0.34  the headlines leave on Z, in opposite directions.
       "MORE THAN A STAY" passes the camera; "A FEELING" recedes. */
    tl.fromTo(
      textL,
      { z: 20, x: 0, rotationY: 0, opacity: 1 },
      {
        z: cfg.push,
        x: "-14vw",
        rotationY: -14,
        opacity: 0,
        duration: 0.3,
        ease: "aurumIn",
        force3D: true,
      },
      0,
    )
      .fromTo(
        textR,
        { z: 20, x: 0, rotationY: 0, opacity: 1 },
        {
          z: -cfg.push,
          x: "7vw",
          rotationY: 26,
          opacity: 0,
          duration: 0.32,
          ease: "aurumIn",
          force3D: true,
        },
        0.02,
      )
      .fromTo(
        marker,
        { z: 140, x: 0, opacity: 1 },
        { z: 620, x: "-7vw", opacity: 0, duration: 0.26, ease: "aurumIn", force3D: true },
        0.01,
      )
      .fromTo(
        cta,
        { z: 60, x: 0, opacity: 1 },
        { z: 460, x: "9vw", opacity: 0, duration: 0.24, ease: "aurumIn", force3D: true },
        0.02,
      );

    /* 0.00 → 0.44  the far ground falls further away, at its own rate */
    tl.fromTo(
      deep,
      { z: -560, yPercent: 0, opacity: 1 },
      { z: -1180, yPercent: -7, opacity: 0, duration: 0.44, ease: "cine", force3D: true },
      0,
    ).fromTo(
      watermark,
      { scale: 1, xPercent: 0 },
      { scale: 1.18, xPercent: -6, duration: 0.4, ease: "cine", force3D: true },
      0,
    );

    if (cfg.mode === "orbit") {
      /* 0.26 → 0.50  the ring rises out of depth and lies down into its tilt */
      tl.fromTo(st, { tilt: cfg.tilt0 }, { tilt: cfg.tilt, duration: 0.24, ease: "aurum" }, 0.26)
        .fromTo(st, { orbitZ: -900 }, { orbitZ: 0, duration: 0.24, ease: "aurum" }, 0.26)
        .fromTo(st, { planeOpacity: 0 }, { planeOpacity: 1, duration: 0.16 }, 0.28);

      /* 0.30 → 0.66  the four photographs take their seats */
      ns.forEach((n, i) => {
        tl.fromTo(n, { p: 0 }, { p: 1, duration: 0.2, ease: "aurum" }, 0.3 + i * 0.055);
      });

      /* 0.28 → 0.86  and the whole orbit turns while you read it */
      tl.fromTo(st, { spin: 0 }, { spin: cfg.spin, duration: 0.58, ease: "none" }, 0.28);

      /* 0.40 → 0.70  the column, the spine, then the hairlines that tie them */
      tl.fromTo(wash, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "cine" }, 0.4)
        .fromTo(
          spine,
          { scaleY: 0 },
          { scaleY: 1, duration: 0.18, ease: "aurum", transformOrigin: "50% 0%" },
          0.42,
        )
        .fromTo(
          moves,
          { x: -70, z: -460, rotationY: 34, opacity: 0 },
          {
            x: 0,
            z: 0,
            rotationY: 0,
            opacity: 1,
            duration: 0.18,
            ease: "aurum",
            stagger: 0.05,
            transformPerspective: 1400,
            transformOrigin: "0% 50%",
            force3D: true,
          },
          0.44,
        )
        .fromTo(st, { tie: 0 }, { tie: 1, duration: 0.22, ease: "cine" }, 0.48);

      /* 0.78 → 0.92  the column turns away, the orbit flattens and recedes */
      tl.fromTo(st, { tie: 1 }, { tie: 0, duration: 0.1, ease: "aurumIn" }, 0.78)
        .fromTo(
          moves,
          { x: 0, z: 0, rotationY: 0, opacity: 1 },
          {
            x: 52,
            z: -300,
            rotationY: -24,
            opacity: 0,
            duration: 0.12,
            ease: "aurumIn",
            stagger: 0.03,
            transformPerspective: 1400,
            force3D: true,
          },
          0.79,
        )
        .fromTo(spine, { scaleY: 1 }, { scaleY: 0, duration: 0.1, ease: "aurumIn" }, 0.8)
        .fromTo(st, { tilt: cfg.tilt }, { tilt: cfg.tilt + 16, duration: 0.12, ease: "aurumIn" }, 0.8)
        .fromTo(st, { orbitZ: 0 }, { orbitZ: -560, duration: 0.12, ease: "aurumIn" }, 0.8)
        .fromTo(st, { orbitOpacity: 1 }, { orbitOpacity: 0, duration: 0.1 }, 0.82)
        .fromTo(wash, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "aurumIn" }, 0.82);
    } else {
      /* Mobile: four sequential beats through the camera. */
      ns.forEach((n, i) => {
        const at = 0.26 + i * 0.145;
        tl.fromTo(n, { p: 0 }, { p: 1, duration: 0.085, ease: "aurum" }, at).fromTo(
          n,
          { p: 1 },
          { p: 2, duration: 0.085, ease: "aurumIn" },
          at + 0.095,
        );
      });
      tl.fromTo(st, { orbitOpacity: 1 }, { orbitOpacity: 0, duration: 0.06 }, 0.86);
    }

    /* 0.86 → 1.00  the upward hand-off into the architecture interlude */
    tl.fromTo(
      coreInner,
      { yPercent: 0, scale: 1 },
      { yPercent: -15, scale: 1.1, duration: 0.14, ease: "cine", force3D: true },
      0.86,
    ).fromTo(
      shell,
      { rotationX: 0, y: 0 },
      {
        rotationX: 8,
        y: "-6vh",
        duration: 0.14,
        ease: "cine",
        transformOrigin: "50% 100%",
        force3D: true,
      },
      0.86,
    );

    return () => {
      gsap.ticker.remove(render);
      stage.style.perspectiveOrigin = prevOrigin;
    };
  };

  mm.add(MQ.desktop, () => build(DESKTOP));
  mm.add(MQ.tablet, () => build(TABLET));
  mm.add(MQ.mobile, () => build(MOBILE));

  /* ---- reduced motion: the finished composition, at rest --------------- */
  mm.add(MQ.reduced, () => {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const cfg = wide ? DESKTOP : MOBILE;
    const sys = system(cfg);
    const { stage, st, ns, measure, render } = sys;
    if (!stage) return;

    const prevOrigin = stage.style.perspectiveOrigin;
    stage.style.perspectiveOrigin = `${cfg.cx}% ${cfg.cy}%`;

    gsap.set(q(".exp-core"), { clipPath: `circle(${cfg.r1}% at ${cfg.cx}% ${cfg.cy}%)` });
    gsap.set(q(".exp-core-frame"), { scale: 1, z: 0, rotation: 0 });
    gsap.set(q(".exp-core-inner"), { yPercent: 0, scale: 1 });
    gsap.set(q(".exp-wash"), { opacity: 1 });
    gsap.set(q(".exp-deep"), { z: -560, yPercent: 0, opacity: 1 });
    gsap.set(q(".exp-watermark"), { scale: 1, xPercent: 0 });
    gsap.set(q(".exp-line"), { yPercent: 0, rotationX: 0, opacity: 1 });
    gsap.set(q(".exp-fade"), { opacity: 1, y: 0 });
    gsap.set([...q(".exp-text-l"), ...q(".exp-text-r")], {
      z: 20, x: 0, rotationY: 0, opacity: 1,
    });
    gsap.set(q(".exp-marker"), { z: 140, x: 0, opacity: 1 });
    gsap.set(q(".exp-cta"), { z: 60, x: 0, opacity: 1 });
    gsap.set(q(".exp-spine"), { scaleY: 1, transformOrigin: "50% 0%" });
    gsap.set(q(".exp-label-move"), {
      x: 0, z: 0, rotationY: 0, opacity: 1, transformPerspective: 1400,
    });
    gsap.set(q(".exp-shell"), { rotationX: 0, y: 0 });

    /* Seat the orbit at its resting pose and draw it once. */
    st.tilt = cfg.tilt;
    st.orbitZ = 0;
    st.planeOpacity = wide ? 1 : 0;
    st.orbitOpacity = wide ? 1 : 0;
    st.tie = wide ? 1 : 0;
    ns.forEach((n) => (n.p = 1));
    measure();
    render();

    /* Narrow: the four nodes would sit on top of one another, so the stack is
       replaced by a typographic index over the full-bleed photograph. */
    const rlist = q(".exp-rlist")[0] as HTMLElement | undefined;
    const anchor = q(".exp-orbit-anchor")[0] as HTMLElement | undefined;
    if (!wide) {
      if (rlist) rlist.style.display = "block";
      // The nodes are invisible here but still hit-testable — take them out.
      if (anchor) anchor.style.display = "none";
    }

    const onResize = () => {
      measure();
      render();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      stage.style.perspectiveOrigin = prevOrigin;
      if (rlist) rlist.style.display = "none";
      if (anchor) anchor.style.display = "";
    };
  });

  return () => mm.revert();
}
