#!/usr/bin/env node
/**
 * AURUM — PROCEDURAL CINEMATIC IMAGE GENERATOR
 * =============================================================================
 * Run:   node scripts/generate-images.mjs
 * npm:   "images": "node scripts/generate-images.mjs"
 *        "assets": "npm run images && npm run catalog"
 *
 * There is no photo library and no image model in this environment, so this
 * script does NOT pretend to ship photographs. It generates deterministic,
 * layered PROCEDURAL CONCEPT ART — atmospheric scenes built from seeded noise,
 * fractal ridgelines, gradient skies and specular water — all pushed through
 * one shared cinematic grade and one shared film grain so the frames read as a
 * single shoot. Real photography drops in later, filename for filename.
 *
 * Source of truth is src/lib/images.ts (IMAGE_ASSETS). This script reads that
 * file as TEXT and extracts key/file/width/height/recipe/seed, so there is no
 * build step and no duplicated manifest.
 *
 * Writes:
 *   public/images/<file>.webp          q86 effort5, manifest dimensions
 *   public/images/preview/<key>.jpg    1000px q78  (pdfkit cannot embed webp)
 *   src/lib/image-blur.ts              24px base64 LQIP map
 * =============================================================================
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "images");
const PREVIEW_DIR = path.join(OUT_DIR, "preview");
const MANIFEST = path.join(ROOT, "src", "lib", "images.ts");
const BLUR_FILE = path.join(ROOT, "src", "lib", "image-blur.ts");

/* ========================================================================== *
 * 1. PALETTE — the whole set lives inside this world.
 * ========================================================================== */
const P = {
  ink: "#05060a",
  obsidian: "#0a0b10",
  teal: "#0d1a1f",
  slate: "#1b2430",
  haze: "#3d4a57",
  amber: "#c8a76a",
  gold: "#e8d3a3",
  ember: "#a86b3a",
  bone: "#b9b3a7",
};

const hex2rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const rgb2hex = (r) =>
  "#" +
  r
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
/** Blend two palette colours — stay inside the world, but get real tone. */
function mix(a, b, t) {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return rgb2hex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t));
}
/** Scale luminance without shifting hue. */
function dim(c, k) {
  return rgb2hex(hex2rgb(c).map((v) => v * k));
}

/* ========================================================================== *
 * 2. SEEDED RANDOM — never Math.random; output must be reproducible.
 * ========================================================================== */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => Number(Number(v).toFixed(2));

/* ========================================================================== *
 * 3. SCENE — accumulates <defs> and body, hands out unique ids.
 * ========================================================================== */
class Scene {
  constructor(w, h, seed) {
    this.w = w;
    this.h = h;
    this.defs = [];
    this.body = [];
    this._id = 0;
    this.rng = mulberry32(seed);
  }
  id(p = "x") {
    return p + ++this._id;
  }
  def(s) {
    this.defs.push(s);
    return this;
  }
  add(s) {
    this.body.push(s);
    return this;
  }
  r(a = 0, b = 1) {
    return a + this.rng() * (b - a);
  }
  /** signed, centre-biased */
  rs(k = 1) {
    return (this.rng() + this.rng() - 1) * k;
  }
  ri(a, b) {
    return Math.floor(this.r(a, b + 1));
  }
  toSVG() {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">` +
      `<defs>${this.defs.join("")}</defs>` +
      `<rect width="${this.w}" height="${this.h}" fill="${P.ink}"/>` +
      this.body.join("") +
      `</svg>`
    );
  }
}

/* ========================================================================== *
 * 4. CORE PRIMITIVES
 * ========================================================================== */

/** stops: [[offset, color, opacity], ...] */
function linGrad(S, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
  const id = S.id("lg");
  S.def(
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
      stops
        .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
        .join("") +
      `</linearGradient>`,
  );
  return id;
}
function radGrad(S, stops, cx = 0.5, cy = 0.5, r = 0.5) {
  const id = S.id("rg");
  S.def(
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">` +
      stops
        .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
        .join("") +
      `</radialGradient>`,
  );
  return id;
}
/** Gradient-filled rect. The workhorse. */
function gradRect(S, x, y, w, h, stops, dir) {
  const [x1, y1, x2, y2] = dir || [0, 0, 0, 1];
  const id = linGrad(S, stops, x1, y1, x2, y2);
  S.add(
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#${id})"/>`,
  );
}
/** Soft bloom. Multi-stop radial rather than feGaussianBlur — fast and smooth. */
function glow(S, { x, y, rx, ry, color, opacity = 0.3, falloff = 1 }) {
  const s = (v) => Number((opacity * v).toFixed(4));
  const id = radGrad(S, [
    [0, color, s(1)],
    [0.14, color, s(0.72 * falloff)],
    [0.3, color, s(0.4 * falloff)],
    [0.5, color, s(0.17 * falloff)],
    [0.72, color, s(0.05 * falloff)],
    [1, color, 0],
  ]);
  S.add(
    `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry == null ? rx : ry)}" fill="url(#${id})"/>`,
  );
}

/** Sky: vertical gradient + a light-source bloom on the horizon. */
function skyGradient(S, opts) {
  const {
    top,
    mid,
    horizon,
    glowColor,
    horizonY,
    sunX,
    sunY,
    glowR = 0.9,
    glowO = 0.5,
  } = opts;
  gradRect(S, 0, 0, S.w, horizonY + 4, [
    [0, top, 1],
    [0.42, mid, 1],
    [0.8, mix(mid, horizon, 0.72), 1],
    [1, horizon, 1],
  ]);
  if (glowColor) {
    glow(S, {
      x: sunX,
      y: sunY,
      rx: S.w * glowR,
      ry: S.h * glowR * 0.62,
      color: glowColor,
      opacity: glowO,
    });
  }
}

/** Sun / moon: wide halo, bright core, crisp disc. */
function celestialBody(S, x, y, r, opts = {}) {
  const { warm = 0.5, intensity = 1 } = opts;
  const core = mix(P.bone, P.gold, warm);
  const halo = mix(mix(P.haze, P.bone, 0.5), P.amber, warm);
  glow(S, { x, y, rx: r * 11, ry: r * 11, color: halo, opacity: 0.3 * intensity });
  glow(S, { x, y, rx: r * 3.6, ry: r * 3.6, color: core, opacity: 0.5 * intensity });
  const id = radGrad(S, [
    [0, mix(core, "#ffffff", 0.35), 1],
    [0.72, core, 1],
    [0.94, core, 0.82],
    [1, core, 0],
  ]);
  S.add(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"/>`);
}

/* ---- fractal midpoint displacement --------------------------------------- */
function fractalProfile(rng, levels, roughness) {
  let pts = [rng() * 2 - 1, rng() * 2 - 1];
  let amp = 1;
  for (let l = 0; l < levels; l++) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(pts[i]);
      next.push((pts[i] + pts[i + 1]) / 2 + (rng() * 2 - 1) * amp);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    amp *= roughness;
  }
  const mn = Math.min.apply(null, pts);
  const mx = Math.max.apply(null, pts);
  const span = mx - mn || 1;
  return pts.map((v) => ((v - mn) / span) * 2 - 1);
}

/**
 * Mountain / hill / dune silhouette. Returns { d, pts } so a caller can draw it
 * twice at an offset (a lit snow rim) or place objects on the crest.
 */
function ridgePath(S, opts) {
  const {
    y,
    amp,
    levels = 6,
    rough = 0.55,
    peak = 0,
    peakX = 0.5,
    peakW = 0.25,
    bottom = null,
    from = -0.04,
    to = 1.04,
    dx = 0,
    dy = 0,
  } = opts;
  const prof = fractalProfile(S.rng, levels, rough);
  const N = prof.length;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = (from + (to - from) * t) * S.w + dx;
    let yy = y + prof[i] * amp + dy;
    if (peak) {
      const d = (t - peakX) / peakW;
      yy -= peak * Math.exp(-d * d);
    }
    pts.push([x, yy]);
  }
  const b = bottom == null ? S.h + 20 : bottom;
  let d = `M ${n(pts[0][0])} ${n(b)} L ${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${n(pts[i][0])} ${n(pts[i][1])}`;
  d += ` L ${n(pts[pts.length - 1][0])} ${n(b)} Z`;
  return { d, pts };
}
function ridgeline(S, opts) {
  const { d, pts } = ridgePath(S, opts);
  S.add(
    `<path d="${d}" fill="${opts.color}" fill-opacity="${opts.opacity == null ? 1 : opts.opacity}"/>`,
  );
  return pts;
}
/** Aerial perspective: haze pooling at the base of a far ridge. */
function hazeBand(S, y, h, color, o = 0.3) {
  gradRect(S, 0, y, S.w, h, [
    [0, color, 0],
    [0.35, color, o],
    [0.62, color, o * 0.72],
    [1, color, 0],
  ]);
}

/** Water: gradient plane, sun-path wedge, distance-falloff specular streaks. */
function waterPlane(S, opts) {
  const {
    y,
    h,
    top,
    bottom,
    sunX,
    sunColor = P.gold,
    streaks = 34,
    pathW = 0.16,
    pathO = 0.34,
    scatter = 0.24,
    glint = 0.9,
    hazeO = 0.18,
  } = opts;
  gradRect(S, 0, y, S.w, h, [
    [0, top, 1],
    [0.18, mix(top, bottom, 0.28), 1],
    [0.45, mix(top, bottom, 0.62), 1],
    [1, bottom, 1],
  ]);
  // the waterline is never a razor edge — haze always pools on the horizon
  if (hazeO > 0) {
    const hc = mix(sunColor || P.bone, P.haze, 0.45);
    gradRect(S, 0, y - h * 0.05, S.w, h * 0.1, [
      [0, hc, 0],
      [0.5, hc, hazeO],
      [1, hc, 0],
    ]);
  }
  if (sunX != null) {
    // nested wedges rather than one hard-edged trapezoid: the overlap gives a
    // linear falloff to the sides, so the glitter path feathers into the water
    const K = 7;
    const nw = S.w * 0.016;
    const fw = S.w * pathW;
    const a = (pathO * 1.2) / K;
    for (let k = 1; k <= K; k++) {
      const f = 0.22 + 0.78 * (k / K);
      const gid = linGrad(S, [
        [0, sunColor, a],
        [0.35, sunColor, a * 0.62],
        [0.75, sunColor, a * 0.22],
        [1, sunColor, 0],
      ]);
      S.add(
        `<path d="M ${n(sunX - nw * f)} ${n(y)} L ${n(sunX + nw * f)} ${n(y)} L ${n(sunX + fw * f)} ${n(y + h)} L ${n(sunX - fw * f)} ${n(y + h)} Z" fill="url(#${gid})"/>`,
      );
    }
  }
  for (let i = 0; i < streaks; i++) {
    const t = Math.pow(S.rng(), 1.55);
    const yy = y + h * Math.pow(t, 1.35) + S.r(-2, 2);
    const near = t;
    const inPath = sunX != null && S.rng() < 0.68;
    const cx = inPath ? sunX + S.rs(1) * S.w * (0.02 + scatter * near) : S.r(0, S.w);
    const wd = S.w * (0.008 + 0.085 * near) * S.r(0.35, 1.5) * (inPath ? 1 : 0.55);
    const ht = 1 + 5.2 * near * S.r(0.5, 1.3);
    const o = (inPath ? 0.62 : 0.16) * (1 - 0.52 * near) * S.r(0.45, 1.25) * glint;
    const col = inPath ? mix(sunColor, "#ffffff", 0.22 * S.rng()) : mix(P.bone, P.haze, 0.55);
    S.add(
      `<rect x="${n(cx - wd / 2)}" y="${n(yy)}" width="${n(wd)}" height="${n(ht)}" rx="${n(ht / 2)}" fill="${col}" fill-opacity="${n(Math.min(0.85, o))}"/>`,
    );
  }
}

/** Fir silhouettes with jittered heights. */
function conifers(S, opts) {
  const {
    baseY,
    count,
    x0 = -0.03,
    x1 = 1.03,
    minH,
    maxH,
    color,
    opacity = 1,
    wob = 0.34,
  } = opts;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const t = i / count + S.rs(0.5) / count;
    const cx = (x0 + (x1 - x0) * t) * S.w;
    const hgt = S.r(minH, maxH);
    const hw = hgt * S.r(0.2, 0.3);
    const by = baseY + S.rs(1) * hgt * 0.05;
    let d = `M ${n(cx - hw)} ${n(by)}`;
    const tiers = 3;
    for (let k = tiers; k >= 1; k--) {
      const f = k / tiers;
      d += ` L ${n(cx - hw * f * 0.62)} ${n(by - hgt * (1 - f) - hgt * 0.06)}`;
      d += ` L ${n(cx - hw * f * 0.9)} ${n(by - hgt * (1 - f) - hgt * 0.1)}`;
    }
    d += ` L ${n(cx + S.rs(1) * hw * wob)} ${n(by - hgt)}`;
    for (let k = 1; k <= tiers; k++) {
      const f = k / tiers;
      d += ` L ${n(cx + hw * f * 0.9)} ${n(by - hgt * (1 - f) - hgt * 0.1)}`;
      d += ` L ${n(cx + hw * f * 0.62)} ${n(by - hgt * (1 - f) - hgt * 0.06)}`;
    }
    d += ` L ${n(cx + hw)} ${n(by)} Z`;
    parts.push(d);
  }
  S.add(`<path d="${parts.join(" ")}" fill="${color}" fill-opacity="${opacity}"/>`);
}

