"use client";

import { gsap, scoped, MQ, adoptRestingTransforms } from "@/lib/gsap";

/* --------------------------------------------------------------------------
   CHAPTER 06 — VOICES THAT MATTER

   One pinned stage, four Z planes, two independent motion systems.

   1. THE SCRUB owns the chapter: the camera dollies back, the bed pushes
      forward, the sentence is spoken word by word out of −620px, the deck
      then RECEDES in Z and yaws off-axis while the residence plate comes
      forward through it, and the whole room finally tips away under a veil.

   2. THE SWAP owns the voices: prev/next write `data-voice` on the stage from
      React, a MutationObserver here picks it up, and the outgoing voice falls
      back into Z while the incoming one re-runs the exact same 3D assembly in
      real time. The two systems never share a node — the scrub owns the deck
      wrapper, the swap owns the voice containers inside it.

   Timeline is authored in progress units (total duration = 1) so the published
   choreography maps 1:1 onto whatever pin distance a breakpoint uses.

   Rules this module holds to:
     · every scrubbed tween is a fromTo() and the master sets
       defaults:{ ease:"none", immediateRender:false }
     · the photograph is never animated to invisible
     · clip-path only ever interpolates inset() → inset()
     · anything that flattens 3D (clip-path, opacity < 1) has children that
       carry their own transformPerspective
     · the pointer tilt and the MutationObserver are torn down by the function
       RETURNED from their matchMedia callback
-------------------------------------------------------------------------- */

type Branch = {
  /** ScrollTrigger end distance. */
  end: string;
  /** Word arrival: base depth, per-word depth variance, hinge, yaw, rise. */
  wordZ: number;
  wordZStep: number;
  wordHinge: number;
  wordYaw: number;
  wordRise: number;
  /** Where the quote deck goes when the plate takes the room. */
  deckZ: number;
  deckYaw: number;
  deckXP: number;
  deckYP: number;
  /** Plate arrival depth / entry yaw / the yaw it settles on. */
  plateZ: number;
  plateYaw: number;
  plateSettle: number;
  plateX: number;
  /** Giant numeral arrival depth. */
  numZ: number;
  /** Closing camera move. */
  camZ: number;
  camYaw: number;
  camPitch: number;
  /** Bed push. */
  bedScale: number;
  drift: number;
  /** Swap travel. */
  swapZ: number;
  /** Pointer parallax. */
  tilt: boolean;
};

const DESKTOP: Branch = {
  end: "+=440%",
  wordZ: 620,
  wordZStep: 130,
  wordHinge: -74,
  wordYaw: 16,
  wordRise: 34,
  deckZ: -470,
  deckYaw: -21,
  deckXP: -4,
  deckYP: 0,
  plateZ: -800,
  plateYaw: 36,
  plateSettle: -7,
  plateX: 0.09,
  numZ: -900,
  camZ: -180,
  camYaw: -5,
  camPitch: 3.5,
  bedScale: 1.16,
  drift: 5.5,
  swapZ: 440,
  tilt: true,
};

const TABLET: Branch = {
  ...DESKTOP,
  end: "+=360%",
  wordZ: 470,
  wordZStep: 95,
  wordHinge: -64,
  deckZ: -360,
  deckYaw: -17,
  plateZ: -620,
  plateYaw: 28,
  numZ: -700,
  camZ: -140,
  swapZ: 340,
  tilt: false,
};

/* Mobile is a different composition, not a smaller one: the plate is a band
   along the bottom edge, so the deck lifts and recedes rather than sliding
   sideways, and every depth is scaled to the 900px stage perspective. */
const MOBILE: Branch = {
  end: "+=260%",
  wordZ: 300,
  wordZStep: 62,
  wordHinge: -52,
  wordYaw: 10,
  wordRise: 22,
  deckZ: -250,
  deckYaw: -9,
  deckXP: 0,
  deckYP: -7,
  plateZ: -380,
  plateYaw: 20,
  plateSettle: -4,
  plateX: 0.16,
  numZ: -460,
  camZ: -90,
  camYaw: -3,
  camPitch: 2.2,
  bedScale: 1.2,
  drift: 4,
  swapZ: 240,
  tilt: false,
};