/** Architectural volume: slabs, cantilever, warm window slits, water reflection. */
function building(S, x, y, w, h, opts = {}) {
  const {
    body = mix(P.obsidian, P.slate, 0.35),
    slab = mix(P.slate, P.haze, 0.3),
    windows = 4,
    winColor = P.amber,
    winO = 0.9,
    cantilever = 0.22,
    reflectTo = null,
    glowO = 0.5,
  } = opts;
  const cx = x - w * cantilever;
  const bid = linGrad(S, [
    [0, mix(body, P.slate, 0.35), 1],
    [0.55, body, 1],
    [1, mix(body, P.ink, 0.6), 1],
  ]);
  S.add(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#${bid})"/>`);
  // cantilevered floor plate: a thin bright lip over a dark soffit
  S.add(
    `<rect x="${n(cx)}" y="${n(y + h * 0.46)}" width="${n(w * (1 + cantilever))}" height="${n(h * 0.035)}" fill="${slab}" fill-opacity="0.5"/>`,
  );
  S.add(
    `<rect x="${n(cx)}" y="${n(y + h * 0.495)}" width="${n(w * (1 + cantilever))}" height="${n(h * 0.055)}" fill="${P.ink}" fill-opacity="0.55"/>`,
  );
  S.add(
    `<rect x="${n(x - w * 0.04)}" y="${n(y - h * 0.05)}" width="${n(w * 1.08)}" height="${n(h * 0.03)}" fill="${slab}" fill-opacity="0.4"/>`,
  );
  const lit = [];
  for (let i = 0; i < windows; i++) {
    const f = windows > 1 ? i / (windows - 1) : 0.4;
    const wy = y + h * (0.1 + 0.7 * f);
    const wx = x + w * S.r(0.05, 0.14);
    const ww = Math.min(w * S.r(0.45, 0.92), w - (wx - x) - w * 0.06);
    const hh = h * S.r(0.05, 0.11);
    lit.push([wx, wy, ww, hh]);
    const gid = linGrad(S, [
      [0, mix(winColor, P.bone, 0.3), winO],
      [0.6, winColor, winO * 0.9],
      [1, mix(winColor, P.ember, 0.5), winO * 0.7],
    ]);
    S.add(
      `<rect x="${n(wx)}" y="${n(wy)}" width="${n(ww)}" height="${n(hh)}" fill="url(#${gid})"/>`,
    );
    // mullions break the glazing so it doesn't read as a painted bar
    const bays = Math.max(2, Math.round(ww / (h * 0.34)));
    for (let b = 1; b < bays; b++) {
      S.add(`<rect x="${n(wx + (ww * b) / bays)}" y="${n(wy)}" width="${n(Math.max(1.2, w * 0.006))}" height="${n(hh)}" fill="${P.ink}" fill-opacity="0.6"/>`);
    }
    // warm spill down the facade below each opening
    gradRect(S, wx, wy + hh, ww, h * 0.12, [
      [0, winColor, 0.22],
      [1, winColor, 0],
    ]);
  }
  for (const [wx, wy, ww, hh] of lit) {
    glow(S, {
      x: wx + ww / 2,
      y: wy + hh / 2,
      rx: ww * 2.6,
      ry: hh * 7,
      color: winColor,
      opacity: 0.3 * glowO,
    });
  }
  if (reflectTo != null) {
    const base = y + h;
    for (const [wx, wy, ww, hh] of lit) {
      const ry0 = base + (base - (wy + hh));
      const steps = 9;
      for (let s = 0; s < steps; s++) {
        const sy = ry0 + (s * (reflectTo - ry0)) / steps;
        if (sy > reflectTo) break;
        S.add(
          `<rect x="${n(wx + S.rs(1) * ww * 0.18)}" y="${n(sy)}" width="${n(ww * S.r(0.5, 1.05))}" height="${n(Math.max(1.5, hh * 0.35))}" fill="${winColor}" fill-opacity="${n(0.34 * (1 - s / steps) * S.r(0.5, 1))}"/>`,
        );
      }
    }
  }
}

/** Mist / volumetric light: a few very large, very soft ellipses. */
function atmosphere(S, opts = {}) {
  const { strength = 1, y0 = 0.25, y1 = 0.85, color = P.haze, count = 5 } = opts;
  for (let i = 0; i < count; i++) {
    glow(S, {
      x: S.r(-0.1, 1.1) * S.w,
      y: S.r(y0, y1) * S.h,
      rx: S.r(0.28, 0.68) * S.w,
      ry: S.r(0.05, 0.15) * S.h,
      color: i % 3 === 0 ? mix(color, P.bone, 0.4) : color,
      opacity: S.r(0.045, 0.11) * strength,
    });
  }
}

/** Volumetric shafts from an (often off-frame) source. */
function lightShafts(S, opts) {
  const {
    x,
    y,
    count = 5,
    spread = 0.9,
    len = 1.5,
    color = P.gold,
    opacity = 0.07,
    angle = 0.6,
  } = opts;
  for (let i = 0; i < count; i++) {
    const a = angle + S.rs(1) * spread * 0.5;
    const wdt = S.r(0.02, 0.075) * S.w;
    const L = len * S.h * S.r(0.7, 1.25);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const px = -dy;
    const py = dx;
    const id = linGrad(
      S,
      [
        [0, color, opacity],
        [0.55, color, opacity * 0.45],
        [1, color, 0],
      ],
      0,
      0,
      dx * 0.6 + 0.5,
      dy * 0.6 + 0.5,
    );
    const x0 = x + px * wdt;
    const y0 = y + py * wdt;
    const x1 = x - px * wdt;
    const y1 = y - py * wdt;
    S.add(
      `<path d="M ${n(x0)} ${n(y0)} L ${n(x1)} ${n(y1)} L ${n(x1 + dx * L - px * wdt * 2.4)} ${n(y1 + dy * L - py * wdt * 2.4)} L ${n(x0 + dx * L + px * wdt * 2.4)} ${n(y0 + dy * L + py * wdt * 2.4)} Z" fill="url(#${id})"/>`,
    );
  }
}

/** Dust motes inside a shaft. */
function motes(S, opts) {
  const { x0, y0, x1, y1, count = 70, color = P.gold } = opts;
  for (let i = 0; i < count; i++) {
    const t = S.rng();
    const u = S.rng();
    const px = x0 + (x1 - x0) * t + S.rs(1) * (x1 - x0) * 0.1;
    const py = y0 + (y1 - y0) * u + S.rs(1) * 20;
    S.add(
      `<circle cx="${n(px)}" cy="${n(py)}" r="${n(S.r(0.8, 3.2))}" fill="${color}" fill-opacity="${n(S.r(0.08, 0.4))}"/>`,
    );
  }
}

/* ========================================================================== *
 * 5. GRADE — the pass that makes every scene feel like ONE film.
 * ========================================================================== */
function grade(S, opts = {}) {
  const {
    sunX = 0.5,
    sunY = 0.35,
    warm = 0.14,
    vignette = 0.92,
    teal = 0.3,
    letterbox = 0.5,
    lift = 0,
  } = opts;
  if (warm > 0) {
    glow(S, {
      x: sunX * S.w,
      y: sunY * S.h,
      rx: S.w * 0.82,
      ry: S.h * 0.9,
      color: P.amber,
      opacity: warm,
    });
  }
  const tid = radGrad(S, [
    [0, P.teal, 0],
    [0.45, P.teal, 0],
    [0.72, P.teal, teal * 0.35],
    [1, mix(P.teal, P.ink, 0.5), teal],
  ]);
  S.add(`<rect width="${S.w}" height="${S.h}" fill="url(#${tid})"/>`);
  // Vignette split between a gentle radial and straight edge falloffs, so it
  // reads as lens falloff instead of a visible oval painted over the frame.
  const vid = radGrad(S, [
    [0, P.ink, 0],
    [0.45, P.ink, 0.01],
    [0.66, P.ink, vignette * 0.06],
    [0.82, P.ink, vignette * 0.2],
    [0.93, P.ink, vignette * 0.4],
    [1, P.ink, vignette * 0.72],
  ]);
  S.add(`<rect width="${S.w}" height="${S.h}" fill="url(#${vid})"/>`);
  gradRect(S, 0, 0, S.w * 0.18, S.h, [
    [0, P.ink, vignette * 0.4],
    [0.55, P.ink, vignette * 0.07],
    [1, P.ink, 0],
  ], [0, 0, 1, 0]);
  gradRect(S, S.w * 0.82, 0, S.w * 0.18, S.h, [
    [0, P.ink, 0],
    [0.45, P.ink, vignette * 0.07],
    [1, P.ink, vignette * 0.4],
  ], [0, 0, 1, 0]);
  gradRect(S, 0, 0, S.w, S.h * 0.2, [
    [0, P.ink, letterbox * 0.62],
    [1, P.ink, 0],
  ]);
  gradRect(S, 0, S.h * 0.74, S.w, S.h * 0.26, [
    [0, P.ink, 0],
    [1, P.ink, letterbox * 0.78],
  ]);
  if (lift > 0) {
    S.add(
      `<rect width="${S.w}" height="${S.h}" fill="${mix(P.haze, P.slate, 0.5)}" fill-opacity="${lift}"/>`,
    );
  }
}

/* ========================================================================== *
 * 6. RECIPES â€” one per "recipe" value in the manifest.
 *    Each must differ in horizon height, light direction, subject and value
 *    structure. Keep them inside the palette; cold shadow, one warm source.
 * ========================================================================== */
const RECIPES = {};

/* --- 01 alpine-dusk â€” hero. Low horizon, colossal moon right, mirror lake. -- */
RECIPES["alpine-dusk"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.6;
  const mx = w * 0.705;
  const my = h * 0.4;
  skyGradient(S, {
    top: P.ink,
    mid: mix(P.slate, P.teal, 0.45),
    horizon: mix(P.haze, P.amber, 0.3),
    horizonY: hz,
    glowColor: mix(P.amber, P.haze, 0.5),
    sunX: mx,
    sunY: my + h * 0.06,
    glowR: 0.8,
    glowO: 0.4,
  });
  for (let i = 0; i < 6; i++) {
    glow(S, {
      x: S.r(0, 1) * w,
      y: S.r(0.06, 0.4) * h,
      rx: S.r(0.16, 0.44) * w,
      ry: S.r(0.012, 0.032) * h,
      color: mix(P.haze, P.slate, 0.5),
      opacity: S.r(0.07, 0.16),
    });
  }
  celestialBody(S, mx, my, h * 0.135, { warm: 0.3, intensity: 0.95 });

  const layers = [
    { y: hz - h * 0.175, amp: h * 0.042, rough: 0.56, lv: 6, pk: h * 0.08, px: 0.24, c: mix(P.haze, P.slate, 0.42), o: 0.5 },
    { y: hz - h * 0.125, amp: h * 0.048, rough: 0.58, lv: 6, pk: h * 0.062, px: 0.83, c: mix(P.slate, P.teal, 0.35), o: 0.72 },
    { y: hz - h * 0.076, amp: h * 0.042, rough: 0.6, lv: 7, pk: h * 0.05, px: 0.46, c: mix(P.teal, P.ink, 0.3), o: 0.9 },
    { y: hz - h * 0.028, amp: h * 0.026, rough: 0.62, lv: 7, pk: 0, px: 0.5, c: P.obsidian, o: 0.98 },
  ];
  layers.forEach((L, i) => {
    ridgeline(S, {
      y: L.y, amp: L.amp, levels: L.lv, rough: L.rough,
      peak: L.pk, peakX: L.px, peakW: 0.17,
      color: L.c, opacity: L.o, bottom: hz + 6,
    });
    hazeBand(S, L.y + L.amp * 0.5, h * 0.1, mix(P.haze, P.bone, 0.22 - i * 0.05), 0.24 - i * 0.045);
  });

  waterPlane(S, {
    y: hz, h: h - hz,
    top: mix(P.slate, P.teal, 0.5),
    bottom: P.ink,
    sunX: mx,
    sunColor: mix(P.bone, P.amber, 0.45),
    streaks: 42, pathW: 0.13, pathO: 0.26, scatter: 0.2,
  });

  // rock spur + the cantilevered residence on the left shore
  S.add(
    `<path d="M -20 ${n(hz + 6)} L ${n(w * 0.03)} ${n(hz - h * 0.045)} L ${n(w * 0.15)} ${n(hz - h * 0.072)} L ${n(w * 0.27)} ${n(hz - h * 0.028)} L ${n(w * 0.35)} ${n(hz + 6)} Z" fill="${P.ink}"/>`,
  );
  conifers(S, { baseY: hz - h * 0.055, count: 14, x0: 0.02, x1: 0.3, minH: h * 0.03, maxH: h * 0.07, color: P.ink, opacity: 0.9 });
  building(S, w * 0.115, hz - h * 0.145, w * 0.155, h * 0.075, {
    windows: 3, cantilever: 0.34, winColor: mix(P.amber, P.gold, 0.35),
    winO: 0.95, glowO: 1.15, reflectTo: h * 0.96,
    body: mix(P.ink, P.slate, 0.22),
  });
  atmosphere(S, { strength: 0.9, y0: 0.45, y1: 0.68, color: mix(P.haze, P.slate, 0.4) });
  grade(S, { sunX: 0.705, sunY: 0.42, warm: 0.13, teal: 0.32, vignette: 0.95, letterbox: 0.55 });
};

/* --- 02 ocean-infinity â€” high horizon, sun dead centre, terraced pool. ------ */
RECIPES["ocean-infinity"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.44;
  const sx = w * 0.52;
  skyGradient(S, {
    top: mix(P.slate, P.teal, 0.6),
    mid: mix(P.haze, P.slate, 0.45),
    horizon: mix(P.gold, P.ember, 0.45),
    horizonY: hz,
    glowColor: mix(P.gold, P.amber, 0.5),
    sunX: sx,
    sunY: hz - h * 0.02,
    glowR: 0.85,
    glowO: 0.58,
  });
  for (let i = 0; i < 8; i++) {
    glow(S, {
      x: S.r(0, 1) * w,
      y: S.r(0.04, 0.34) * h,
      rx: S.r(0.16, 0.48) * w,
      ry: S.r(0.01, 0.028) * h,
      color: i % 2 ? mix(P.ember, P.haze, 0.55) : mix(P.gold, P.haze, 0.6),
      opacity: S.r(0.09, 0.22),
    });
  }
  celestialBody(S, sx, hz - h * 0.03, h * 0.045, { warm: 0.9, intensity: 1.2 });
  ridgeline(S, { y: hz - h * 0.055, amp: h * 0.03, levels: 6, rough: 0.5, peak: h * 0.055, peakX: 0.14, peakW: 0.2, color: mix(P.haze, P.slate, 0.5), opacity: 0.45, bottom: hz + 4 });
  hazeBand(S, hz - h * 0.07, h * 0.09, mix(P.gold, P.haze, 0.55), 0.32);
  ridgeline(S, { y: hz - h * 0.024, amp: h * 0.018, levels: 6, rough: 0.52, peak: h * 0.032, peakX: 0.87, peakW: 0.15, color: mix(P.slate, P.teal, 0.45), opacity: 0.7, bottom: hz + 4 });
  hazeBand(S, hz - h * 0.03, h * 0.06, mix(P.gold, P.haze, 0.6), 0.36);

  waterPlane(S, { y: hz, h: h * 0.22, top: mix(P.haze, P.slate, 0.3), bottom: mix(P.slate, P.teal, 0.5), sunX: sx, sunColor: P.gold, streaks: 30, pathW: 0.09, pathO: 0.42, scatter: 0.14 });

  const edge = hz + h * 0.22;
  S.add(`<rect x="0" y="${n(edge)}" width="${w}" height="${n(h * 0.006)}" fill="${mix(P.bone, P.gold, 0.4)}" fill-opacity="0.5"/>`);
  S.add(`<rect x="0" y="${n(edge + h * 0.006)}" width="${w}" height="${n(h * 0.012)}" fill="${P.ink}" fill-opacity="0.55"/>`);

  waterPlane(S, { y: edge + h * 0.017, h: h * 0.3, top: mix(P.teal, P.ink, 0.4), bottom: mix(P.ink, P.teal, 0.25), sunX: sx, sunColor: mix(P.gold, P.amber, 0.45), streaks: 28, pathW: 0.2, pathO: 0.3, scatter: 0.3, glint: 0.8 });
  for (let i = 0; i < 9; i++) {
    const y = edge + h * (0.03 + 0.26 * Math.pow(S.rng(), 1.3));
    S.add(`<ellipse cx="${n(S.r(0.2, 0.85) * w)}" cy="${n(y)}" rx="${n(S.r(0.06, 0.2) * w)}" ry="${n(S.r(1.5, 5))}" fill="${mix(P.bone, P.haze, 0.5)}" fill-opacity="${n(S.r(0.05, 0.16))}"/>`);
  }

  const dy = edge + h * 0.318;
  gradRect(S, 0, dy, w, h - dy, [
    [0, mix(P.slate, P.bone, 0.28), 1],
    [0.35, mix(P.slate, P.bone, 0.16), 1],
    [1, mix(P.slate, P.ink, 0.55), 1],
  ]);
  for (let i = 0; i < 7; i++) {
    const y = dy + (h - dy) * ((i + 1) / 8);
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="1.6" fill="${P.ink}" fill-opacity="0.3"/>`);
  }
  S.add(`<rect x="0" y="${n(dy)}" width="${w}" height="${n(h * 0.012)}" fill="${mix(P.bone, P.haze, 0.4)}" fill-opacity="0.4"/>`);

  // single olive tree on the far terrace
  const tx = w * 0.155;
  S.add(`<path d="M ${n(tx - 4)} ${n(edge + 6)} L ${n(tx - 2)} ${n(h * 0.34)} L ${n(tx + 6)} ${n(h * 0.34)} L ${n(tx + 5)} ${n(edge + 6)} Z" fill="${P.ink}"/>`);
  for (let i = 0; i < 16; i++) {
    S.add(`<ellipse cx="${n(tx + S.rs(1) * w * 0.045)}" cy="${n(h * (0.245 + S.rs(1) * 0.055))}" rx="${n(S.r(0.012, 0.035) * w)}" ry="${n(S.r(0.012, 0.03) * h * 0.9)}" fill="${P.ink}" fill-opacity="${n(S.r(0.6, 0.95))}"/>`);
  }
  atmosphere(S, { strength: 0.8, y0: 0.36, y1: 0.55, color: mix(P.gold, P.haze, 0.5) });
  grade(S, { sunX: 0.52, sunY: 0.42, warm: 0.2, teal: 0.24, vignette: 0.86, letterbox: 0.42 });
};

/* --- 03 portal-valley â€” near-black wall, bright circular aperture. ---------- */
RECIPES["portal-valley"] = (S) => {
  const { w, h } = S;
  const cx = w * 0.5;
  const cy = h * 0.45;
  const r = h * 0.335;
  const cid = S.id("clip");
  S.def(`<clipPath id="${cid}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/></clipPath>`);

  S.add(`<g clip-path="url(#${cid})">`);
  const vhz = cy + r * 0.34;
  gradRect(S, cx - r, cy - r, r * 2, r * 2 + 4, [
    [0, mix(P.haze, P.bone, 0.4), 1],
    [0.34, mix(P.bone, P.gold, 0.4), 1],
    [0.66, mix(P.gold, P.bone, 0.35), 1],
    [1, mix(P.gold, P.amber, 0.5), 1],
  ]);
  glow(S, { x: cx - r * 0.5, y: cy - r * 0.75, rx: r * 2, ry: r * 2, color: mix(P.gold, "#ffffff", 0.4), opacity: 0.55 });
  ridgeline(S, { y: vhz - r * 0.5, amp: r * 0.1, levels: 6, rough: 0.56, peak: r * 0.2, peakX: 0.3, peakW: 0.2, color: mix(P.haze, P.bone, 0.5), opacity: 0.55, bottom: cy + r + 10 });
  hazeBand(S, vhz - r * 0.58, r * 0.44, mix(P.bone, P.gold, 0.45), 0.5);
  ridgeline(S, { y: vhz - r * 0.3, amp: r * 0.09, levels: 6, rough: 0.58, peak: r * 0.14, peakX: 0.75, peakW: 0.18, color: mix(P.haze, P.slate, 0.35), opacity: 0.78, bottom: cy + r + 10 });
  hazeBand(S, vhz - r * 0.35, r * 0.34, mix(P.bone, P.gold, 0.5), 0.42);
  ridgeline(S, { y: vhz - r * 0.12, amp: r * 0.05, levels: 7, rough: 0.6, color: mix(P.teal, P.slate, 0.55), opacity: 0.92, bottom: cy + r + 10 });
  conifers(S, { baseY: vhz - r * 0.05, count: 26, x0: 0.16, x1: 0.86, minH: r * 0.08, maxH: r * 0.2, color: mix(P.teal, P.ink, 0.4), opacity: 0.92 });
  // glacial lake
  waterPlane(S, { y: vhz, h: r * 0.42, top: mix(P.haze, P.bone, 0.35), bottom: mix(P.teal, P.slate, 0.5), sunX: cx - r * 0.3, sunColor: mix(P.bone, P.gold, 0.5), streaks: 22, pathW: 0.09, pathO: 0.3, scatter: 0.2 });
  conifers(S, { baseY: cy + r * 0.95, count: 16, x0: 0.12, x1: 0.9, minH: r * 0.16, maxH: r * 0.34, color: mix(P.ink, P.teal, 0.35), opacity: 0.95 });
  lightShafts(S, { x: cx - r * 0.8, y: cy - r * 1.15, count: 4, angle: 1.12, spread: 0.24, len: 1.4, color: mix(P.gold, P.bone, 0.5), opacity: 0.055 });
  motes(S, { x0: cx - r * 0.8, y0: cy - r * 0.7, x1: cx + r * 0.6, y1: cy + r * 0.8, count: 50, color: mix(P.gold, P.bone, 0.5) });
  S.add(`</g>`);

  // raw concrete wall with the circular cut
  const wall = mix(P.obsidian, P.slate, 0.42);
  S.add(
    `<path fill-rule="evenodd" fill="${wall}" d="M -10 -10 H ${n(w + 10)} V ${n(h + 10)} H -10 Z M ${n(cx - r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)} Z"/>`,
  );
  // every bit of wall texture is masked out of the aperture
  const mid = S.id("wallmask");
  S.def(
    `<mask id="${mid}"><rect width="${w}" height="${h}" fill="#ffffff"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#000000"/></mask>`,
  );
  S.add(`<g mask="url(#${mid})">`);
  const wid = linGrad(S, [
    [0, mix(P.slate, P.haze, 0.4), 0.3],
    [0.45, P.ink, 0.12],
    [1, P.ink, 0.6],
  ], 0, 0, 0.75, 1);
  S.add(`<rect width="${w}" height="${h}" fill="url(#${wid})"/>`);
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * w + S.rs(1) * 6;
    S.add(`<rect x="${n(x)}" y="0" width="${n(S.r(1.2, 3))}" height="${h}" fill="${P.ink}" fill-opacity="${n(S.r(0.06, 0.2))}"/>`);
  }
  for (let i = 0; i < 9; i++) {
    const y = (i / 9) * h + S.rs(1) * 10;
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="${n(S.r(1.5, 3.5))}" fill="${P.ink}" fill-opacity="${n(S.r(0.1, 0.26))}"/>`);
  }
  // form-tie holes and a faint bounce of valley light on the wall face
  for (let i = 0; i < 40; i++) {
    S.add(`<circle cx="${n((i % 10) / 10 * w + w * 0.05)}" cy="${n(Math.floor(i / 10) / 4 * h + h * 0.12)}" r="${n(S.r(3, 6))}" fill="${P.ink}" fill-opacity="0.4"/>`);
  }
  glow(S, { x: cx, y: cy, rx: r * 2.4, ry: r * 2.4, color: mix(P.gold, P.bone, 0.5), opacity: 0.16 });
  S.add(`</g>`);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r + 9)}" fill="none" stroke="${P.ink}" stroke-width="18" stroke-opacity="0.5"/>`);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r + 1)}" fill="none" stroke="${mix(P.bone, P.haze, 0.5)}" stroke-width="2.5" stroke-opacity="0.28"/>`);

  // light pooling on the shadowed floor + a single chaise
  glow(S, { x: cx - w * 0.05, y: h * 0.96, rx: w * 0.4, ry: h * 0.12, color: mix(P.gold, P.bone, 0.45), opacity: 0.28 });
  const bx = w * 0.24;
  const by = h * 0.9;
  S.add(`<path d="M ${n(bx)} ${n(by)} L ${n(bx + w * 0.21)} ${n(by)} L ${n(bx + w * 0.21)} ${n(by - h * 0.032)} L ${n(bx + w * 0.055)} ${n(by - h * 0.038)} L ${n(bx + w * 0.022)} ${n(by - h * 0.082)} L ${n(bx)} ${n(by - h * 0.082)} Z" fill="${mix(P.ink, P.slate, 0.22)}"/>`);
  S.add(`<path d="M ${n(bx + w * 0.055)} ${n(by - h * 0.038)} L ${n(bx + w * 0.21)} ${n(by - h * 0.032)}" stroke="${mix(P.bone, P.gold, 0.4)}" stroke-width="3" stroke-opacity="0.3" fill="none"/>`);
  S.add(`<path d="M ${n(bx)} ${n(by - h * 0.082)} L ${n(bx + w * 0.022)} ${n(by - h * 0.082)}" stroke="${mix(P.bone, P.gold, 0.4)}" stroke-width="3" stroke-opacity="0.22" fill="none"/>`);
  S.add(`<ellipse cx="${n(bx + w * 0.1)}" cy="${n(by + h * 0.006)}" rx="${n(w * 0.14)}" ry="${n(h * 0.011)}" fill="${P.ink}" fill-opacity="0.55"/>`);
  atmosphere(S, { strength: 0.7, y0: 0.3, y1: 0.6, color: mix(P.bone, P.haze, 0.5), count: 3 });
  grade(S, { sunX: 0.44, sunY: 0.4, warm: 0.1, teal: 0.3, vignette: 1.05, letterbox: 0.45 });
};

/* --- 04 cliff-villa â€” vertical, high sea horizon, warm glazing on the right. */
RECIPES["cliff-villa"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.3;
  skyGradient(S, {
    top: P.ink,
    mid: mix(P.slate, P.teal, 0.5),
    horizon: mix(P.haze, P.amber, 0.22),
    horizonY: hz,
    glowColor: mix(P.amber, P.haze, 0.62),
    sunX: w * 0.18,
    sunY: hz - h * 0.02,
    glowR: 0.9,
    glowO: 0.34,
  });
  for (let i = 0; i < 6; i++) {
    glow(S, { x: S.r(0, 1) * w, y: S.r(0.03, 0.25) * h, rx: S.r(0.2, 0.6) * w, ry: S.r(0.008, 0.02) * h, color: mix(P.slate, P.haze, 0.55), opacity: S.r(0.08, 0.18) });
  }
  waterPlane(S, {
    y: hz, h: h - hz,
    top: mix(P.teal, P.slate, 0.45),
    bottom: P.ink,
    sunX: w * 0.2,
    sunColor: mix(P.bone, P.amber, 0.5),
    streaks: 34, pathW: 0.28, pathO: 0.14, scatter: 0.4, glint: 0.7,
  });
  // distant coastal lights on the far shore
  for (let i = 0; i < 26; i++) {
    const x = S.r(0.02, 0.5) * w;
    const y = hz - S.r(0, 2);
    S.add(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(S.r(1.2, 2.8))}" fill="${mix(P.amber, P.gold, 0.4)}" fill-opacity="${n(S.r(0.35, 0.9))}"/>`);
    S.add(`<rect x="${n(x - 1)}" y="${n(y)}" width="2" height="${n(S.r(6, 26))}" fill="${P.amber}" fill-opacity="${n(S.r(0.1, 0.3))}"/>`);
  }
  glow(S, { x: w * 0.2, y: hz, rx: w * 0.5, ry: h * 0.05, color: mix(P.amber, P.haze, 0.4), opacity: 0.22 });

  // the cliff mass, fractal down the right
  const prof = fractalProfile(S.rng, 7, 0.6);
  let d = `M ${w + 20} ${h + 20} L ${w + 20} ${n(h * 0.02)}`;
  for (let i = 0; i < prof.length; i++) {
    const t = i / (prof.length - 1);
    const y = h * 0.05 + t * h * 1.0;
    const x = w * (0.62 - 0.28 * Math.pow(t, 0.75)) + prof[i] * w * 0.045;
    d += ` L ${n(x)} ${n(y)}`;
  }
  d += ` L -20 ${h + 20} Z`;
  S.add(`<path d="${d}" fill="${mix(P.obsidian, P.slate, 0.3)}"/>`);
  const cid = S.id("cl");
  S.def(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
  S.add(`<g clip-path="url(#${cid})">`);
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.slate, P.haze, 0.35), 0.5],
    [0.45, P.ink, 0.15],
    [1, P.ink, 0.72],
  ], [0.9, 0, 0, 1]);
  for (let i = 0; i < 40; i++) {
    const y = S.r(0.08, 1) * h;
    S.add(`<path d="M ${n(S.r(0.3, 1) * w)} ${n(y)} l ${n(S.r(-0.25, -0.02) * w)} ${n(S.r(0.02, 0.12) * h)}" stroke="${P.ink}" stroke-width="${n(S.r(1, 5))}" stroke-opacity="${n(S.r(0.1, 0.35))}" fill="none"/>`);
  }
  S.add(`</g>`);

  // terraced villa volumes stepping down the cliff
  for (let i = 0; i < 4; i++) {
    const bx = w * (0.55 + i * 0.085);
    const by = h * (0.36 + i * 0.108);
    building(S, bx, by, w * (0.34 - i * 0.05), h * (0.085 - i * 0.008), {
      windows: 2,
      cantilever: 0.28,
      winColor: mix(P.amber, P.gold, 0.3),
      winO: 0.92,
      glowO: 1.2,
      body: mix(P.ink, P.slate, 0.28),
      slab: mix(P.slate, P.haze, 0.42),
    });
  }
  // cypresses
  for (let i = 0; i < 7; i++) {
    const x = w * S.r(0.42, 0.95);
    const by = h * S.r(0.46, 0.9);
    const hgt = h * S.r(0.07, 0.14);
    S.add(`<ellipse cx="${n(x)}" cy="${n(by - hgt / 2)}" rx="${n(hgt * S.r(0.11, 0.17))}" ry="${n(hgt / 2)}" fill="${P.ink}" fill-opacity="0.95"/>`);
  }
  // foreground rock, bottom-left
  S.add(`<path d="M -20 ${h + 20} L -20 ${n(h * 0.74)} L ${n(w * 0.16)} ${n(h * 0.8)} L ${n(w * 0.34)} ${n(h * 0.92)} L ${n(w * 0.5)} ${n(h + 20)} Z" fill="${P.ink}"/>`);
  atmosphere(S, { strength: 0.85, y0: 0.28, y1: 0.6, color: mix(P.slate, P.haze, 0.5), count: 4 });
  grade(S, { sunX: 0.22, sunY: 0.26, warm: 0.1, teal: 0.34, vignette: 1, letterbox: 0.5 });
};

/* --- 05 forest-house â€” no horizon, pure aerial perspective in mist. --------- */
RECIPES["forest-house"] = (S) => {
  const { w, h } = S;
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.haze, P.slate, 0.42), 1],
    [0.3, mix(P.haze, P.slate, 0.62), 1],
    [0.62, mix(P.slate, P.teal, 0.5), 1],
    [1, mix(P.teal, P.ink, 0.55), 1],
  ]);
  glow(S, { x: w * 0.12, y: h * 0.1, rx: w * 1.05, ry: h * 0.5, color: mix(P.bone, P.haze, 0.45), opacity: 0.3 });
  const bands = [
    { y: 0.44, min: 0.1, max: 0.2, c: mix(P.haze, P.slate, 0.72), o: 0.5, count: 30 },
    { y: 0.56, min: 0.14, max: 0.27, c: mix(P.slate, P.teal, 0.42), o: 0.68, count: 24 },
    { y: 0.68, min: 0.18, max: 0.34, c: mix(P.teal, P.slate, 0.28), o: 0.82, count: 18 },
    { y: 0.84, min: 0.26, max: 0.46, c: mix(P.teal, P.ink, 0.42), o: 0.92, count: 13 },
    { y: 1.05, min: 0.4, max: 0.7, c: P.ink, o: 0.97, count: 9 },
  ];
  bands.forEach((b, i) => {
    conifers(S, {
      baseY: h * b.y, count: b.count,
      minH: h * b.min, maxH: h * b.max,
      color: b.c, opacity: b.o,
      x0: -0.05, x1: 1.05, wob: 0.3,
    });
    if (i < bands.length - 1) {
      hazeBand(S, h * (b.y - 0.1), h * 0.24, mix(P.haze, P.bone, 0.3 - i * 0.06), 0.34 - i * 0.05);
    }
  });
  lightShafts(S, { x: w * 0.02, y: h * 0.02, count: 5, angle: 0.95, spread: 0.4, len: 1.1, color: mix(P.bone, P.haze, 0.35), opacity: 0.07 });

  // blackened-timber house, one warm window
  const bx = w * 0.36;
  const by = h * 0.7;
  const bw = w * 0.33;
  const bh = h * 0.1;
  S.add(`<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="${n(bh)}" fill="${dim(P.ink, 1.35)}"/>`);
  S.add(`<rect x="${n(bx - bw * 0.06)}" y="${n(by - bh * 0.1)}" width="${n(bw * 1.12)}" height="${n(bh * 0.11)}" fill="${mix(P.ink, P.slate, 0.35)}"/>`);
  for (let i = 0; i < 16; i++) {
    S.add(`<rect x="${n(bx)}" y="${n(by + (i / 16) * bh)}" width="${n(bw)}" height="1.4" fill="${P.obsidian}" fill-opacity="0.6"/>`);
  }
  const wx = bx + bw * 0.6;
  const wy = by + bh * 0.28;
  const ww = bw * 0.3;
  const wh = bh * 0.4;
  S.add(`<rect x="${n(wx)}" y="${n(wy)}" width="${n(ww)}" height="${n(wh)}" fill="${mix(P.amber, P.gold, 0.35)}" fill-opacity="0.95"/>`);
  glow(S, { x: wx + ww / 2, y: wy + wh / 2, rx: ww * 4.5, ry: wh * 5.5, color: P.amber, opacity: 0.34 });
  gradRect(S, 0, h * 0.78, w, h * 0.22, [
    [0, mix(P.haze, P.slate, 0.6), 0],
    [0.5, mix(P.haze, P.slate, 0.6), 0.2],
    [1, mix(P.slate, P.teal, 0.5), 0.32],
  ]);
  atmosphere(S, { strength: 1.15, y0: 0.4, y1: 0.9, color: mix(P.haze, P.bone, 0.3), count: 6 });
  grade(S, { sunX: 0.16, sunY: 0.14, warm: 0.06, teal: 0.3, vignette: 0.95, letterbox: 0.46 });
};

/* --- 06 ocean-cliff â€” golden hour, warmest frame, sun low right. ------------ */
RECIPES["ocean-cliff"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.55;
  const sx = w * 0.76;
  skyGradient(S, {
    top: mix(P.slate, P.teal, 0.3),
    mid: mix(P.haze, P.slate, 0.4),
    horizon: mix(P.gold, P.amber, 0.55),
    horizonY: hz,
    glowColor: mix(P.gold, P.amber, 0.4),
    sunX: sx,
    sunY: hz - h * 0.05,
    glowR: 0.95,
    glowO: 0.6,
  });
  for (let i = 0; i < 6; i++) {
    glow(S, { x: S.r(0, 1) * w, y: S.r(0.06, 0.4) * h, rx: S.r(0.2, 0.5) * w, ry: S.r(0.008, 0.022) * h, color: mix(P.ember, P.haze, 0.45), opacity: S.r(0.08, 0.2) });
  }
  celestialBody(S, sx, hz - h * 0.048, h * 0.038, { warm: 1, intensity: 1.25 });
  waterPlane(S, {
    y: hz, h: h - hz,
    top: mix(P.teal, P.slate, 0.5),
    bottom: mix(P.teal, P.ink, 0.55),
    sunX: sx,
    sunColor: P.gold,
    streaks: 72, pathW: 0.26, pathO: 0.36, scatter: 0.34, hazeO: 0.32,
  });
  // swell banding so the sea is never a flat field
  for (let i = 0; i < 16; i++) {
    const y = hz + (h - hz) * Math.pow(S.rng(), 1.5);
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="${n(S.r(2, 9))}" fill="${i % 3 === 0 ? mix(P.gold, P.haze, 0.6) : P.ink}" fill-opacity="${n(S.r(0.05, 0.16))}"/>`);
  }
  // the cliff the residence sits on
  S.add(`<path d="M -20 ${h + 20} L -20 ${n(h * 0.71)} L ${n(w * 0.26)} ${n(h * 0.685)} L ${n(w * 0.58)} ${n(h * 0.73)} L ${n(w * 0.82)} ${n(h * 0.83)} L ${n(w + 20)} ${n(h * 0.88)} L ${n(w + 20)} ${h + 20} Z" fill="${mix(P.slate, P.ink, 0.55)}"/>`);
  for (let i = 0; i < 26; i++) {
    S.add(`<path d="M ${n(S.r(0, 1) * w)} ${n(h * S.r(0.72, 1))} l ${n(S.r(-0.16, -0.02) * w)} ${n(S.r(0.02, 0.09) * h)}" stroke="${P.ink}" stroke-width="${n(S.r(2, 8))}" stroke-opacity="${n(S.r(0.12, 0.35))}" fill="none"/>`);
  }
  // whitewashed sculptural volumes — shadow face left, sunlit face right
  const shade = mix(P.bone, P.slate, 0.62);
  const litc = mix(P.bone, P.gold, 0.45);
  const vol = (x0, x1, yTop, yBot, curve, alpha) => {
    const gid = linGrad(S, [
      [0, mix(shade, P.ink, 0.5), 1],
      [0.4, mix(shade, P.ink, 0.18), 1],
      [0.82, shade, 1],
      [1, litc, 1],
    ], 0, 0, 1, 0);
    S.add(
      `<path d="M ${n(x0)} ${n(yBot)} L ${n(x0)} ${n(yTop + curve)} Q ${n((x0 + x1) / 2)} ${n(yTop - curve)} ${n(x1)} ${n(yTop + curve * 0.6)} L ${n(x1)} ${n(yBot)} Z" fill="url(#${gid})" fill-opacity="${alpha}"/>`,
    );
    // sunlit top lip and a cast shadow thrown to the left
    S.add(
      `<path d="M ${n(x0)} ${n(yTop + curve)} Q ${n((x0 + x1) / 2)} ${n(yTop - curve)} ${n(x1)} ${n(yTop + curve * 0.6)}" fill="none" stroke="${mix(litc, "#ffffff", 0.35)}" stroke-width="${n(h * 0.004)}" stroke-opacity="0.7"/>`,
    );
    S.add(
      `<path d="M ${n(x0)} ${n(yBot)} L ${n(x0 - (x1 - x0) * 0.55)} ${n(yBot + h * 0.028)} L ${n(x0 - (x1 - x0) * 0.55)} ${n(yBot + h * 0.05)} L ${n(x0)} ${n(yBot + h * 0.02)} Z" fill="${P.ink}" fill-opacity="0.4"/>`,
    );
  };
  vol(w * 0.05, w * 0.44, h * 0.6, h * 0.79, h * 0.018, 1);
  vol(w * 0.4, w * 0.72, h * 0.665, h * 0.82, h * 0.012, 0.96);
  vol(w * 0.66, w * 0.98, h * 0.72, h * 0.86, h * 0.008, 0.9);
  // deep-set openings
  [[0.1, 0.66, 0.09, 0.1], [0.24, 0.69, 0.055, 0.07], [0.47, 0.72, 0.07, 0.075]].forEach(([fx, fy, fw2, fh2]) => {
    S.add(`<path d="M ${n(w * fx)} ${n(h * (fy + fh2))} L ${n(w * fx)} ${n(h * fy + w * fw2 * 0.5)} A ${n(w * fw2 * 0.5)} ${n(w * fw2 * 0.5)} 0 0 1 ${n(w * (fx + fw2))} ${n(h * fy + w * fw2 * 0.5)} L ${n(w * (fx + fw2))} ${n(h * (fy + fh2))} Z" fill="${P.ink}" fill-opacity="0.92"/>`);
    S.add(`<rect x="${n(w * (fx + fw2) - 3)}" y="${n(h * fy + w * fw2 * 0.4)}" width="3" height="${n(h * fh2 * 0.8)}" fill="${P.amber}" fill-opacity="0.35"/>`);
  });
  // curved parapet running across the terrace
  S.add(`<path d="M -20 ${n(h * 0.9)} Q ${n(w * 0.34)} ${n(h * 0.845)} ${n(w * 0.78)} ${n(h * 0.895)} L ${n(w * 0.78)} ${n(h * 0.925)} Q ${n(w * 0.34)} ${n(h * 0.875)} -20 ${n(h * 0.93)} Z" fill="${mix(shade, P.ink, 0.3)}"/>`);
  S.add(`<path d="M -20 ${n(h * 0.9)} Q ${n(w * 0.34)} ${n(h * 0.845)} ${n(w * 0.78)} ${n(h * 0.895)}" fill="none" stroke="${litc}" stroke-width="${n(h * 0.0035)}" stroke-opacity="0.55"/>`);
  // long raking shadows across the terrace floor
  for (let i = 0; i < 5; i++) {
    const y = h * S.r(0.93, 1.0);
    S.add(`<path d="M ${n(w * S.r(0.4, 0.9))} ${n(y)} L ${n(w * S.r(-0.05, 0.2))} ${n(y + h * S.r(0.01, 0.04))} L ${n(w * S.r(-0.05, 0.2))} ${n(y + h * S.r(0.05, 0.09))} L ${n(w * S.r(0.4, 0.9))} ${n(y + h * 0.025)} Z" fill="${P.ink}" fill-opacity="${n(S.r(0.18, 0.4))}"/>`);
  }
  glow(S, { x: w * 0.62, y: h * 0.7, rx: w * 0.55, ry: h * 0.16, color: P.gold, opacity: 0.2 });
  atmosphere(S, { strength: 0.85, y0: 0.45, y1: 0.62, color: mix(P.gold, P.haze, 0.55), count: 4 });
  grade(S, { sunX: 0.76, sunY: 0.5, warm: 0.2, teal: 0.24, vignette: 0.88, letterbox: 0.42 });
};