/* Real-time seconds for one assembly. The scrub drives the same timeline by
   progress, so both readings share identical choreography. */
const SPEECH_SPREAD = 0.66;
const SPEECH_WORD = 0.62;
const ASSEMBLY = SPEECH_SPREAD + SPEECH_WORD;

/** Progress window the scrub gives the assembly. */
const ASSEMBLY_AT = 0.02;
const ASSEMBLY_FOR = 0.34;

/**
 * Turns a list of word elements into offsets that read like speech.
 *
 * Each word carries a "beat" cost the NEXT word waits out: long words take
 * longer to say, a comma buys a short rest, a full stop a real one, and an
 * all-caps proper noun (AURUM) earns a beat of emphasis after it. The
 * cumulative costs are normalised into `amount`, so a sentence always finishes
 * exactly on time no matter how many words it has or how it wraps.
 */
function speechOffsets(words: Element[], amount: number): number[] {
  const beats = words.map((w) => {
    const t = (w.textContent ?? "").trim();
    let beat = 1;
    if (t.length > 7) beat += 0.4;
    if (/[A-Z]{4,}/.test(t)) beat += 0.8;
    if (/[,;:]["'”’]?$/.test(t)) beat += 1.1;
    if (/[.!?]["'”’]?$/.test(t)) beat += 2.2;
    return beat;
  });

  const raw: number[] = [0];
  for (let i = 1; i < words.length; i += 1) raw.push(raw[i - 1] + beats[i - 1]);

  const span = raw[raw.length - 1] || 1;
  return raw.map((v) => (v / span) * amount);
}

export function initTestimonial(root: HTMLElement): () => void {
  adoptRestingTransforms(root);
  const q = scoped(root);
  const mm = gsap.matchMedia();

  const build = (cfg: Branch): (() => void) | void => {
    const stage = q(".test-stage")[0] as HTMLElement | undefined;
    const camera = q(".test-camera")[0] as HTMLElement | undefined;
    const tilt = q(".test-tilt")[0] as HTMLElement | undefined;
    const bedInner = q(".test-bed-inner")[0] as HTMLElement | undefined;
    const watermark = q(".test-watermark")[0] as HTMLElement | undefined;
    const deck = q(".test-deck")[0] as HTMLElement | undefined;
    const plate = q(".test-plate")[0] as HTMLElement | undefined;
    const plateClip = q(".test-plate-clip")[0] as HTMLElement | undefined;
    const plateEdge = q(".test-plate-edge")[0] as HTMLElement | undefined;
    const num = q(".test-num")[0] as HTMLElement | undefined;
    const numIn = q(".test-num-in")[0] as HTMLElement | undefined;
    const counter = q(".test-counter-num")[0] as HTMLElement | undefined;
    const vmeta = q(".test-vmeta")[0] as HTMLElement | undefined;
    const veil = q(".test-veil")[0] as HTMLElement | undefined;

    const voices = q(".test-voice") as HTMLElement[];
    const shots = q(".test-shot") as HTMLElement[];
    const shotInners = q(".test-shot-inner") as HTMLElement[];
    const indexLines = q(".test-index-in") as HTMLElement[];
    const indexRule = q(".test-index-rule")[0] as HTMLElement | undefined;
    const railItems = q(".test-rail-item") as HTMLElement[];
    const railRules = q(".test-rail-rule") as HTMLElement[];

    if (!stage || !camera || !bedInner || !deck || !plate || !plateClip) return;
    if (!voices.length || !shots.length) return;

    const vw = () => window.innerWidth;

    /* ------------------------------------------------------------------
       Per-voice assembly timelines. Built once, paused, and then either
       scrubbed (first read) or played (a swap). Because every one of them
       is normalised to the same total duration, progress() maps across
       voices without a recalculation.
    ------------------------------------------------------------------ */
    const voiceTls = voices.map((voice) => {
      const words = Array.from(voice.querySelectorAll<HTMLElement>(".test-word"));
      const rule = voice.querySelector<HTMLElement>(".test-attrib-rule");
      const lines = Array.from(
        voice.querySelectorAll<HTMLElement>(".test-attrib-line"),
      );
      const offsets = speechOffsets(words, SPEECH_SPREAD);

      const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });

      words.forEach((word, i) => {
        tl.fromTo(
          word,
          {
            opacity: 0,
            y: cfg.wordRise,
            /* the depth varies word to word so the sentence is set in the
               air rather than on a single flat card */
            z: -(cfg.wordZ + (i % 3) * cfg.wordZStep),
            rotationX: cfg.wordHinge,
            rotationY: (i % 2 ? 1 : -1) * cfg.wordYaw,
          },
          {
            opacity: 1,
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            duration: SPEECH_WORD,
            ease: "aurum",
            /* the deck animates its own opacity, which flattens 3D for its
               descendants — every word therefore carries its own camera */
            transformPerspective: 1000,
            transformOrigin: "0% 100%",
            force3D: true,
          },
          offsets[i],
        );
      });

      if (rule) {
        tl.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.42,
            ease: "curtain",
            transformOrigin: "0% 50%",
          },
          SPEECH_SPREAD * 0.78,
        );
      }
      if (lines.length) {
        tl.fromTo(
          lines,
          { yPercent: 112, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.44, ease: "aurum", stagger: 0.06 },
          SPEECH_SPREAD * 0.84,
        );
      }

      /* Pin the total duration so progress() means the same thing everywhere. */
      tl.to({ _hold: 0 }, { _hold: 1, duration: 0.001 }, ASSEMBLY);
      /* immediateRender:false means nothing is written until the playhead
         actually passes a tween. Sweep once, inside the layout effect, so the
         hidden pose is real rather than merely declared inline. */
      tl.progress(1).progress(0);
      return tl;
    });

    /* Resting states GSAP owns from here. The TSX declares the visually
       hidden half inline so nothing flashes between paint and hydration. */
    gsap.set(shotInners, { transformOrigin: "50% 50%" });
    gsap.set(bedInner, { transformOrigin: "50% 50%" });
    gsap.set(deck, { transformOrigin: "8% 50%" });

    let current = Number(stage.dataset.voice ?? 0) || 0;
    if (current < 0 || current >= voices.length) current = 0;

    voices.forEach((v, i) => {
      gsap.set(v, {
        autoAlpha: i === current ? 1 : 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        transformPerspective: 1200,
      });
    });
    shots.forEach((s, i) => {
      gsap.set(s, {
        opacity: i === current ? 1 : 0,
        z: 0,
        rotationY: 0,
        scale: 1,
        transformPerspective: 1200,
      });
    });

    /* ------------------------------------------------------------------
       THE SCRUB
    ------------------------------------------------------------------ */
    const assembly = { p: 0 };
    let swapping = false;
    /* Declared before the ScrollTrigger below: its onUpdate can fire during
       creation, and a `let` read from the TDZ would throw. */
    let landed = false;

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
        onUpdate: (self) => {
          // the tilt is only alive once the room has settled and before it tips
          landed = self.progress > 0.5 && self.progress < 0.82;
        },
      },
    });

    /* ---- 0.00 → 1.00  the bed pushes forward for the whole chapter ------- */
    tl.fromTo(
      bedInner,
      { scale: cfg.bedScale, yPercent: cfg.drift, rotation: -0.5 },
      { scale: 1, yPercent: -cfg.drift, rotation: 0.4, duration: 1, ease: "cine", force3D: true },
      0,
    );

    if (watermark) {
      tl.fromTo(
        watermark,
        { xPercent: 5, yPercent: 4 },
        { xPercent: -6, yPercent: -3, duration: 1, force3D: true },
        0,
      );
    }

    /* ---- 0.01 → 0.13  the chapter mark lands before a single word -------- */
    if (indexRule) {
      tl.fromTo(
        indexRule,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.1, ease: "aurum", transformOrigin: "50% 0%" },
        0.01,
      );
    }
    if (indexLines.length) {
      tl.fromTo(
        indexLines,
        { yPercent: 112, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.11, ease: "aurum", stagger: 0.02 },
        0.02,
      );
    }

    /* ---- 0.02 → 0.36  the sentence is spoken out of deep space -----------
     * The scrub drives a proxy, and the proxy drives whichever voice is
     * currently active. That indirection is what lets the same choreography
     * be replayed in real time on a swap without the two fighting. */
    tl.fromTo(
      assembly,
      { p: 0 },
      {
        p: 1,
        duration: ASSEMBLY_FOR,
        onUpdate: () => {
          if (swapping) return;
          voiceTls[current].progress(assembly.p);
        },
      },
      ASSEMBLY_AT,
    );

    /* ---- 0.22 → 0.34  the numeral arrives from the deepest point --------- */
    if (num) {
      tl.fromTo(
        num,
        { opacity: 0, z: cfg.numZ, rotationY: 44, rotationX: -12 },
        {
          opacity: 1,
          z: 0,
          rotationY: 0,
          rotationX: 0,
          duration: 0.12,
          ease: "aurum",
          transformOrigin: "100% 50%",
          force3D: true,
        },
        0.22,
      ).fromTo(
        num,
        { yPercent: 0 },
        { yPercent: -9, duration: 0.62, force3D: true },
        0.34,
      );
    }

    /* ---- 0.36 → 0.50  the rail draws itself open ------------------------- */
    if (railRules.length) {
      tl.fromTo(
        railRules,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.14, ease: "curtain", transformOrigin: "0% 50%" },
        0.36,
      );
    }
    if (railItems.length) {
      tl.fromTo(
        railItems,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.12, ease: "aurum", stagger: 0.05 },
        0.38,
      );
    }

    /* ---- 0.42 → 0.64  the words step back, they do not slide away -------- */
    tl.fromTo(
      deck,
      { z: 0, rotationY: 0, rotationX: 0, xPercent: 0, yPercent: 0, opacity: 1 },
      {
        z: cfg.deckZ,
        rotationY: cfg.deckYaw,
        rotationX: 3,
        xPercent: cfg.deckXP,
        yPercent: cfg.deckYP,
        opacity: 0.42,
        duration: 0.22,
        ease: "cine",
        force3D: true,
      },
      0.42,
    );

    /* ---- 0.46 → 0.74  the plate comes forward through them --------------- */
    tl.fromTo(
      plate,
      { opacity: 0, z: cfg.plateZ, rotationY: cfg.plateYaw, rotationX: 7 },
      {
        opacity: 1,
        z: 0,
        /* it settles a few degrees off-axis — a plate hung in the room,
           never a rectangle pasted onto the screen */
        rotationY: cfg.plateSettle,
        rotationX: 0,
        duration: 0.28,
        ease: "aurum",
        transformOrigin: "80% 50%",
        force3D: true,
      },
      0.46,
    );
    tl.fromTo(
      plateClip,
      { clipPath: "inset(0% 0% 0% 100%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.26, ease: "curtain" },
      0.48,
    );
    tl.fromTo(
      shotInners,
      { scale: 1.24, x: () => cfg.plateX * vw() },
      { scale: 1, x: 0, duration: 0.3, ease: "cine", force3D: true },
      0.48,
    );
    if (plateEdge) {
      tl.fromTo(
        plateEdge,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.14, ease: "curtain", transformOrigin: "50% 100%" },
        0.6,
      );
    }

    /* ---- 0.64 → 1.00  a slow push in, so the hold is never dead ---------- */
    tl.fromTo(
      shotInners,
      { yPercent: 0 },
      { yPercent: -4, duration: 0.36, force3D: true },
      0.64,
    );

    /* ---- 0.70 → 0.84  the spine label lands against the open plate ------- */
    if (vmeta) {
      tl.fromTo(
        vmeta,
        { clipPath: "inset(100% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.14, ease: "curtain" },
        0.7,
      );
    }

    /* ---- 0.76 → 1.00  the camera pulls out of the room ------------------- */
    tl.fromTo(
      camera,
      { z: 0, rotationY: 0, rotationX: 0 },
      {
        z: cfg.camZ,
        rotationY: cfg.camYaw,
        rotationX: cfg.camPitch,
        duration: 0.24,
        ease: "cine",
        transformOrigin: "50% 50%",
        force3D: true,
      },
      0.76,
    );

    /* ---- 0.88 → 1.00  blackout, so chapter 07 opens out of near-black ---- */
    if (veil) {
      tl.fromTo(veil, { opacity: 0 }, { opacity: 0.66, duration: 0.12, ease: "aurumIn" }, 0.88);
    }

    /* ------------------------------------------------------------------
       THE SWAP — prev/next actually do something now.

       React flips `data-voice` on the stage; everything below is GSAP. The
       outgoing voice falls back into Z, the incoming one re-runs the whole
       3D assembly in real time, and the plate cross-dissolves in depth.
    ------------------------------------------------------------------ */
    let pending: number | null = null;

    const settle = () => {
      swapping = false;
      const next = pending;
      pending = null;
      if (next !== null && next !== current) {
        request(next);
      } else {
        // hand the words back to the scrub at whatever progress it holds
        voiceTls[current].progress(assembly.p);
      }
    };

    const run = (next: number) => {
      const prev = current;
      current = next;
      swapping = true;

      voiceTls[prev].pause();

      /* out — the voice steps back and turns away */
      gsap.to(voices[prev], {
        z: -cfg.swapZ,
        rotationY: -18,
        rotationX: 7,
        opacity: 0,
        duration: 0.5,
        ease: "aurumIn",
        transformPerspective: 1200,
        transformOrigin: "0% 50%",
        force3D: true,
        onComplete: () => {
          voiceTls[prev].progress(0);
          gsap.set(voices[prev], { autoAlpha: 0, z: 0, rotationX: 0, rotationY: 0 });
        },
      });

      /* in — same assembly, played rather than scrubbed */
      gsap.set(voices[next], {
        autoAlpha: 1,
        opacity: 1,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        transformPerspective: 1200,
      });
      voiceTls[next].play(0);

      /* the plate dissolves in depth, never a flat cross-fade */
      gsap.to(shots[prev], {
        opacity: 0,
        z: -cfg.swapZ * 0.5,
        scale: 1.05,
        duration: 0.62,
        ease: "aurumIn",
        transformPerspective: 1200,
        force3D: true,
      });
      gsap.fromTo(
        shots[next],
        { opacity: 0, z: -cfg.swapZ * 0.7, rotationY: 22, scale: 1.07 },
        {
          opacity: 1,
          z: 0,
          rotationY: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.14,
          ease: "aurum",
          transformPerspective: 1200,
          force3D: true,
        },
      );

      if (numIn) {
        gsap.fromTo(
          numIn,
          { yPercent: 42, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.62, ease: "aurum", force3D: true },
        );
      }
      if (counter) {
        gsap.fromTo(
          counter,
          { yPercent: 55, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.5, ease: "aurum", force3D: true },
        );
      }

      gsap.delayedCall(ASSEMBLY + 0.16, settle);
    };

    /* Queue rather than drop: a second click during a swap is honoured the
       moment the first one lands, so React state and GSAP never desync. */
    function request(next: number) {
      if (next === current || next < 0 || next >= voices.length) return;
      if (swapping) {
        pending = next;
        return;
      }
      run(next);
    }

    const observer = new MutationObserver(() => {
      request(Number(stage.dataset.voice ?? 0) || 0);
    });
    observer.observe(stage, { attributes: true, attributeFilter: ["data-voice"] });

    /* ------------------------------------------------------------------
       POINTER PARALLAX — on the tilt rig, never on a property the scrub
       owns. The scrub drives .test-camera; the pointer drives .test-tilt.
    ------------------------------------------------------------------ */
    if (!cfg.tilt || !tilt) {
      return () => observer.disconnect();
    }

    const setY = gsap.quickTo(tilt, "rotationY", { duration: 1, ease: "power3" });
    const setX = gsap.quickTo(tilt, "rotationX", { duration: 1, ease: "power3" });
    gsap.set(tilt, { transformOrigin: "50% 50%", force3D: true });

    const onMove = (e: PointerEvent) => {
      if (!landed) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setY(nx * 4.5);
      setX(-ny * 3);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    /* Returned to matchMedia — a breakpoint change must not leave a dead
       branch's listener or observer writing onto the live one. */
    return () => {
      window.removeEventListener("pointermove", onMove);
      observer.disconnect();
    };
  };

  mm.add(MQ.desktop, () => build(DESKTOP));
  mm.add(MQ.tablet, () => build(TABLET));
  mm.add(MQ.mobile, () => build(MOBILE));

  /* ---- reduced motion: the whole composition at rest, still switchable --- */
  mm.add(MQ.reduced, () => {
    const stage = q(".test-stage")[0] as HTMLElement | undefined;
    const voices = q(".test-voice") as HTMLElement[];
    const shots = q(".test-shot") as HTMLElement[];

    gsap.set(q(".test-word"), {
      opacity: 1,
      x: 0,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      transformPerspective: 1000,
    });
    gsap.set(q(".test-attrib-rule"), { scaleX: 1, transformOrigin: "0% 50%" });
    gsap.set(q(".test-attrib-line"), { yPercent: 0, opacity: 1 });
    gsap.set(q(".test-index-in"), { yPercent: 0, opacity: 1 });
    gsap.set(q(".test-index-rule"), { scaleY: 1, transformOrigin: "50% 0%" });
    gsap.set(q(".test-rail-rule"), { scaleX: 1, transformOrigin: "0% 50%" });
    gsap.set(q(".test-rail-item"), { autoAlpha: 1, y: 0 });
    gsap.set(q(".test-deck"), {
      z: 0,
      rotationX: 0,
      rotationY: 0,
      xPercent: 0,
      yPercent: 0,
      opacity: 1,
    });
    gsap.set(q(".test-plate"), { opacity: 1, z: 0, rotationX: 0, rotationY: 0 });
    gsap.set(q(".test-plate-clip"), { clipPath: "inset(0% 0% 0% 0%)" });
    gsap.set(q(".test-plate-edge"), { scaleY: 1, transformOrigin: "50% 100%" });
    gsap.set(q(".test-shot-inner"), { scale: 1, x: 0, yPercent: 0 });
    gsap.set(q(".test-bed-inner"), { scale: 1, yPercent: 0, rotation: 0 });
    gsap.set(q(".test-watermark"), { xPercent: 0, yPercent: 0 });
    gsap.set(q(".test-num"), { opacity: 1, z: 0, rotationX: 0, rotationY: 0, yPercent: 0 });
    gsap.set(q(".test-num-in"), { yPercent: 0, opacity: 1 });
    gsap.set(q(".test-counter-num"), { yPercent: 0, opacity: 1 });
    gsap.set(q(".test-vmeta"), { clipPath: "inset(0% 0% 0% 0%)" });
    gsap.set(q(".test-camera"), { z: 0, rotationX: 0, rotationY: 0 });
    gsap.set(q(".test-tilt"), { rotationX: 0, rotationY: 0 });
    gsap.set(q(".test-veil"), { opacity: 0 });

    if (!stage || !voices.length) return;

    let shown = Number(stage.dataset.voice ?? 0) || 0;
    if (shown < 0 || shown >= voices.length) shown = 0;
    voices.forEach((v, i) => gsap.set(v, { autoAlpha: i === shown ? 1 : 0 }));
    shots.forEach((s, i) => gsap.set(s, { opacity: i === shown ? 1 : 0 }));

    /* The controls still work — they simply cut instead of choreographing. */
    const observer = new MutationObserver(() => {
      const next = Number(stage.dataset.voice ?? 0) || 0;
      if (next === shown || next < 0 || next >= voices.length) return;
      shown = next;
      voices.forEach((v, i) => gsap.set(v, { autoAlpha: i === shown ? 1 : 0 }));
      shots.forEach((s, i) => gsap.set(s, { opacity: i === shown ? 1 : 0 }));
    });
    observer.observe(stage, { attributes: true, attributeFilter: ["data-voice"] });

    return () => observer.disconnect();
  });

  return () => mm.revert();
}