/* --- 07 desert-dunes â€” very high horizon, smooth ridges, light from left. --- */
RECIPES["desert-dunes"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.34;
  const sx = w * 0.2;
  skyGradient(S, {
    top: mix(P.slate, P.teal, 0.42),
    mid: mix(P.haze, P.ember, 0.35),
    horizon: mix(P.gold, P.ember, 0.5),
    horizonY: hz,
    glowColor: mix(P.ember, P.gold, 0.5),
    sunX: sx,
    sunY: hz - h * 0.03,
    glowR: 0.8,
    glowO: 0.55,
  });
  celestialBody(S, sx, hz - h * 0.022, h * 0.03, { warm: 0.95, intensity: 1.05 });
  const duneLayers = [
    { y: hz + h * 0.02, amp: h * 0.028, c: mix(P.haze, P.ember, 0.45), o: 0.6 },
    { y: hz + h * 0.1, amp: h * 0.045, c: mix(P.ember, P.slate, 0.45), o: 0.8 },
    { y: hz + h * 0.24, amp: h * 0.06, c: mix(P.ember, P.ink, 0.5), o: 0.92 },
    { y: hz + h * 0.46, amp: h * 0.08, c: mix(P.ink, P.ember, 0.22), o: 1 },
  ];
  duneLayers.forEach((L, i) => {
    const { d, pts } = ridgePath(S, { y: L.y, amp: L.amp, levels: 5, rough: 0.42, peak: h * (0.05 - i * 0.008), peakX: 0.2 + i * 0.22, peakW: 0.3 });
    S.add(`<path d="${d}" fill="${L.c}" fill-opacity="${L.o}"/>`);
    // lit crest on the sun side
    let cd = `M ${n(pts[0][0])} ${n(pts[0][1])}`;
    for (let k = 1; k < pts.length; k++) cd += ` L ${n(pts[k][0])} ${n(pts[k][1])}`;
    S.add(`<path d="${cd}" fill="none" stroke="${mix(P.gold, P.bone, 0.35)}" stroke-width="${n(2 + i * 1.4)}" stroke-opacity="${n(0.3 - i * 0.05)}"/>`);
    hazeBand(S, L.y - h * 0.03, h * 0.1, mix(P.gold, P.ember, 0.5), 0.2 - i * 0.04);
  });
  // monolithic pavilion between the dunes
  const px = w * 0.38;
  const py = hz + h * 0.22;
  const pw = w * 0.38;
  const ph = h * 0.09;
  S.add(`<rect x="${n(px)}" y="${n(py)}" width="${n(pw)}" height="${n(ph)}" fill="${mix(P.ink, P.ember, 0.14)}"/>`);
  S.add(`<rect x="${n(px - pw * 0.05)}" y="${n(py)}" width="${n(pw * 1.1)}" height="${n(ph * 0.09)}" fill="${mix(P.gold, P.bone, 0.4)}" fill-opacity="0.5"/>`);
  S.add(`<rect x="${n(px)}" y="${n(py + ph * 0.42)}" width="${n(pw * 0.16)}" height="${n(ph * 0.34)}" fill="${P.amber}" fill-opacity="0.75"/>`);
  glow(S, { x: px + pw * 0.08, y: py + ph * 0.6, rx: pw * 0.5, ry: ph * 2, color: P.amber, opacity: 0.28 });
  // reflecting pool at its base
  const wy = py + ph;
  gradRect(S, px + pw * 0.05, wy, pw * 0.86, h * 0.05, [
    [0, mix(P.gold, P.ember, 0.4), 0.3],
    [0.35, mix(P.slate, P.ink, 0.4), 0.9],
    [1, P.ink, 0.95],
  ]);
  for (let i = 0; i < 12; i++) {
    S.add(`<rect x="${n(px + pw * S.r(0.06, 0.8))}" y="${n(wy + h * S.r(0.002, 0.045))}" width="${n(pw * S.r(0.03, 0.18))}" height="${n(S.r(1, 3))}" fill="${P.gold}" fill-opacity="${n(S.r(0.1, 0.4))}"/>`);
  }
  // airborne dust
  atmosphere(S, { strength: 1.2, y0: 0.36, y1: 0.75, color: mix(P.ember, P.gold, 0.4), count: 6 });
  lightShafts(S, { x: -w * 0.05, y: hz - h * 0.02, count: 4, angle: 0.25, spread: 0.28, len: 1, color: mix(P.gold, P.ember, 0.4), opacity: 0.08 });
  grade(S, { sunX: 0.2, sunY: 0.32, warm: 0.18, teal: 0.28, vignette: 0.95, letterbox: 0.5 });
};

/* --- 08 snow-peaks â€” jagged, high contrast, cold, one warm chalet. --------- */
RECIPES["snow-peaks"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.52;
  skyGradient(S, {
    top: mix(P.ink, P.slate, 0.35),
    mid: mix(P.slate, P.haze, 0.45),
    horizon: mix(P.haze, P.bone, 0.4),
    horizonY: hz,
    glowColor: mix(P.bone, P.haze, 0.5),
    sunX: w * 0.28,
    sunY: h * 0.16,
    glowR: 0.7,
    glowO: 0.3,
  });
  const peaks = [
    { y: h * 0.3, amp: h * 0.05, lv: 7, rg: 0.72, pk: h * 0.11, px: 0.28, c: mix(P.slate, P.haze, 0.55), snow: mix(P.bone, P.haze, 0.15), o: 0.55, off: 9 },
    { y: h * 0.36, amp: h * 0.055, lv: 7, rg: 0.74, pk: h * 0.1, px: 0.68, c: mix(P.slate, P.teal, 0.42), snow: mix(P.bone, P.haze, 0.3), o: 0.78, off: 12 },
    { y: h * 0.44, amp: h * 0.05, lv: 8, rg: 0.75, pk: h * 0.07, px: 0.44, c: mix(P.teal, P.ink, 0.3), snow: mix(P.bone, P.slate, 0.35), o: 0.9, off: 14 },
    { y: h * 0.51, amp: h * 0.035, lv: 8, rg: 0.72, pk: 0, px: 0.5, c: P.obsidian, snow: mix(P.bone, P.slate, 0.45), o: 1, off: 16 },
  ];
  peaks.forEach((L, i) => {
    const base = { y: L.y, amp: L.amp, levels: L.lv, rough: L.rg, peak: L.pk, peakX: L.px, peakW: 0.16, bottom: hz + h * 0.1 };
    // draw the lit snow copy first, then the rock offset down-right â€” the
    // sliver left over along the crest reads as sun on the snow face.
    const lite = ridgePath(S, base);
    S.add(`<path d="${lite.d}" fill="${L.snow}" fill-opacity="${n(L.o * 0.95)}"/>`);
    const rock = ridgePath(S, Object.assign({}, base, { dx: L.off, dy: L.off * 1.5 }));
    S.add(`<path d="${rock.d}" fill="${L.c}" fill-opacity="${L.o}"/>`);
    hazeBand(S, L.y + L.amp * 0.6, h * 0.09, mix(P.haze, P.bone, 0.35 - i * 0.07), 0.3 - i * 0.06);
  });
  // snow field
  gradRect(S, 0, hz + h * 0.02, w, h - hz, [
    [0, mix(P.haze, P.bone, 0.32), 1],
    [0.3, mix(P.slate, P.haze, 0.6), 1],
    [1, mix(P.slate, P.ink, 0.55), 1],
  ]);
  for (let i = 0; i < 22; i++) {
    const y = hz + h * (0.03 + 0.45 * Math.pow(S.rng(), 1.4));
    S.add(`<ellipse cx="${n(S.r(0, 1) * w)}" cy="${n(y)}" rx="${n(S.r(0.1, 0.4) * w)}" ry="${n(S.r(2, 9))}" fill="${i % 2 ? P.bone : P.ink}" fill-opacity="${n(S.r(0.04, 0.13))}"/>`);
  }
  // chalet on the ridge
  const bx = w * 0.52;
  const by = hz + h * 0.14;
  building(S, bx, by, w * 0.26, h * 0.07, {
    windows: 2, cantilever: 0.3,
    winColor: mix(P.amber, P.gold, 0.25), winO: 0.95, glowO: 1.4,
    body: mix(P.ink, P.slate, 0.2), slab: mix(P.bone, P.slate, 0.5),
  });
  S.add(`<ellipse cx="${n(bx + w * 0.1)}" cy="${n(by + h * 0.075)}" rx="${n(w * 0.2)}" ry="${n(h * 0.012)}" fill="${P.ink}" fill-opacity="0.4"/>`);
  // spindrift
  for (let i = 0; i < 8; i++) {
    const x = S.r(-0.1, 1) * w;
    const y = S.r(0.28, 0.62) * h;
    glow(S, { x, y, rx: S.r(0.15, 0.42) * w, ry: S.r(0.004, 0.014) * h, color: P.bone, opacity: S.r(0.07, 0.18) });
  }
  atmosphere(S, { strength: 0.9, y0: 0.42, y1: 0.7, color: mix(P.haze, P.bone, 0.4), count: 4 });
  grade(S, { sunX: 0.3, sunY: 0.2, warm: 0.07, teal: 0.34, vignette: 1, letterbox: 0.5 });
};

/* --- 09 spa-water â€” interior, oculus shaft onto black water. --------------- */
RECIPES["spa-water"] = (S) => {
  const { w, h } = S;
  const wy = h * 0.56;
  const ox = w * 0.52;
  const oy = h * 0.15;
  const orr = w * 0.062;
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.obsidian, P.slate, 0.2), 1],
    [0.45, mix(P.obsidian, P.slate, 0.12), 1],
    [1, P.ink, 1],
  ]);
  // vault
  S.add(`<path d="M ${n(w * 0.06)} ${n(h * 0.72)} L ${n(w * 0.06)} ${n(h * 0.34)} Q ${n(w * 0.5)} ${n(-h * 0.1)} ${n(w * 0.94)} ${n(h * 0.34)} L ${n(w * 0.94)} ${n(h * 0.72)} Z" fill="${mix(P.slate, P.ink, 0.62)}"/>`);
  const vid = radGrad(S, [
    [0, mix(P.haze, P.slate, 0.55), 0.4],
    [0.4, mix(P.slate, P.ink, 0.5), 0.22],
    [1, P.ink, 0.75],
  ], 0.52, 0.12, 0.85);
  S.add(`<rect width="${w}" height="${n(wy)}" fill="url(#${vid})"/>`);
  // stone courses
  for (let i = 0; i < 14; i++) {
    const y = h * (0.06 + i * 0.038);
    S.add(`<path d="M ${n(w * 0.06)} ${n(y)} Q ${n(w * 0.5)} ${n(y - h * 0.09)} ${n(w * 0.94)} ${n(y)}" fill="none" stroke="${P.ink}" stroke-width="${n(S.r(1.5, 3.5))}" stroke-opacity="${n(S.r(0.12, 0.3))}"/>`);
  }
  // oculus + shaft
  glow(S, { x: ox, y: oy, rx: orr * 9, ry: orr * 9, color: mix(P.gold, P.amber, 0.4), opacity: 0.34 });
  S.add(`<circle cx="${n(ox)}" cy="${n(oy)}" r="${n(orr)}" fill="${mix(P.gold, "#ffffff", 0.3)}"/>`);
  S.add(`<circle cx="${n(ox)}" cy="${n(oy)}" r="${n(orr * 1.25)}" fill="none" stroke="${P.ink}" stroke-width="${n(orr * 0.32)}" stroke-opacity="0.7"/>`);
  const shid = linGrad(S, [
    [0, mix(P.gold, P.bone, 0.35), 0.3],
    [0.55, P.gold, 0.16],
    [1, P.gold, 0.06],
  ]);
  S.add(`<path d="M ${n(ox - orr * 0.9)} ${n(oy)} L ${n(ox + orr * 0.9)} ${n(oy)} L ${n(ox + orr * 3.4)} ${n(wy + h * 0.02)} L ${n(ox - orr * 3.4)} ${n(wy + h * 0.02)} Z" fill="url(#${shid})"/>`);
  motes(S, { x0: ox - orr * 3, y0: oy + orr, x1: ox + orr * 3, y1: wy, count: 90, color: mix(P.gold, P.bone, 0.4) });
  // black basalt water
  waterPlane(S, {
    y: wy, h: h - wy,
    top: mix(P.teal, P.ink, 0.5),
    bottom: P.ink,
    sunX: ox,
    sunColor: mix(P.gold, P.amber, 0.5),
    streaks: 30, pathW: 0.24, pathO: 0.3, scatter: 0.3,
  });
  glow(S, { x: ox, y: wy + h * 0.03, rx: orr * 4.6, ry: orr * 1.5, color: mix(P.gold, P.bone, 0.3), opacity: 0.55 });
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    S.add(`<ellipse cx="${n(ox + S.rs(1) * w * 0.02)}" cy="${n(wy + h * 0.03 + t * h * 0.4)}" rx="${n(orr * (1.4 + t * 9))}" ry="${n(orr * (0.3 + t * 1.6))}" fill="none" stroke="${mix(P.gold, P.bone, 0.4)}" stroke-width="${n(S.r(1, 3.4))}" stroke-opacity="${n(0.3 * (1 - t) + 0.03)}"/>`);
  }
  // steam
  for (let i = 0; i < 7; i++) {
    glow(S, { x: S.r(0.15, 0.9) * w, y: wy - h * S.r(0.0, 0.14), rx: S.r(0.1, 0.3) * w, ry: S.r(0.02, 0.06) * h, color: mix(P.bone, P.haze, 0.5), opacity: S.r(0.05, 0.13) });
  }
  // wet stone reflections at the waterline
  for (let i = 0; i < 16; i++) {
    const x = S.r(0.06, 0.94) * w;
    S.add(`<rect x="${n(x)}" y="${n(wy - h * S.r(0.02, 0.1))}" width="${n(S.r(1.5, 5))}" height="${n(h * S.r(0.02, 0.1))}" fill="${mix(P.bone, P.haze, 0.5)}" fill-opacity="${n(S.r(0.04, 0.14))}"/>`);
  }
  grade(S, { sunX: 0.52, sunY: 0.4, warm: 0.14, teal: 0.28, vignette: 1.1, letterbox: 0.5, lift: 0.012 });
};

/* --- 10 yacht-sea â€” minimal horizon at the very top, molten sun path. ------ */
RECIPES["yacht-sea"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.22;
  const sx = w * 0.5;
  skyGradient(S, {
    top: mix(P.slate, P.teal, 0.55),
    mid: mix(P.haze, P.slate, 0.4),
    horizon: mix(P.gold, P.ember, 0.5),
    horizonY: hz,
    glowColor: mix(P.gold, P.amber, 0.45),
    sunX: sx,
    sunY: hz,
    glowR: 0.9,
    glowO: 0.6,
  });
  glow(S, { x: sx, y: hz, rx: w * 0.35, ry: h * 0.06, color: mix(P.gold, "#ffffff", 0.25), opacity: 0.6 });
  waterPlane(S, {
    y: hz, h: h - hz,
    top: mix(P.teal, P.slate, 0.55),
    bottom: mix(P.teal, P.ink, 0.5),
    sunX: sx,
    sunColor: P.gold,
    streaks: 150, pathW: 0.3, pathO: 0.34, scatter: 0.22, glint: 1.15,
  });
  // yacht silhouette on the sun path
  const yx = w * 0.46;
  const yy = h * 0.46;
  const s = h * 0.075;
  S.add(`<path d="M ${n(yx - s * 1.5)} ${n(yy)} L ${n(yx + s * 1.7)} ${n(yy)} L ${n(yx + s * 1.1)} ${n(yy + s * 0.3)} L ${n(yx - s * 1.1)} ${n(yy + s * 0.26)} Z" fill="${P.ink}"/>`);
  S.add(`<path d="M ${n(yx - s * 0.1)} ${n(yy - s * 2.6)} L ${n(yx + s * 1.15)} ${n(yy - s * 0.08)} L ${n(yx + s * 0.02)} ${n(yy - s * 0.08)} Z" fill="${P.ink}" fill-opacity="0.95"/>`);
  S.add(`<path d="M ${n(yx - s * 0.2)} ${n(yy - s * 2.5)} L ${n(yx - s * 0.32)} ${n(yy - s * 0.08)} L ${n(yx - s * 1.05)} ${n(yy - s * 0.08)} Z" fill="${P.ink}" fill-opacity="0.92"/>`);
  S.add(`<rect x="${n(yx - s * 0.16)}" y="${n(yy - s * 2.7)}" width="${n(s * 0.07)}" height="${n(s * 2.7)}" fill="${P.ink}"/>`);
  S.add(`<circle cx="${n(yx + s * 0.9)}" cy="${n(yy - s * 0.14)}" r="${n(s * 0.05)}" fill="${P.amber}" fill-opacity="0.85"/>`);
  // wake
  for (let i = 0; i < 3; i++) {
    const o = 0.2 - i * 0.05;
    S.add(`<path d="M ${n(yx - s * 1.2)} ${n(yy + s * 0.28)} L ${n(yx - s * (6 + i * 3))} ${n(yy + s * (2.4 + i * 1.4))} L ${n(yx - s * (6 + i * 3))} ${n(yy + s * (3.1 + i * 1.4))} L ${n(yx - s * 0.9)} ${n(yy + s * 0.42)} Z" fill="${mix(P.bone, P.gold, 0.35)}" fill-opacity="${n(o)}"/>`);
    S.add(`<path d="M ${n(yx + s * 1.4)} ${n(yy + s * 0.28)} L ${n(yx + s * (6 + i * 3))} ${n(yy + s * (2.4 + i * 1.4))} L ${n(yx + s * (6 + i * 3))} ${n(yy + s * (3.1 + i * 1.4))} L ${n(yx + s * 1.2)} ${n(yy + s * 0.42)} Z" fill="${mix(P.bone, P.gold, 0.35)}" fill-opacity="${n(o * 0.8)}"/>`);
  }
  atmosphere(S, { strength: 0.6, y0: 0.15, y1: 0.3, color: mix(P.gold, P.haze, 0.55), count: 3 });
  grade(S, { sunX: 0.5, sunY: 0.24, warm: 0.16, teal: 0.3, vignette: 1, letterbox: 0.5 });
};

/* --- 11 dining-glow â€” near-black room, concentrated warm pools. ------------ */
RECIPES["dining-glow"] = (S) => {
  const { w, h } = S;
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.obsidian, P.slate, 0.18), 1],
    [0.55, P.obsidian, 1],
    [1, P.ink, 1],
  ]);
  // raw stone wall courses
  for (let i = 0; i < 11; i++) {
    const y = h * (0.04 + i * 0.055);
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="${n(h * 0.004)}" fill="${P.ink}" fill-opacity="${n(S.r(0.25, 0.6))}"/>`);
    S.add(`<rect x="0" y="${n(y + h * 0.004)}" width="${w}" height="${n(h * 0.006)}" fill="${mix(P.slate, P.haze, 0.25)}" fill-opacity="${n(S.r(0.04, 0.12))}"/>`);
  }
  // pendant
  const lx = w * 0.5;
  const ly = h * 0.27;
  S.add(`<rect x="${n(lx - 1.5)}" y="0" width="3" height="${n(ly)}" fill="${P.ink}"/>`);
  glow(S, { x: lx, y: ly, rx: w * 0.36, ry: h * 0.32, color: mix(P.amber, P.gold, 0.35), opacity: 0.42 });
  S.add(`<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="${n(w * 0.028)}" ry="${n(h * 0.016)}" fill="${mix(P.gold, "#ffffff", 0.3)}"/>`);
  S.add(`<path d="M ${n(lx - w * 0.05)} ${n(ly - h * 0.012)} L ${n(lx + w * 0.05)} ${n(ly - h * 0.012)} L ${n(lx + w * 0.028)} ${n(ly - h * 0.045)} L ${n(lx - w * 0.028)} ${n(ly - h * 0.045)} Z" fill="${mix(P.ink, P.ember, 0.25)}"/>`);
  // table in perspective
  const t0 = h * 0.6;
  const t1 = h * 0.9;
  const tid = linGrad(S, [
    [0, mix(P.ember, P.ink, 0.62), 1],
    [0.45, mix(P.ember, P.ink, 0.76), 1],
    [1, mix(P.ink, P.ember, 0.1), 1],
  ]);
  S.add(`<path d="M ${n(w * 0.23)} ${n(t0)} L ${n(w * 0.77)} ${n(t0)} L ${n(w * 0.99)} ${n(t1)} L ${n(w * 0.01)} ${n(t1)} Z" fill="url(#${tid})"/>`);
  S.add(`<path d="M ${n(w * 0.23)} ${n(t0)} L ${n(w * 0.77)} ${n(t0)} L ${n(w * 0.775)} ${n(t0 + h * 0.008)} L ${n(w * 0.225)} ${n(t0 + h * 0.008)} Z" fill="${mix(P.amber, P.ember, 0.5)}" fill-opacity="0.45"/>`);
  glow(S, { x: w * 0.5, y: t0 + h * 0.06, rx: w * 0.3, ry: h * 0.08, color: P.amber, opacity: 0.3 });
  glow(S, { x: w * 0.32, y: t1 - h * 0.05, rx: w * 0.2, ry: h * 0.05, color: P.ember, opacity: 0.2 });
  // candles
  [[0.4, 0.585], [0.6, 0.592]].forEach(([fx, fy]) => {
    const x = w * fx;
    const y = h * fy;
    S.add(`<rect x="${n(x - w * 0.006)}" y="${n(y - h * 0.05)}" width="${n(w * 0.012)}" height="${n(h * 0.05)}" fill="${mix(P.bone, P.ink, 0.55)}" fill-opacity="0.7"/>`);
    glow(S, { x, y: y - h * 0.06, rx: w * 0.09, ry: h * 0.075, color: P.gold, opacity: 0.55 });
    S.add(`<ellipse cx="${n(x)}" cy="${n(y - h * 0.058)}" rx="${n(w * 0.004)}" ry="${n(h * 0.009)}" fill="${mix(P.gold, "#ffffff", 0.5)}"/>`);
  });
  // plates + glasses
  [[0.33, 0.7], [0.67, 0.71]].forEach(([fx, fy]) => {
    S.add(`<ellipse cx="${n(w * fx)}" cy="${n(h * fy)}" rx="${n(w * 0.075)}" ry="${n(h * 0.022)}" fill="${mix(P.bone, P.ember, 0.4)}" fill-opacity="0.4"/>`);
    S.add(`<ellipse cx="${n(w * fx)}" cy="${n(h * fy)}" rx="${n(w * 0.05)}" ry="${n(h * 0.014)}" fill="${mix(P.ink, P.ember, 0.3)}" fill-opacity="0.5"/>`);
    S.add(`<path d="M ${n(w * (fx + 0.1))} ${n(h * (fy - 0.012))} l ${n(w * 0.016)} 0 l ${n(-w * 0.004)} ${n(-h * 0.045)} l ${n(-w * 0.008)} 0 Z" fill="${mix(P.bone, P.gold, 0.5)}" fill-opacity="0.28"/>`);
  });
  // chair silhouettes
  [[0.13, 0.62], [0.87, 0.62]].forEach(([fx, fy]) => {
    S.add(`<rect x="${n(w * fx - w * 0.07)}" y="${n(h * fy)}" width="${n(w * 0.14)}" height="${n(h * 0.34)}" rx="${n(w * 0.02)}" fill="${P.ink}" fill-opacity="0.92"/>`);
  });
  atmosphere(S, { strength: 0.55, y0: 0.3, y1: 0.6, color: mix(P.ember, P.haze, 0.5), count: 3 });
  grade(S, { sunX: 0.5, sunY: 0.42, warm: 0.16, teal: 0.24, vignette: 1.12, letterbox: 0.55, lift: 0.014 });
};

/* --- 12 cultural-arch â€” receding arches to a bright warm vanishing point. -- */
RECIPES["cultural-arch"] = (S) => {
  const { w, h } = S;
  const vx = w * 0.58;
  const vy = h * 0.5;
  S.add(`<rect width="${w}" height="${h}" fill="${P.ink}"/>`);
  const N = 9;
  for (let i = N - 1; i >= 0; i--) {
    const s = Math.pow(0.78, N - 1 - i);
    const aw = w * 0.86 * s;
    const ah = h * 0.92 * s;
    const x0 = vx - aw / 2;
    const y1 = vy + ah * 0.5;
    const y0 = vy - ah * 0.5;
    const rr = aw / 2;
    const t = (N - 1 - i) / (N - 1);
    const col = mix(mix(P.ink, P.slate, 0.35), mix(P.gold, P.ember, 0.45), Math.pow(t, 1.5));
    const d = `M ${n(x0)} ${n(y1)} L ${n(x0)} ${n(y0 + rr)} A ${n(rr)} ${n(rr * 1.05)} 0 0 1 ${n(x0 + aw)} ${n(y0 + rr)} L ${n(x0 + aw)} ${n(y1)} Z`;
    S.add(`<path d="${d}" fill="${col}"/>`);
    // the lit inner edge of each arch ring
    S.add(`<path d="${d}" fill="none" stroke="${mix(P.gold, P.bone, 0.5)}" stroke-width="${n(2 + t * 5)}" stroke-opacity="${n(0.06 + t * 0.22)}"/>`);
  }
  glow(S, { x: vx, y: vy + h * 0.06, rx: w * 0.3, ry: h * 0.3, color: mix(P.gold, P.amber, 0.4), opacity: 0.5 });
  // weathered limestone texture on the near ring
  for (let i = 0; i < 90; i++) {
    const x = S.r(0, 1) * w;
    const y = S.r(0, 1) * h;
    const dx = (x - vx) / w;
    const dy = (y - vy) / h;
    if (Math.abs(dx) < 0.22 && Math.abs(dy) < 0.28) continue;
    S.add(`<rect x="${n(x)}" y="${n(y)}" width="${n(S.r(0.02, 0.11) * w)}" height="${n(S.r(1.5, 5))}" fill="${i % 3 ? P.ink : mix(P.bone, P.slate, 0.6)}" fill-opacity="${n(S.r(0.05, 0.18))}"/>`);
  }
  // floor, catching the far light
  gradRect(S, 0, h * 0.74, w, h * 0.26, [
    [0, mix(P.slate, P.ember, 0.35), 0.55],
    [1, P.ink, 0.9],
  ]);
  glow(S, { x: vx - w * 0.03, y: h * 0.86, rx: w * 0.34, ry: h * 0.1, color: mix(P.gold, P.ember, 0.45), opacity: 0.3 });
  lightShafts(S, { x: -w * 0.05, y: -h * 0.05, count: 5, angle: 0.72, spread: 0.35, len: 1.6, color: mix(P.gold, P.bone, 0.4), opacity: 0.09 });
  motes(S, { x0: w * 0.05, y0: h * 0.1, x1: w * 0.75, y1: h * 0.85, count: 80, color: mix(P.gold, P.bone, 0.4) });
  // dark columns framing the sides
  [0.02, 0.93].forEach((fx) => {
    S.add(`<rect x="${n(w * fx)}" y="0" width="${n(w * 0.06)}" height="${h}" fill="${P.ink}" fill-opacity="0.85"/>`);
  });
  grade(S, { sunX: 0.58, sunY: 0.52, warm: 0.16, teal: 0.3, vignette: 1.05, letterbox: 0.5 });
};

/* --- 13 concrete-mono â€” no sky. Two planes, one hard shadow line. --------- */
RECIPES["concrete-mono"] = (S) => {
  const { w, h } = S;
  const yL = h * 0.72;
  const yR = h * 0.3;
  // lit upper plane, raking light from the right
  const upId = linGrad(S, [
    [0, mix(P.slate, P.haze, 0.42), 1],
    [0.5, mix(P.haze, P.bone, 0.32), 1],
    [1, mix(P.bone, P.gold, 0.3), 1],
  ], 0, 0, 1, 0.15);
  S.add(`<path d="M -10 -10 L ${n(w + 10)} -10 L ${n(w + 10)} ${n(yR)} L -10 ${n(yL)} Z" fill="url(#${upId})"/>`);
  // shadowed lower plane
  const loId = linGrad(S, [
    [0, mix(P.slate, P.ink, 0.55), 1],
    [0.6, mix(P.slate, P.ink, 0.72), 1],
    [1, P.ink, 1],
  ], 0, 0, 0.4, 1);
  S.add(`<path d="M -10 ${n(yL)} L ${n(w + 10)} ${n(yR)} L ${n(w + 10)} ${n(h + 10)} L -10 ${n(h + 10)} Z" fill="url(#${loId})"/>`);
  // the shadow line itself â€” a hard dark edge with a hair of bounce above
  S.add(`<path d="M -10 ${n(yL)} L ${n(w + 10)} ${n(yR)} L ${n(w + 10)} ${n(yR + h * 0.028)} L -10 ${n(yL + h * 0.028)} Z" fill="${P.ink}" fill-opacity="0.78"/>`);
  S.add(`<path d="M -10 ${n(yL - 3)} L ${n(w + 10)} ${n(yR - 3)}" stroke="${mix(P.bone, P.gold, 0.4)}" stroke-width="2.5" stroke-opacity="0.35" fill="none"/>`);
  // board-form lines, parallel to the planes
  const slope = (yR - yL) / w;
  for (let i = -8; i < 34; i++) {
    const off = i * h * 0.032 + S.rs(1) * 4;
    const o = S.r(0.06, 0.22);
    S.add(`<path d="M -10 ${n(yL + off)} L ${n(w + 10)} ${n(yL + off + slope * w)}" stroke="${P.ink}" stroke-width="${n(S.r(1.5, 4))}" stroke-opacity="${n(o)}" fill="none"/>`);
    S.add(`<path d="M -10 ${n(yL + off + 3)} L ${n(w + 10)} ${n(yL + off + 3 + slope * w)}" stroke="${P.bone}" stroke-width="1.2" stroke-opacity="${n(o * 0.4)}" fill="none"/>`);
  }
  // timber grain â€” short strokes
  for (let i = 0; i < 260; i++) {
    const x = S.r(0, 1) * w;
    const y = S.r(0, 1) * h;
    const len = S.r(0.02, 0.1) * w;
    S.add(`<path d="M ${n(x)} ${n(y)} L ${n(x + len)} ${n(y + len * slope)}" stroke="${S.rng() > 0.5 ? P.ink : P.bone}" stroke-width="${n(S.r(0.6, 1.8))}" stroke-opacity="${n(S.r(0.03, 0.11))}" fill="none"/>`);
  }
  // a vertical reveal joint for structure
  const jx = w * 0.375;
  S.add(`<rect x="${n(jx)}" y="-10" width="${n(w * 0.011)}" height="${n(h + 20)}" fill="${P.ink}" fill-opacity="0.5"/>`);
  S.add(`<rect x="${n(jx + w * 0.011)}" y="-10" width="2.5" height="${n(h + 20)}" fill="${P.bone}" fill-opacity="0.16"/>`);
  glow(S, { x: w * 1.02, y: h * 0.22, rx: w * 0.6, ry: h * 0.55, color: mix(P.gold, P.bone, 0.5), opacity: 0.16 });
  grade(S, { sunX: 0.95, sunY: 0.2, warm: 0.08, teal: 0.34, vignette: 0.92, letterbox: 0.4 });
};

/* --- 14 glass-facade â€” a repeated grid, cold blue against amber. ---------- */
RECIPES["glass-facade"] = (S) => {
  const { w, h } = S;
  S.add(`<rect width="${w}" height="${h}" fill="${P.ink}"/>`);
  const COLS = 16;
  const ROWS = 10;
  const colX = [];
  for (let i = 0; i <= COLS; i++) colX.push(w * (Math.pow(i / COLS, 1.16) * 1.02 - 0.01));
  const rowY = [];
  for (let j = 0; j <= ROWS; j++) rowY.push(h * (Math.pow(j / ROWS, 0.94) * 1.04 - 0.02));
  for (let j = 0; j < ROWS; j++) {
    const t = j / (ROWS - 1);
    // each row reflects a different band of the dusk sky
    const sky = t < 0.45
      ? mix(mix(P.slate, P.teal, 0.55), mix(P.haze, P.slate, 0.4), t / 0.45)
      : mix(mix(P.haze, P.slate, 0.4), mix(P.ember, P.slate, 0.45), (t - 0.45) / 0.55);
    for (let i = 0; i < COLS; i++) {
      const x = colX[i];
      const y = rowY[j];
      const pw = colX[i + 1] - x;
      const ph = rowY[j + 1] - y;
      const jitter = S.r(-0.06, 0.06);
      const isLit = S.rng() < 0.085;
      const fill = isLit
        ? mix(P.amber, P.ember, S.r(0.2, 0.55))
        : mix(sky, S.rng() > 0.5 ? P.bone : P.ink, Math.abs(jitter) * 2);
      S.add(`<rect x="${n(x)}" y="${n(y)}" width="${n(pw)}" height="${n(ph)}" fill="${fill}" fill-opacity="${n(isLit ? S.r(0.55, 0.85) : S.r(0.7, 1))}"/>`);
      // pane sheen
      S.add(`<path d="M ${n(x)} ${n(y + ph)} L ${n(x + pw * 0.55)} ${n(y)} L ${n(x + pw)} ${n(y)} L ${n(x + pw * 0.45)} ${n(y + ph)} Z" fill="${P.bone}" fill-opacity="${n(S.r(0.01, 0.05))}"/>`);
      if (isLit) {
        glow(S, { x: x + pw / 2, y: y + ph / 2, rx: pw * 1.7, ry: ph * 1.7, color: P.amber, opacity: 0.24 });
      }
    }
  }
  // blackened steel mullions
  for (let i = 0; i <= COLS; i++) {
    S.add(`<rect x="${n(colX[i] - w * 0.0022)}" y="-5" width="${n(w * 0.0044)}" height="${n(h + 10)}" fill="${P.ink}" fill-opacity="0.92"/>`);
    S.add(`<rect x="${n(colX[i] + w * 0.0022)}" y="-5" width="1.4" height="${n(h + 10)}" fill="${P.haze}" fill-opacity="0.2"/>`);
  }
  for (let j = 0; j <= ROWS; j++) {
    S.add(`<rect x="-5" y="${n(rowY[j] - h * 0.0035)}" width="${n(w + 10)}" height="${n(h * 0.007)}" fill="${P.ink}" fill-opacity="0.85"/>`);
  }
  // a broad diagonal sky reflection across the whole facade
  const shId = linGrad(S, [
    [0, P.bone, 0],
    [0.42, P.bone, 0.09],
    [0.55, mix(P.gold, P.bone, 0.5), 0.11],
    [0.72, P.bone, 0.02],
    [1, P.bone, 0],
  ], 0, 0, 1, 1);
  S.add(`<rect width="${w}" height="${h}" fill="url(#${shId})"/>`);
  glow(S, { x: w * 0.86, y: h * 0.9, rx: w * 0.55, ry: h * 0.6, color: mix(P.ember, P.amber, 0.5), opacity: 0.14 });
  grade(S, { sunX: 0.85, sunY: 0.85, warm: 0.07, teal: 0.34, vignette: 0.95, letterbox: 0.42 });
};

/* --- 15 stair-light â€” chiaroscuro, one bright wedge in near-black. -------- */
RECIPES["stair-light"] = (S) => {
  const { w, h } = S;
  const cx = w * 0.5;
  const cy = h * 0.46;
  S.add(`<rect width="${w}" height="${h}" fill="${P.ink}"/>`);
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.obsidian, P.slate, 0.3), 1],
    [0.6, P.obsidian, 1],
    [1, P.ink, 1],
  ]);
  // the stair spiralling away from the camera
  for (let k = 0; k < 9; k++) {
    const s = Math.pow(0.79, k);
    const rw = w * 0.62 * s;
    const rh = h * 0.78 * s;
    const ang = k * 8.5;
    const t = k / 8;
    const stone = mix(mix(P.bone, P.slate, 0.55), P.ink, t * 0.85);
    S.add(
      `<g transform="rotate(${n(ang)} ${n(cx)} ${n(cy)})">` +
        `<rect x="${n(cx - rw / 2)}" y="${n(cy - rh / 2)}" width="${n(rw)}" height="${n(rh)}" rx="${n(rw * 0.03)}" fill="none" stroke="${stone}" stroke-width="${n(w * (0.03 - t * 0.02) + 3)}" stroke-opacity="${n(0.5 - t * 0.3)}"/>` +
        // one cantilevered tread per turn
        `<rect x="${n(cx - rw / 2)}" y="${n(cy + rh * 0.18)}" width="${n(rw * 0.55)}" height="${n(rh * 0.06)}" fill="${stone}" fill-opacity="${n(0.42 - t * 0.28)}"/>` +
        `<rect x="${n(cx + rw * 0.02)}" y="${n(cy - rh * 0.3)}" width="${n(rw * 0.48)}" height="${n(rh * 0.05)}" fill="${stone}" fill-opacity="${n(0.3 - t * 0.2)}"/>` +
        `<rect x="${n(cx - rw / 2)}" y="${n(cy - rh / 2)}" width="${n(rw)}" height="${n(rh)}" fill="${P.ink}" fill-opacity="${n(0.1 + t * 0.05)}"/>` +
        `</g>`,
    );
  }
  // slot skylight, upper right
  const skx = w * 0.78;
  const sky = h * 0.06;
  S.add(`<path d="M ${n(skx - w * 0.13)} ${n(sky)} L ${n(skx + w * 0.13)} ${n(sky - h * 0.04)} L ${n(skx + w * 0.145)} ${n(sky + h * 0.02)} L ${n(skx - w * 0.12)} ${n(sky + h * 0.055)} Z" fill="${mix(P.bone, "#ffffff", 0.55)}" fill-opacity="0.9"/>`);
  glow(S, { x: skx, y: sky + h * 0.02, rx: w * 0.34, ry: h * 0.3, color: mix(P.gold, P.bone, 0.55), opacity: 0.42 });
  // the shaft
  const shId = linGrad(S, [
    [0, mix(P.bone, P.gold, 0.4), 0.34],
    [0.45, P.gold, 0.16],
    [1, P.gold, 0.02],
  ], 0.7, 0, 0.1, 1);
  S.add(`<path d="M ${n(skx - w * 0.12)} ${n(sky + h * 0.04)} L ${n(skx + w * 0.14)} ${n(sky + h * 0.01)} L ${n(w * 0.42)} ${n(h + 10)} L ${n(w * 0.02)} ${n(h + 10)} Z" fill="url(#${shId})"/>`);
  // where the shaft lands
  glow(S, { x: w * 0.22, y: h * 0.94, rx: w * 0.28, ry: h * 0.14, color: mix(P.gold, P.bone, 0.4), opacity: 0.34 });
  motes(S, { x0: w * 0.05, y0: h * 0.12, x1: w * 0.78, y1: h * 0.96, count: 120, color: mix(P.gold, P.bone, 0.45) });
  grade(S, { sunX: 0.74, sunY: 0.12, warm: 0.1, teal: 0.3, vignette: 1.12, letterbox: 0.52, lift: 0.012 });
};

/* --- 16 colonnade-pool â€” mirror symmetry, cold mist, warm far end. -------- */
RECIPES["colonnade-pool"] = (S) => {
  const { w, h } = S;
  const pool = h * 0.56;
  const capTop = h * 0.2;
  gradRect(S, 0, 0, w, h * 0.2, [
    [0, mix(P.slate, P.haze, 0.5), 1],
    [1, mix(P.haze, P.bone, 0.3), 1],
  ]);
  gradRect(S, 0, h * 0.18, w, pool - h * 0.18 + 4, [
    [0, mix(P.obsidian, P.slate, 0.5), 1],
    [1, mix(P.obsidian, P.slate, 0.25), 1],
  ]);
  glow(S, { x: w * 0.9, y: h * 0.42, rx: w * 0.42, ry: h * 0.4, color: mix(P.amber, P.gold, 0.4), opacity: 0.44 });
  // columns, spacing compressing toward the far (right) end
  const cols = [];
  for (let i = 0; i < 11; i++) {
    const t = Math.pow(i / 10, 1.5);
    const x = w * (0.04 + 0.9 * t);
    const cw = w * (0.052 - 0.035 * t);
    const top = capTop + h * 0.1 * t;
    cols.push([x, cw, top]);
  }
  const drawCols = (yTop, yBot, flip, alpha) => {
    cols.forEach(([x, cw, top], i) => {
      const t = i / 10;
      const lightness = 0.5 + 0.42 * t;
      const stone = mix(mix(P.bone, P.slate, 0.55), mix(P.gold, P.bone, 0.5), lightness * 0.55);
      const y0 = flip ? yTop : top;
      const hh = flip ? yBot - yTop : yBot - top;
      const gid = linGrad(S, [
        [0, mix(stone, P.bone, 0.25), 1],
        [0.55, stone, 1],
        [1, mix(stone, P.ink, 0.55), 1],
      ], 0, flip ? 1 : 0, 0, flip ? 0 : 1);
      S.add(`<rect x="${n(x)}" y="${n(y0)}" width="${n(cw)}" height="${n(hh)}" fill="url(#${gid})" fill-opacity="${alpha}"/>`);
      S.add(`<rect x="${n(x + cw * 0.72)}" y="${n(y0)}" width="${n(cw * 0.28)}" height="${n(hh)}" fill="${P.ink}" fill-opacity="${n(alpha * 0.38)}"/>`);
      if (!flip) {
        S.add(`<rect x="${n(x - cw * 0.16)}" y="${n(top - h * 0.018)}" width="${n(cw * 1.32)}" height="${n(h * 0.018)}" fill="${mix(stone, P.bone, 0.2)}" fill-opacity="${alpha}"/>`);
      }
    });
  };
  drawCols(capTop, pool, false, 1);
  // entablature
  S.add(`<rect x="0" y="${n(capTop - h * 0.055)}" width="${w}" height="${n(h * 0.04)}" fill="${mix(P.bone, P.slate, 0.6)}" fill-opacity="0.75"/>`);
  S.add(`<rect x="0" y="${n(capTop - h * 0.016)}" width="${w}" height="${n(h * 0.016)}" fill="${P.ink}" fill-opacity="0.45"/>`);
  // black reflecting pool
  gradRect(S, 0, pool, w, h - pool, [
    [0, mix(P.slate, P.ink, 0.45), 1],
    [0.4, mix(P.teal, P.ink, 0.55), 1],
    [1, P.ink, 1],
  ]);
  S.add(`<g transform="translate(0 ${n(2 * pool)}) scale(1 -1)" opacity="0.4">`);
  drawCols(capTop, pool, false, 1);
  S.add(`</g>`);
  // wobble the reflection into horizontal bands
  for (let i = 0; i < 46; i++) {
    const y = pool + (h - pool) * Math.pow(S.rng(), 1.3);
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="${n(S.r(1.5, 6))}" fill="${i % 3 === 0 ? mix(P.bone, P.haze, 0.5) : P.ink}" fill-opacity="${n(S.r(0.05, 0.22))}"/>`);
  }
  glow(S, { x: w * 0.9, y: pool + h * 0.08, rx: w * 0.3, ry: h * 0.1, color: P.amber, opacity: 0.26 });
  // cold mist over the water
  for (let i = 0; i < 6; i++) {
    glow(S, { x: S.r(0, 1) * w, y: pool + S.rs(1) * h * 0.05, rx: S.r(0.2, 0.5) * w, ry: S.r(0.012, 0.035) * h, color: mix(P.bone, P.haze, 0.4), opacity: S.r(0.09, 0.2) });
  }
  S.add(`<rect x="0" y="${n(pool - 2)}" width="${w}" height="3" fill="${mix(P.bone, P.haze, 0.5)}" fill-opacity="0.22"/>`);
  grade(S, { sunX: 0.9, sunY: 0.46, warm: 0.12, teal: 0.32, vignette: 0.98, letterbox: 0.46 });
};

/* --- 17 bronze-screen â€” hard bands of warm light, shallow DOF fins. ------- */
RECIPES["bronze-screen"] = (S) => {
  const { w, h } = S;
  S.def(`<filter id="dof" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="${n(w * 0.006)}"/></filter>`);
  gradRect(S, 0, 0, w, h * 0.4, [
    [0, P.ink, 1],
    [1, mix(P.obsidian, P.slate, 0.3), 1],
  ]);
  // stone floor
  gradRect(S, 0, h * 0.38, w, h * 0.62, [
    [0, mix(P.slate, P.ink, 0.5), 1],
    [0.4, mix(P.slate, P.ink, 0.62), 1],
    [1, mix(P.ink, P.slate, 0.2), 1],
  ]);
  for (let i = 0; i < 7; i++) {
    const y = h * (0.42 + i * 0.09);
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="1.8" fill="${P.ink}" fill-opacity="0.4"/>`);
  }
  // hard bands of light thrown across the floor
  for (let i = 0; i < 11; i++) {
    const x0 = w * (-0.05 + i * 0.104) + S.rs(1) * w * 0.006;
    const bw = w * S.r(0.03, 0.052);
    const skew = w * 0.34;
    const gid = linGrad(S, [
      [0, mix(P.gold, P.bone, 0.3), S.r(0.3, 0.46)],
      [0.5, P.amber, S.r(0.14, 0.24)],
      [1, P.ember, 0.02],
    ], 0, 0, 0.75, 1);
    S.add(`<path d="M ${n(x0)} ${n(h * 0.38)} L ${n(x0 + bw)} ${n(h * 0.38)} L ${n(x0 + bw + skew)} ${n(h + 10)} L ${n(x0 + skew)} ${n(h + 10)} Z" fill="url(#${gid})"/>`);
  }
  // the same bands climbing the back wall
  for (let i = 0; i < 11; i++) {
    const x0 = w * (-0.02 + i * 0.104);
    S.add(`<rect x="${n(x0)}" y="${n(h * 0.06)}" width="${n(w * S.r(0.02, 0.036))}" height="${n(h * 0.32)}" fill="${P.amber}" fill-opacity="${n(S.r(0.06, 0.16))}"/>`);
  }
  // the patinated bronze brise-soleil, left third
  const drawFins = (x0, x1, count, blur) => {
    const parts = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const x = x0 + (x1 - x0) * t;
      const fw = (x1 - x0) / count * S.r(0.4, 0.62);
      parts.push(
        `<rect x="${n(x)}" y="${n(-h * 0.05)}" width="${n(fw)}" height="${n(h * 1.1)}" fill="${mix(P.ember, P.ink, S.r(0.5, 0.72))}"/>` +
          `<rect x="${n(x + fw)}" y="${n(-h * 0.05)}" width="${n(fw * 0.22)}" height="${n(h * 1.1)}" fill="${mix(P.amber, P.gold, 0.45)}" fill-opacity="${n(S.r(0.3, 0.55))}"/>`,
      );
    }
    S.add(`<g${blur ? ' filter="url(#dof)"' : ""}>${parts.join("")}</g>`);
  };
  drawFins(w * 0.02, w * 0.26, 9, false);
  drawFins(-w * 0.03, w * 0.09, 4, true);
  glow(S, { x: w * 0.06, y: h * 0.5, rx: w * 0.3, ry: h * 0.7, color: mix(P.amber, P.ember, 0.5), opacity: 0.22 });
  glow(S, { x: w * 0.62, y: h * 0.78, rx: w * 0.45, ry: h * 0.28, color: P.amber, opacity: 0.14 });
  motes(S, { x0: w * 0.1, y0: h * 0.15, x1: w * 0.95, y1: h * 0.8, count: 60, color: mix(P.gold, P.bone, 0.4) });
  grade(S, { sunX: 0.08, sunY: 0.45, warm: 0.14, teal: 0.3, vignette: 1, letterbox: 0.48 });
};

/* --- 18 cloud-terrace â€” bright cloud band in the middle, dark foreground. - */
RECIPES["cloud-terrace"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.55;
  skyGradient(S, {
    top: mix(P.ink, P.slate, 0.5),
    mid: mix(P.slate, P.haze, 0.5),
    horizon: mix(P.haze, P.gold, 0.42),
    horizonY: hz + h * 0.04,
    glowColor: mix(P.gold, P.ember, 0.4),
    sunX: w * 0.78,
    sunY: hz - h * 0.03,
    glowR: 0.8,
    glowO: 0.5,
  });
  glow(S, { x: w * 0.78, y: hz - h * 0.02, rx: w * 0.2, ry: h * 0.06, color: mix(P.gold, "#ffffff", 0.3), opacity: 0.45 });
  // peaks emerging from the cloud
  ridgeline(S, { y: hz - h * 0.09, amp: h * 0.035, levels: 7, rough: 0.68, peak: h * 0.07, peakX: 0.3, peakW: 0.13, color: mix(P.slate, P.haze, 0.45), opacity: 0.45, bottom: hz + h * 0.1 });
  ridgeline(S, { y: hz - h * 0.05, amp: h * 0.03, levels: 7, rough: 0.7, peak: h * 0.055, peakX: 0.62, peakW: 0.12, color: mix(P.slate, P.teal, 0.4), opacity: 0.7, bottom: hz + h * 0.1 });
  // the cloud sea
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const y = hz + h * (0.005 + t * 0.2);
    const col = mix(mix(P.haze, P.bone, 0.55 - t * 0.3), mix(P.gold, P.haze, 0.5), 0.25);
    const { d } = ridgePath(S, { y, amp: h * (0.012 + t * 0.02), levels: 5, rough: 0.38, bottom: hz + h * 0.28 });
    S.add(`<path d="${d}" fill="${col}" fill-opacity="${n(0.55 - t * 0.15)}"/>`);
    for (let k = 0; k < 6; k++) {
      glow(S, { x: S.r(0, 1) * w, y: y + h * S.r(0, 0.02), rx: S.r(0.08, 0.26) * w, ry: S.r(0.008, 0.024) * h, color: mix(P.bone, P.gold, 0.35), opacity: S.r(0.05, 0.14) });
    }
  }
  gradRect(S, 0, hz + h * 0.18, w, h * 0.14, [
    [0, mix(P.haze, P.bone, 0.4), 0.35],
    [1, mix(P.slate, P.teal, 0.5), 0.1],
  ]);
  // the terrace itself
  const ty = h * 0.79;
  gradRect(S, 0, ty, w, h - ty, [
    [0, mix(P.slate, P.ink, 0.4), 1],
    [0.25, mix(P.obsidian, P.slate, 0.3), 1],
    [1, P.ink, 1],
  ]);
  S.add(`<rect x="0" y="${n(ty)}" width="${w}" height="${n(h * 0.012)}" fill="${mix(P.haze, P.bone, 0.4)}" fill-opacity="0.3"/>`);
  for (let i = 0; i < 6; i++) {
    S.add(`<rect x="${n(w * (i / 6))}" y="${n(ty)}" width="2" height="${n(h - ty)}" fill="${P.ink}" fill-opacity="0.4"/>`);
  }
  // a single dark daybed
  const bx = w * 0.2;
  const by = h * 0.93;
  S.add(`<rect x="${n(bx)}" y="${n(by - h * 0.055)}" width="${n(w * 0.2)}" height="${n(h * 0.055)}" rx="${n(h * 0.008)}" fill="${P.ink}"/>`);
  S.add(`<rect x="${n(bx)}" y="${n(by - h * 0.085)}" width="${n(w * 0.05)}" height="${n(h * 0.032)}" rx="${n(h * 0.008)}" fill="${P.ink}"/>`);
  S.add(`<rect x="${n(bx + w * 0.005)}" y="${n(by - h * 0.058)}" width="${n(w * 0.19)}" height="3" fill="${mix(P.bone, P.slate, 0.55)}" fill-opacity="0.22"/>`);
  atmosphere(S, { strength: 0.9, y0: 0.55, y1: 0.75, color: mix(P.bone, P.haze, 0.45), count: 4 });
  grade(S, { sunX: 0.78, sunY: 0.55, warm: 0.13, teal: 0.32, vignette: 0.98, letterbox: 0.5 });
};

/* --- 19 forest-road â€” aerial. No horizon at all, canopy texture + a curve. */
RECIPES["forest-road"] = (S) => {
  const { w, h } = S;
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.teal, P.slate, 0.5), 1],
    [0.35, mix(P.teal, P.slate, 0.3), 1],
    [1, mix(P.teal, P.ink, 0.5), 1],
  ]);
  // valley structure first: broad soft masses so the canopy sits on terrain
  for (let i = 0; i < 26; i++) {
    glow(S, {
      x: S.r(-0.1, 1.1) * w,
      y: S.r(-0.05, 1.05) * h,
      rx: S.r(0.1, 0.34) * w,
      ry: S.r(0.06, 0.2) * h,
      color: i % 3 === 0 ? mix(P.teal, P.haze, 0.35) : P.ink,
      opacity: S.r(0.1, 0.3),
    });
  }
  // canopy: clustered crowns, not scattered dots. Each crown is a few
  // overlapping lobes with a highlight lobe on its sun (upper-left) side.
  const CLUSTERS = 620;
  for (let c = 0; c < CLUSTERS; c++) {
    const u = S.rng();
    const cyy = h * Math.pow(u, 0.86);
    const depth = cyy / h;
    const cxx = S.r(-0.03, 1.03) * w;
    const scale = w * (0.0032 + 0.0095 * depth);
    const base = mix(P.teal, P.haze, 0.06 + 0.26 * (1 - depth));
    const lobes = S.ri(3, 5);
    const dark = mix(base, P.ink, S.r(0.2, 0.62));
    const parts = [];
    const hi = [];
    for (let j = 0; j < lobes; j++) {
      const ox = S.rs(1) * scale * 1.5;
      const oy = S.rs(1) * scale * 1.1;
      const s = scale * S.r(0.7, 1.5);
      parts.push(`<ellipse cx="${n(cxx + ox)}" cy="${n(cyy + oy)}" rx="${n(s)}" ry="${n(s * S.r(0.68, 0.98))}"/>`);
      if (j === 0) {
        hi.push(
          `<ellipse cx="${n(cxx + ox - s * 0.32)}" cy="${n(cyy + oy - s * 0.34)}" rx="${n(s * 0.55)}" ry="${n(s * 0.42)}" fill="${mix(base, P.bone, S.r(0.14, 0.4))}" fill-opacity="${n(S.r(0.2, 0.55))}"/>`,
        );
      }
    }
    S.add(`<g fill="${dark}" fill-opacity="${n(S.r(0.55, 0.95))}">${parts.join("")}</g>`);
    S.add(hi.join(""));
  }
  // mist ribbons pooling in the valleys
  for (let i = 0; i < 12; i++) {
    glow(S, { x: S.r(-0.1, 1.1) * w, y: S.r(0.12, 0.8) * h, rx: S.r(0.14, 0.42) * w, ry: S.r(0.015, 0.055) * h, color: mix(P.bone, P.haze, 0.4), opacity: S.r(0.1, 0.24) });
  }
  // the slender elevated road
  const bez = (t, p) => {
    const u = 1 - t;
    return [
      u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
      u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
    ];
  };
  const CP = [
    [-w * 0.08, h * 1.02],
    [w * 0.52, h * 0.86],
    [w * 0.1, h * 0.34],
    [w * 0.78, h * 0.12],
  ];
  const left = [];
  const right = [];
  const STEPS = 70;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const [x, y] = bez(t, CP);
    const [x2, y2] = bez(Math.min(1, t + 0.006), CP);
    let dx = x2 - x;
    let dy = y2 - y;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const wid = w * (0.019 * (1 - t) + 0.0028);
    left.push([x - dy * wid, y + dx * wid]);
    right.push([x + dy * wid, y - dx * wid]);
  }
  const roadD =
    `M ${n(left[0][0])} ${n(left[0][1])} ` +
    left.slice(1).map((p) => `L ${n(p[0])} ${n(p[1])}`).join(" ") +
    " " +
    right.reverse().map((p) => `L ${n(p[0])} ${n(p[1])}`).join(" ") +
    " Z";
  // shadow under the deck
  S.add(`<path d="${roadD}" transform="translate(${n(w * 0.012)} ${n(h * 0.016)})" fill="${P.ink}" fill-opacity="0.55"/>`);
  const rid = linGrad(S, [
    [0, mix(P.bone, P.haze, 0.35), 1],
    [0.55, mix(P.bone, P.slate, 0.55), 1],
    [1, mix(P.haze, P.slate, 0.5), 1],
  ], 0, 1, 0.4, 0);
  S.add(`<path d="${roadD}" fill="url(#${rid})" fill-opacity="0.85"/>`);
  // centre line + edge shadow
  const centreD =
    `M ${n(CP[0][0])} ${n(CP[0][1])} C ${n(CP[1][0])} ${n(CP[1][1])} ${n(CP[2][0])} ${n(CP[2][1])} ${n(CP[3][0])} ${n(CP[3][1])}`;
  S.add(`<path d="${centreD}" fill="none" stroke="${P.ink}" stroke-width="${n(w * 0.0012)}" stroke-opacity="0.22"/>`);
  // canopy spilling back over the road edges so it sits in the forest
  for (let i = 0; i < 220; i++) {
    const t = S.rng();
    const [rx0, ry0] = bez(t, CP);
    const s = w * (0.003 + 0.008 * (1 - t)) * S.r(0.6, 1.4);
    const off = w * (0.02 * (1 - t) + 0.004) * S.r(1.0, 2.6) * (S.rng() > 0.5 ? 1 : -1);
    const base = mix(P.teal, P.haze, 0.06 + 0.2 * t);
    S.add(`<ellipse cx="${n(rx0 + off)}" cy="${n(ry0 + S.rs(1) * s * 2)}" rx="${n(s)}" ry="${n(s * 0.8)}" fill="${mix(base, P.ink, S.r(0.2, 0.6))}" fill-opacity="${n(S.r(0.5, 0.95))}"/>`);
  }
  // sun shafts across the canopy
  lightShafts(S, { x: w * 0.05, y: -h * 0.05, count: 5, angle: 1.02, spread: 0.35, len: 1.5, color: mix(P.gold, P.bone, 0.45), opacity: 0.075 });
  atmosphere(S, { strength: 0.8, y0: 0.1, y1: 0.5, color: mix(P.haze, P.bone, 0.35), count: 4 });
  grade(S, { sunX: 0.2, sunY: 0.08, warm: 0.1, teal: 0.34, vignette: 1.02, letterbox: 0.55 });
};

/* --- 20 interior-fire â€” warm/cold split, monumental circular window. ------ */
RECIPES["interior-fire"] = (S) => {
  const { w, h } = S;
  gradRect(S, 0, 0, w, h, [
    [0, mix(P.obsidian, P.slate, 0.25), 1],
    [0.5, P.obsidian, 1],
    [1, P.ink, 1],
  ]);
  for (let i = 0; i < 13; i++) {
    const y = h * (0.03 + i * 0.062);
    S.add(`<rect x="0" y="${n(y)}" width="${w}" height="${n(h * 0.005)}" fill="${P.ink}" fill-opacity="${n(S.r(0.25, 0.55))}"/>`);
  }
  // the circular window onto a cold alpine exterior
  const cx = w * 0.69;
  const cy = h * 0.42;
  const r = h * 0.3;
  const cid = S.id("win");
  S.def(`<clipPath id="${cid}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/></clipPath>`);
  S.add(`<g clip-path="url(#${cid})">`);
  gradRect(S, cx - r, cy - r, r * 2, r * 2, [
    [0, mix(P.slate, P.teal, 0.4), 1],
    [0.55, mix(P.haze, P.slate, 0.45), 1],
    [1, mix(P.haze, P.bone, 0.35), 1],
  ]);
  const ph = cy + r * 0.3;
  const p1 = ridgePath(S, { y: ph - r * 0.35, amp: r * 0.14, levels: 7, rough: 0.72, peak: r * 0.3, peakX: 0.4, peakW: 0.16, bottom: cy + r + 10 });
  S.add(`<path d="${p1.d}" fill="${mix(P.bone, P.haze, 0.4)}" fill-opacity="0.9"/>`);
  const p1b = ridgePath(S, { y: ph - r * 0.35, amp: r * 0.14, levels: 7, rough: 0.72, peak: r * 0.3, peakX: 0.4, peakW: 0.16, bottom: cy + r + 10, dx: r * 0.05, dy: r * 0.07 });
  S.add(`<path d="${p1b.d}" fill="${mix(P.slate, P.haze, 0.4)}" fill-opacity="0.92"/>`);
  hazeBand(S, ph - r * 0.3, r * 0.4, mix(P.bone, P.haze, 0.4), 0.35);
  const p2 = ridgePath(S, { y: ph - r * 0.05, amp: r * 0.1, levels: 7, rough: 0.7, peak: r * 0.18, peakX: 0.72, peakW: 0.15, bottom: cy + r + 10 });
  S.add(`<path d="${p2.d}" fill="${mix(P.bone, P.slate, 0.55)}" fill-opacity="0.9"/>`);
  const p2b = ridgePath(S, { y: ph - r * 0.05, amp: r * 0.1, levels: 7, rough: 0.7, peak: r * 0.18, peakX: 0.72, peakW: 0.15, bottom: cy + r + 10, dx: r * 0.05, dy: r * 0.07 });
  S.add(`<path d="${p2b.d}" fill="${mix(P.slate, P.teal, 0.4)}" fill-opacity="0.95"/>`);
  gradRect(S, cx - r, cy + r * 0.4, r * 2, r * 0.65, [
    [0, mix(P.slate, P.haze, 0.5), 1],
    [1, mix(P.slate, P.teal, 0.5), 1],
  ]);
  S.add(`</g>`);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${P.ink}" stroke-width="${n(h * 0.016)}" stroke-opacity="0.95"/>`);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r + h * 0.014)}" fill="none" stroke="${mix(P.slate, P.haze, 0.4)}" stroke-width="3" stroke-opacity="0.3"/>`);
  glow(S, { x: cx, y: cy, rx: r * 2.1, ry: r * 2.1, color: mix(P.haze, P.slate, 0.35), opacity: 0.2 });

  // the linear fireplace
  const fx0 = w * 0.08;
  const fx1 = w * 0.4;
  const fy = h * 0.68;
  glow(S, { x: (fx0 + fx1) / 2, y: fy, rx: w * 0.34, ry: h * 0.3, color: mix(P.ember, P.amber, 0.55), opacity: 0.42 });
  S.add(`<rect x="${n(fx0)}" y="${n(fy - h * 0.014)}" width="${n(fx1 - fx0)}" height="${n(h * 0.026)}" fill="${mix(P.gold, P.amber, 0.4)}" fill-opacity="0.95"/>`);
  S.add(`<rect x="${n(fx0 - w * 0.02)}" y="${n(fy + h * 0.012)}" width="${n(fx1 - fx0 + w * 0.04)}" height="${n(h * 0.012)}" fill="${P.ink}"/>`);
  for (let i = 0; i < 16; i++) {
    const x = S.r(fx0, fx1);
    S.add(`<ellipse cx="${n(x)}" cy="${n(fy - h * S.r(0.012, 0.05))}" rx="${n(w * S.r(0.004, 0.014))}" ry="${n(h * S.r(0.008, 0.03))}" fill="${mix(P.gold, P.amber, 0.5)}" fill-opacity="${n(S.r(0.1, 0.35))}"/>`);
  }
  // bouclÃ© sofa in silhouette, rimmed by the fire
  const sx = w * 0.14;
  const sy = h * 0.76;
  S.add(`<rect x="${n(sx)}" y="${n(sy)}" width="${n(w * 0.42)}" height="${n(h * 0.16)}" rx="${n(h * 0.03)}" fill="${mix(P.slate, P.ink, 0.72)}"/>`);
  S.add(`<rect x="${n(sx - w * 0.01)}" y="${n(sy - h * 0.06)}" width="${n(w * 0.1)}" height="${n(h * 0.1)}" rx="${n(h * 0.028)}" fill="${mix(P.slate, P.ink, 0.7)}"/>`);
  S.add(`<rect x="${n(sx + w * 0.34)}" y="${n(sy - h * 0.05)}" width="${n(w * 0.09)}" height="${n(h * 0.09)}" rx="${n(h * 0.026)}" fill="${mix(P.slate, P.ink, 0.7)}"/>`);
  S.add(`<rect x="${n(sx)}" y="${n(sy)}" width="${n(w * 0.42)}" height="4" fill="${mix(P.amber, P.ember, 0.5)}" fill-opacity="0.4"/>`);
  S.add(`<rect x="${n(sx - w * 0.01)}" y="${n(sy - h * 0.06)}" width="3.5" height="${n(h * 0.1)}" fill="${P.amber}" fill-opacity="0.32"/>`);
  // floor with warm reflection
  gradRect(S, 0, h * 0.9, w, h * 0.1, [
    [0, mix(P.slate, P.ink, 0.6), 1],
    [1, P.ink, 1],
  ]);
  for (let i = 0; i < 14; i++) {
    S.add(`<rect x="${n(S.r(0.02, 0.5) * w)}" y="${n(h * S.r(0.9, 0.99))}" width="${n(w * S.r(0.02, 0.12))}" height="${n(S.r(1.5, 4))}" fill="${P.amber}" fill-opacity="${n(S.r(0.05, 0.2))}"/>`);
  }
  atmosphere(S, { strength: 0.5, y0: 0.3, y1: 0.7, color: mix(P.ember, P.haze, 0.55), count: 3 });
  grade(S, { sunX: 0.24, sunY: 0.66, warm: 0.14, teal: 0.3, vignette: 1.05, letterbox: 0.5, lift: 0.01 });
};

/* --- 21 portrait-lowkey â€” 4:5, near-black, single warm side light. -------- */
RECIPES["portrait-lowkey"] = (S) => {
  const { w, h } = S;
  // studio backdrop: a cold fall-off, not flat black, so the silhouette has
  // something to separate against
  const bid = radGrad(S, [
    [0, mix(P.haze, P.ink, 0.55), 1],
    [0.32, mix(P.haze, P.ink, 0.7), 1],
    [0.62, mix(P.slate, P.ink, 0.62), 1],
    [1, P.ink, 1],
  ], 0.72, 0.28, 0.95);
  S.add(`<rect width="${w}" height="${h}" fill="url(#${bid})"/>`);
  glow(S, { x: w * 0.02, y: h * 0.42, rx: w * 0.62, ry: h * 0.55, color: mix(P.amber, P.ember, 0.45), opacity: 0.26 });
  glow(S, { x: w * 0.92, y: h * 0.2, rx: w * 0.5, ry: h * 0.42, color: mix(P.haze, P.slate, 0.35), opacity: 0.22 });

  // A PROFILE, turned into the key light and cropped at the crown. A frontal
  // oval always reads as an avatar glyph; a brow/nose/lip/chin contour reads
  // unmistakably as a person even in pure silhouette.
  const X = (f) => w * f;
  const Y = (f) => h * f;
  // the face contour on its own — this is what the rim light traces
  const profile =
    `M ${n(X(0.615))} ${n(Y(-0.02))} ` +
    `C ${n(X(0.6))} ${n(Y(-0.09))} ${n(X(0.4))} ${n(Y(-0.1))} ${n(X(0.348))} ${n(Y(0.13))} ` +
    `C ${n(X(0.333))} ${n(Y(0.19))} ${n(X(0.356))} ${n(Y(0.208))} ${n(X(0.339))} ${n(Y(0.232))} ` +
    `C ${n(X(0.322))} ${n(Y(0.258))} ${n(X(0.285))} ${n(Y(0.288))} ${n(X(0.294))} ${n(Y(0.309))} ` +
    `C ${n(X(0.301))} ${n(Y(0.322))} ${n(X(0.336))} ${n(Y(0.318))} ${n(X(0.338))} ${n(Y(0.333))} ` +
    `C ${n(X(0.329))} ${n(Y(0.348))} ${n(X(0.348))} ${n(Y(0.353))} ${n(X(0.355))} ${n(Y(0.361))} ` +
    `C ${n(X(0.364))} ${n(Y(0.372))} ${n(X(0.339))} ${n(Y(0.385))} ${n(X(0.35))} ${n(Y(0.399))} ` +
    `C ${n(X(0.363))} ${n(Y(0.42))} ${n(X(0.398))} ${n(Y(0.428))} ${n(X(0.409))} ${n(Y(0.446))} ` +
    `C ${n(X(0.425))} ${n(Y(0.468))} ${n(X(0.404))} ${n(Y(0.508))} ${n(X(0.398))} ${n(Y(0.552))} ` +
    `C ${n(X(0.396))} ${n(Y(0.586))} ${n(X(0.4))} ${n(Y(0.6))} ${n(X(0.402))} ${n(Y(0.616))}`;
  const figure =
    profile +
    ` C ${n(X(0.3))} ${n(Y(0.648))} ${n(X(0.11))} ${n(Y(0.72))} ${n(X(-0.07))} ${n(Y(0.83))} ` +
    `L ${n(X(-0.07))} ${n(h + 20)} L ${n(X(1.07))} ${n(h + 20)} L ${n(X(1.07))} ${n(Y(0.8))} ` +
    `C ${n(X(0.92))} ${n(Y(0.7))} ${n(X(0.74))} ${n(Y(0.638))} ${n(X(0.648))} ${n(Y(0.6))} ` +
    `C ${n(X(0.625))} ${n(Y(0.552))} ${n(X(0.63))} ${n(Y(0.508))} ${n(X(0.652))} ${n(Y(0.462))} ` +
    `C ${n(X(0.7))} ${n(Y(0.375))} ${n(X(0.705))} ${n(Y(0.2))} ${n(X(0.66))} ${n(Y(0.06))} ` +
    `C ${n(X(0.648))} ${n(Y(0.022))} ${n(X(0.632))} ${n(Y(0.0))} ${n(X(0.615))} ${n(Y(-0.02))} Z`;
  S.add(`<path d="${figure}" fill="${mix(P.ink, P.slate, 0.22)}"/>`);

  const fid = S.id("fig");
  S.def(`<clipPath id="${fid}"><path d="${figure}"/></clipPath>`);
  S.add(`<g clip-path="url(#${fid})">`);
  glow(S, { x: X(0.22), y: Y(0.3), rx: w * 0.32, ry: h * 0.3, color: mix(P.amber, P.bone, 0.4), opacity: 0.4 });
  glow(S, { x: X(0.1), y: Y(0.84), rx: w * 0.3, ry: h * 0.2, color: mix(P.ember, P.amber, 0.4), opacity: 0.3 });
  const lid = linGrad(S, [
    [0, mix(P.gold, P.amber, 0.45), 0.2],
    [0.3, P.amber, 0.05],
    [0.6, P.ink, 0.28],
    [1, P.ink, 0.72],
  ], 0, 0, 1, 0.18);
  S.add(`<rect width="${w}" height="${h}" fill="url(#${lid})"/>`);
  // coat: shoulder seam, lapel and a few folds catching the key
  S.add(`<path d="M ${n(X(0.4))} ${n(Y(0.63))} C ${n(X(0.33))} ${n(Y(0.72))} ${n(X(0.29))} ${n(Y(0.86))} ${n(X(0.285))} ${n(h + 10)} L ${n(X(0.21))} ${n(h + 10)} C ${n(X(0.23))} ${n(Y(0.82))} ${n(X(0.3))} ${n(Y(0.7))} ${n(X(0.375))} ${n(Y(0.625))} Z" fill="${mix(P.ember, P.ink, 0.72)}" fill-opacity="0.55"/>`);
  S.add(`<path d="M ${n(X(0.4))} ${n(Y(0.63))} C ${n(X(0.33))} ${n(Y(0.72))} ${n(X(0.29))} ${n(Y(0.86))} ${n(X(0.285))} ${n(h + 10)}" fill="none" stroke="${mix(P.amber, P.bone, 0.4)}" stroke-width="${n(w * 0.0035)}" stroke-opacity="0.3"/>`);
  S.add(`<path d="M ${n(X(0.44))} ${n(Y(0.645))} C ${n(X(0.47))} ${n(Y(0.78))} ${n(X(0.5))} ${n(Y(0.9))} ${n(X(0.5))} ${n(h + 10)}" fill="none" stroke="${P.ink}" stroke-width="${n(w * 0.01)}" stroke-opacity="0.55"/>`);
  // broad, soft fabric folds — light rolling over wool, not scribbles
  for (let i = 0; i < 5; i++) {
    const fx = 0.04 + i * 0.062;
    const gid = linGrad(S, [
      [0, mix(P.amber, P.bone, 0.4), 0],
      [0.5, mix(P.amber, P.bone, 0.4), S.r(0.06, 0.13)],
      [1, mix(P.amber, P.bone, 0.4), 0],
    ], 0, 0, 1, 0);
    S.add(`<path d="M ${n(X(fx))} ${n(Y(0.7))} C ${n(X(fx + 0.04))} ${n(Y(0.82))} ${n(X(fx + 0.03))} ${n(Y(0.9))} ${n(X(fx + 0.05))} ${n(h + 10)} L ${n(X(fx + 0.1))} ${n(h + 10)} C ${n(X(fx + 0.09))} ${n(Y(0.88))} ${n(X(fx + 0.1))} ${n(Y(0.8))} ${n(X(fx + 0.07))} ${n(Y(0.7))} Z" fill="url(#${gid})"/>`);
  }
  // cold kicker as a soft wash down the far shoulder, not a drawn line
  glow(S, { x: X(0.86), y: Y(0.78), rx: w * 0.34, ry: h * 0.24, color: mix(P.haze, P.bone, 0.5), opacity: 0.24 });
  glow(S, { x: X(0.68), y: Y(0.2), rx: w * 0.1, ry: h * 0.2, color: mix(P.haze, P.bone, 0.45), opacity: 0.3 });
  S.add(`</g>`);
  // the rim: traced along the face contour only, brightest at the brow and
  // nose, falling off into the neck
  const rimId = linGrad(S, [
    [0, mix(P.gold, "#ffffff", 0.4), 0.9],
    [0.42, mix(P.gold, P.amber, 0.5), 0.85],
    [0.78, P.ember, 0.35],
    [1, P.ember, 0.05],
  ], 0, 0, 0.15, 1);
  S.add(`<path d="${profile}" fill="none" stroke="${mix(P.amber, P.ember, 0.45)}" stroke-width="${n(w * 0.018)}" stroke-opacity="0.3" stroke-linecap="round"/>`);
  S.add(`<path d="${profile}" fill="none" stroke="url(#${rimId})" stroke-width="${n(w * 0.0055)}" stroke-linecap="round"/>`);
  // a cold kicker down the back of the head and the far shoulder
  S.add(
    `<path d="M ${n(X(0.615))} ${n(Y(-0.02))} C ${n(X(0.63))} ${n(Y(0.14))} ${n(X(0.634))} ${n(Y(0.3))} ${n(X(0.637))} ${n(Y(0.44))} C ${n(X(0.639))} ${n(Y(0.5))} ${n(X(0.64))} ${n(Y(0.56))} ${n(X(0.665))} ${n(Y(0.612))} C ${n(X(0.76))} ${n(Y(0.645))} ${n(X(0.92))} ${n(Y(0.7))} ${n(X(1.07))} ${n(Y(0.8))}" fill="none" stroke="${mix(P.haze, P.bone, 0.45)}" stroke-width="${n(w * 0.004)}" stroke-opacity="0.42"/>`,
  );
  atmosphere(S, { strength: 0.45, y0: 0.12, y1: 0.5, color: mix(P.haze, P.slate, 0.4), count: 3 });
  grade(S, { sunX: 0.12, sunY: 0.32, warm: 0.1, teal: 0.24, vignette: 0.92, letterbox: 0.38, lift: 0.018 });
};

/* --- 22 moon-portal â€” a giant glowing ring in a dark rock face. ----------- */
RECIPES["moon-portal"] = (S) => {
  const { w, h } = S;
  const cx = w * 0.5;
  const cy = h * 0.42;
  const r = h * 0.29;
  const wy = h * 0.72;
  gradRect(S, 0, 0, w, h, [
    [0, P.ink, 1],
    [0.4, mix(P.obsidian, P.slate, 0.22), 1],
    [1, P.ink, 1],
  ]);
  // fractured rock face
  for (let i = 0; i < 44; i++) {
    const x = S.r(-0.05, 1.05) * w;
    const y = S.r(-0.05, 1.0) * h;
    const s = S.r(0.05, 0.3) * w;
    const pts = [];
    const k = S.ri(4, 6);
    for (let j = 0; j < k; j++) {
      const a = (j / k) * Math.PI * 2 + S.rs(0.4);
      const rr = s * S.r(0.45, 1);
      pts.push(`${n(x + Math.cos(a) * rr)} ${n(y + Math.sin(a) * rr * 0.75)}`);
    }
    const facet = `M ${pts.join(" L ")} Z`;
    S.add(`<path d="${facet}" fill="${S.rng() > 0.5 ? P.ink : mix(P.slate, P.ink, 0.5)}" fill-opacity="${n(S.r(0.25, 0.6))}"/>`);
    // a catchlight along one edge of each facet, so the rock has planes
    S.add(`<path d="${facet}" fill="none" stroke="${mix(P.haze, P.slate, 0.4)}" stroke-width="${n(S.r(1.5, 4))}" stroke-opacity="${n(S.r(0.05, 0.18))}"/>`);
  }
  // the portal
  glow(S, { x: cx, y: cy, rx: r * 3.4, ry: r * 3.4, color: mix(P.haze, P.bone, 0.5), opacity: 0.3 });
  glow(S, { x: cx, y: cy, rx: r * 1.9, ry: r * 1.9, color: mix(P.gold, P.amber, 0.5), opacity: 0.26 });
  const pid = radGrad(S, [
    [0, mix(P.gold, "#ffffff", 0.35), 1],
    [0.24, mix(P.gold, P.amber, 0.5), 1],
    [0.55, mix(P.bone, P.haze, 0.35), 1],
    [0.88, mix(P.haze, P.bone, 0.45), 1],
    [1, mix(P.haze, P.slate, 0.4), 1],
  ], 0.5, 0.55, 0.55);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#${pid})"/>`);
  // the aperture is not a flat disc — mist layers and a hint of ground inside
  const aid = S.id("aperture");
  S.def(`<clipPath id="${aid}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/></clipPath>`);
  S.add(`<g clip-path="url(#${aid})">`);
  gradRect(S, cx - r, cy - r, r * 2, r * 2, [
    [0, mix(P.haze, P.bone, 0.55), 0.35],
    [0.42, P.gold, 0],
    [0.78, mix(P.bone, P.haze, 0.45), 0.22],
    [1, mix(P.haze, P.slate, 0.45), 0.5],
  ]);
  for (let i = 0; i < 10; i++) {
    const yy = cy - r + S.rng() * r * 2;
    S.add(`<ellipse cx="${n(cx + S.rs(1) * r * 0.5)}" cy="${n(yy)}" rx="${n(r * S.r(0.4, 1.1))}" ry="${n(r * S.r(0.02, 0.075))}" fill="${S.rng() > 0.45 ? mix(P.bone, "#ffffff", 0.4) : mix(P.haze, P.slate, 0.4)}" fill-opacity="${n(S.r(0.06, 0.2))}"/>`);
  }
  S.add(`<rect x="${n(cx - r)}" y="${n(cy + r * 0.72)}" width="${n(r * 2)}" height="${n(r * 0.3)}" fill="${mix(P.slate, P.haze, 0.4)}" fill-opacity="0.35"/>`);
  S.add(`</g>`);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r + h * 0.012)}" fill="none" stroke="${P.ink}" stroke-width="${n(h * 0.024)}" stroke-opacity="0.8"/>`);
  // rock lip catching the portal light
  S.add(`<path d="M ${n(cx - r * 1.06)} ${n(cy)} A ${n(r * 1.06)} ${n(r * 1.06)} 0 0 1 ${n(cx + r * 1.06)} ${n(cy)}" fill="none" stroke="${mix(P.bone, P.haze, 0.4)}" stroke-width="${n(h * 0.01)}" stroke-opacity="0.22"/>`);
  S.add(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r + h * 0.032)}" fill="none" stroke="${mix(P.haze, P.bone, 0.4)}" stroke-width="${n(h * 0.006)}" stroke-opacity="0.3"/>`);
  // mist across the aperture
  for (let i = 0; i < 5; i++) {
    glow(S, { x: cx + S.rs(1) * w * 0.2, y: cy + h * S.r(0.05, 0.28), rx: S.r(0.15, 0.42) * w, ry: S.r(0.008, 0.024) * h, color: mix(P.bone, P.haze, 0.4), opacity: S.r(0.1, 0.24) });
  }
  // a single figure for scale
  const fx = w * 0.395;
  S.add(`<path d="M ${n(fx)} ${n(wy)} L ${n(fx - h * 0.012)} ${n(wy - h * 0.052)} L ${n(fx - h * 0.006)} ${n(wy - h * 0.066)} L ${n(fx + h * 0.006)} ${n(wy - h * 0.066)} L ${n(fx + h * 0.012)} ${n(wy - h * 0.052)} Z" fill="${P.ink}"/>`);
  S.add(`<circle cx="${n(fx)}" cy="${n(wy - h * 0.074)}" r="${n(h * 0.009)}" fill="${P.ink}"/>`);
  // mirrored shallow water
  gradRect(S, 0, wy, w, h - wy, [
    [0, mix(P.slate, P.teal, 0.5), 1],
    [0.35, mix(P.teal, P.ink, 0.5), 1],
    [1, P.ink, 1],
  ]);
  S.add(`<ellipse cx="${n(cx)}" cy="${n(wy + (wy - cy) * 0.55)}" rx="${n(r * 0.92)}" ry="${n(r * 0.42)}" fill="${mix(P.bone, P.haze, 0.45)}" fill-opacity="0.16"/>`);
  waterPlane(S, {
    y: wy, h: h - wy,
    top: mix(P.slate, P.teal, 0.55),
    bottom: P.ink,
    sunX: cx,
    sunColor: mix(P.bone, P.gold, 0.4),
    streaks: 44, pathW: 0.16, pathO: 0.28, scatter: 0.24,
  });
  S.add(`<rect x="${n(fx - h * 0.012)}" y="${n(wy)}" width="${n(h * 0.024)}" height="${n(h * 0.05)}" fill="${P.ink}" fill-opacity="0.5"/>`);
  S.add(`<rect x="0" y="${n(wy - 2)}" width="${w}" height="3" fill="${mix(P.bone, P.haze, 0.5)}" fill-opacity="0.18"/>`);
  grade(S, { sunX: 0.5, sunY: 0.42, warm: 0.1, teal: 0.32, vignette: 1.08, letterbox: 0.55 });
};

/* --- 23 moon-water â€” the most minimal frame. Near-monochrome, no land. ---- */
RECIPES["moon-water"] = (S) => {
  const { w, h } = S;
  const hz = h * 0.3;
  const mx = w * 0.5;
  const my = h * 0.14;
  skyGradient(S, {
    top: P.ink,
    mid: mix(P.slate, P.teal, 0.55),
    horizon: mix(P.haze, P.slate, 0.45),
    horizonY: hz,
    glowColor: mix(P.haze, P.bone, 0.35),
    sunX: mx,
    sunY: my,
    glowR: 0.72,
    glowO: 0.36,
  });
  // faint cloud banding, lit from below by the moon
  for (let i = 0; i < 9; i++) {
    const y = S.r(0.04, 0.28) * h;
    const x = S.r(0, 1) * w;
    const rx = S.r(0.14, 0.46) * w;
    glow(S, { x, y, rx, ry: S.r(0.008, 0.026) * h, color: mix(P.slate, P.haze, 0.6), opacity: S.r(0.1, 0.24) });
    if (Math.abs(x - mx) < w * 0.35) {
      glow(S, { x, y: y + h * 0.008, rx: rx * 0.7, ry: S.r(0.004, 0.01) * h, color: mix(P.bone, P.haze, 0.4), opacity: S.r(0.06, 0.16) });
    }
  }
  celestialBody(S, mx, my, h * 0.036, { warm: 0.15, intensity: 1.1 });
  waterPlane(S, {
    y: hz, h: h - hz,
    top: mix(P.slate, P.teal, 0.6),
    bottom: P.ink,
    sunX: mx,
    sunColor: mix(P.bone, P.haze, 0.35),
    streaks: 130, pathW: 0.14, pathO: 0.3, scatter: 0.16, glint: 1.1,
  });
  hazeBand(S, hz - h * 0.02, h * 0.06, mix(P.haze, P.bone, 0.4), 0.22);
  S.add(`<rect x="0" y="${n(hz - 1.5)}" width="${w}" height="2.5" fill="${mix(P.bone, P.haze, 0.5)}" fill-opacity="0.3"/>`);
  atmosphere(S, { strength: 0.7, y0: 0.24, y1: 0.42, color: mix(P.slate, P.haze, 0.5), count: 4 });
  grade(S, { sunX: 0.5, sunY: 0.2, warm: 0.05, teal: 0.34, vignette: 1.05, letterbox: 0.55, lift: 0.008 });
};

/* ========================================================================== *
 * 7. MANIFEST â€” src/lib/images.ts is the single source of truth. Read it as
 *    text and pull the fields out; no build step, no duplicated list.
 * ========================================================================== */
function readManifest() {
  const src = fs.readFileSync(MANIFEST, "utf8");
  const start = src.indexOf("IMAGE_ASSETS: ImageAsset[] = [");
  if (start < 0) throw new Error("[AURUM] IMAGE_ASSETS not found in " + MANIFEST);
  const end = src.indexOf("\n];", start);
  const body = src.slice(start, end < 0 ? undefined : end);
  const chunks = body.split(/\bkey:\s*"/).slice(1);
  const grab = (c, re, cast) => {
    const m = c.match(re);
    if (!m) return null;
    return cast ? cast(m[1]) : m[1];
  };
  const assets = chunks.map((raw) => {
    const c = 'key: "' + raw;
    const a = {
      key: grab(c, /key:\s*"([^"]+)"/),
      file: grab(c, /file:\s*"([^"]+)"/),
      width: grab(c, /width:\s*(\d+)/, Number),
      height: grab(c, /height:\s*(\d+)/, Number),
      recipe: grab(c, /recipe:\s*"([^"]+)"/),
      seed: grab(c, /seed:\s*(\d+)/, Number),
    };
    for (const k of Object.keys(a)) {
      if (a[k] == null) throw new Error(`[AURUM] manifest entry missing ${k}: ${c.slice(0, 80)}`);
    }
    return a;
  });
  if (!assets.length) throw new Error("[AURUM] manifest parsed to zero assets");
  return assets;
}

/* ========================================================================== *
 * 8. GRAIN â€” ONE 512px noise tile shared by every frame. This is the single
 *    biggest reason the set reads as one shoot rather than 23 illustrations.
 * ========================================================================== */
async function makeGrain(size = 512, strength = 0.34, sigma = 34) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma },
    },
  })
    .greyscale()
    .toColourspace("srgb")
    .linear(strength, 128 * (1 - strength))
    .png()
    .toBuffer();
}

/* ========================================================================== *
 * 9. RENDER PIPELINE
 * ========================================================================== */
function composeSize(a) {
  const cw = a.width >= a.height ? 2400 : 1800;
  return [cw, Math.round((cw * a.height) / a.width)];
}

async function renderAsset(a, grain) {
  const recipe = RECIPES[a.recipe];
  if (!recipe) throw new Error(`[AURUM] no recipe implemented for "${a.recipe}" (${a.key})`);
  const [cw, ch] = composeSize(a);
  const S = new Scene(cw, ch, a.seed);
  recipe(S);
  const svg = Buffer.from(S.toSVG(), "utf8");

  const outFile = path.join(OUT_DIR, a.file);
  await sharp(svg, { limitInputPixels: false })
    // smooth atmospheric scenes: the upscale reads as depth of field, not mush
    .resize(a.width, a.height, { kernel: "lanczos3", fit: "fill" })
    .composite([{ input: grain, tile: true, blend: "overlay" }])
    .webp({ quality: 86, effort: 5 })
    .toFile(outFile);

  const previewFile = path.join(PREVIEW_DIR, a.key + ".jpg");
  await sharp(outFile)
    .resize({ width: 1000, kernel: "lanczos3" })
    .jpeg({ quality: 78, chromaSubsampling: "4:4:4" })
    .toFile(previewFile);

  const lqip = await sharp(outFile).resize({ width: 24 }).webp({ quality: 55 }).toBuffer();

  const stats = await sharp(outFile).resize({ width: 480 }).stats();
  const chans = stats.channels.slice(0, 3);
  const mean = chans.reduce((s, c) => s + c.mean, 0) / 3;
  const sdev = chans.reduce((s, c) => s + c.stdev, 0) / 3;

  return {
    key: a.key,
    file: a.file,
    recipe: a.recipe,
    dims: `${a.width}x${a.height}`,
    svgKB: Math.round(svg.length / 1024),
    bytes: fs.statSync(outFile).size,
    previewBytes: fs.statSync(previewFile).size,
    blur: "data:image/webp;base64," + lqip.toString("base64"),
    mean,
    sdev,
    channels: chans.map((c) => ({ mean: c.mean, stdev: c.stdev, min: c.min, max: c.max })),
  };
}

/* ========================================================================== *
 * 10. VERIFY â€” catch "flat black rectangle" and "the SVG failed, it's white".
 * ========================================================================== */
const MEAN_MIN = 15;
const MEAN_MAX = 110;
const SDEV_MIN = 12;

function verify(r) {
  const problems = [];
  for (const c of r.channels) {
    if (c.mean < MEAN_MIN) problems.push(`channel mean ${c.mean.toFixed(1)} < ${MEAN_MIN} (too dark / black frame)`);
    if (c.mean > MEAN_MAX) problems.push(`channel mean ${c.mean.toFixed(1)} > ${MEAN_MAX} (blown out / white frame)`);
    if (c.stdev < SDEV_MIN) problems.push(`channel stdev ${c.stdev.toFixed(1)} < ${SDEV_MIN} (flat, no composition)`);
  }
  const MIN_BYTES = 15 * 1024;
  if (r.bytes < MIN_BYTES) problems.push(`file ${(r.bytes / 1024).toFixed(1)}KB < 15KB`);
  return problems;
}

/* ========================================================================== *
 * 11. MAIN
 * ========================================================================== */
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const assets = readManifest();
  const missing = assets.filter((a) => !RECIPES[a.recipe]);
  if (missing.length) {
    throw new Error("[AURUM] recipes missing: " + missing.map((m) => m.recipe).join(", "));
  }
  console.log(`[AURUM] ${assets.length} assets, ${new Set(assets.map((a) => a.recipe)).size} recipes`);

  const grain = await makeGrain();
  console.log(`[AURUM] shared grain tile: 512x512, ${grain.length} bytes`);

  const results = [];
  let failed = 0;
  for (const a of assets) {
    const t0 = Date.now();
    const r = await renderAsset(a, grain);
    const problems = verify(r);
    results.push(r);
    const flag = problems.length ? "FAIL" : "ok  ";
    console.log(
      `${flag} ${r.key.padEnd(22)} ${r.recipe.padEnd(16)} ${r.dims.padEnd(10)} ` +
        `${(r.bytes / 1024).toFixed(1).padStart(7)}KB  jpg ${(r.previewBytes / 1024).toFixed(1).padStart(6)}KB  ` +
        `mean ${r.mean.toFixed(1).padStart(5)}  sd ${r.sdev.toFixed(1).padStart(5)}  ` +
        `svg ${String(r.svgKB).padStart(4)}KB  ${Date.now() - t0}ms`,
    );
    if (problems.length) {
      failed++;
      for (const p of problems) console.log(`      ! ${p}`);
    }
  }

  // ---- LQIP map ------------------------------------------------------------
  const lines = results.map((r) => `  ${JSON.stringify(r.key)}:\n    ${JSON.stringify(r.blur)},`);
  fs.writeFileSync(
    BLUR_FILE,
    `/**\n` +
      ` * AUTO-GENERATED by scripts/generate-images.mjs â€” do not edit by hand.\n` +
      ` * Tiny base64 LQIP previews used as the next/image blurDataURL, so every\n` +
      ` * frame resolves out of a colour-correct blur instead of popping in.\n` +
      ` */\n` +
      `export const BLUR: Record<string, string> = {\n${lines.join("\n")}\n};\n`,
    "utf8",
  );
  console.log(`[AURUM] wrote ${path.relative(ROOT, BLUR_FILE)} (${results.length} entries)`);

  // ---- duplicate detection -------------------------------------------------
  const { createHash } = await import("node:crypto");
  const seen = new Map();
  let dupes = 0;
  for (const r of results) {
    const h = createHash("sha1").update(fs.readFileSync(path.join(OUT_DIR, r.file))).digest("hex");
    if (seen.has(h)) {
      console.log(`FAIL ${r.key} is byte-identical to ${seen.get(h)}`);
      dupes++;
    }
    seen.set(h, r.key);
  }

  const totalMB = results.reduce((s, r) => s + r.bytes, 0) / 1024 / 1024;
  console.log(
    `[AURUM] done â€” ${results.length} webp (${totalMB.toFixed(1)}MB), ` +
      `${results.length} preview jpg, ${failed} failing stats, ${dupes} duplicates`,
  );
  if (failed || dupes) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
