#!/usr/bin/env node
/**
 * AURUM — IMPORT SOURCE IMAGES
 * =============================================================================
 * Imports the photographic frames supplied in AURUM-INDIVIDUAL-IMAGES.pdf and
 * turns them into the site's asset set in /public/images.
 *
 * The PDF is a *catalogue*, not a delivery package: every frame is embedded at
 * only ~340px wide, and pages 7-15 have a caption bar burned into the bottom of
 * the picture. So this script:
 *
 *   1. reads the decoded raw RGB dumped by the extract step,
 *   2. detects and removes the burned-in caption bar,
 *   3. crops to each asset's target aspect ratio (art-directed per key),
 *   4. upscales with lanczos3 + a restrained unsharp mask,
 *   5. applies the shared AURUM grade so the set reads as one film,
 *   6. writes /public/images/<file>.webp, preview JPEGs and the LQIP map.
 *
 * Run:  node scripts/import-source-images.mjs
 * =============================================================================
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = process.env.AURUM_SRC_DIR;
const OUT_DIR = path.join(ROOT, "public", "images");
const PREVIEW_DIR = path.join(OUT_DIR, "preview");
const MANIFEST = path.join(ROOT, "src", "lib", "images.ts");
const BLUR_FILE = path.join(ROOT, "src", "lib", "image-blur.ts");

if (!SRC_DIR) {
  console.error("Set AURUM_SRC_DIR to the folder holding srcNN.raw + meta.json");
  process.exit(1);
}

/* ---------------------------------------------------------------- manifest */

function readManifest() {
  const txt = fs.readFileSync(MANIFEST, "utf8");
  const out = [];
  const re = /\{\s*key:\s*"([^"]+)",[\s\S]*?file:\s*"([^"]+)",[\s\S]*?width:\s*(\d+),\s*height:\s*(\d+),/g;
  let m;
  while ((m = re.exec(txt))) {
    out.push({ key: m[1], file: m[2], width: +m[3], height: +m[4] });
  }
  return out;
}

/* ------------------------------------------------------ caption bar removal */

/**
 * The caption bar is a solid near-black plate with thin light type on it, so
 * the reliable signal is not "how dark is this row" (a night sky is dark too)
 * but "what FRACTION of this row is crushed to black". On a bar that runs
 * ~0.75-0.95; on real photography it is far lower even in the shadows.
 */
function detectBar(buf, w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let black = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const v = buf[i] * 0.299 + buf[i + 1] * 0.587 + buf[i + 2] * 0.114;
      if (v < 30) black++;
    }
    rows.push(black / w);
  }

  // Walk up from the bottom. A line of caption type drops the black fraction
  // to ~0.5 for its whole height, so the run has to tolerate a generous gap —
  // measured at 14 rows against these frames — or it stops inside the bar.
  let barTop = h;
  let gap = 0;
  for (let y = h - 1; y >= Math.floor(h * 0.5); y--) {
    if (rows[y] >= 0.62) { barTop = y; gap = 0; }
    else if (++gap > 14) break;
  }

  // Creep up over the bar's anti-aliased top edge, which lands around 0.4 —
  // but ONLY when there is a hard edge just above it (the fraction collapses
  // below 0.3 within a few rows). Without that guard this walks straight up
  // into legitimately dark photography, e.g. the forest canopy on p13.
  const hardEdgeAbove = (y) => {
    for (let k = 1; k <= 5; k++) if (y - k >= 0 && rows[y - k] < 0.3) return true;
    return false;
  };
  for (let k = 0; k < 10 && barTop > 1 && rows[barTop - 1] > 0.35; k++) {
    if (!hardEdgeAbove(barTop - 1)) break;
    barTop--;
  }

  const inBar = rows.slice(barTop).reduce((s, v) => s + v, 0) / Math.max(1, h - barTop);
  const cropH = h - barTop;
  const frac = cropH / h;
  const trusted = frac > 0.02 && frac < 0.45 && inBar >= 0.72;
  return { barTop, cropH: trusted ? cropH : 0, frac, inBar, trusted };
}

/* ------------------------------------------------------------------ mapping
 * 15 supplied frames -> 23 manifest slots. Where a slot has no dedicated
 * frame, it is an art-directed CROP of a related one (`gravity` + `zoom` make
 * it a genuinely different picture, not the same frame twice). Every derived
 * slot is flagged so IMAGE-ASSETS.md can list it for replacement.
 */
const MAP = {
  hero:                   { page: 1 },
  nature:                 { page: 2 },
  "residence-cliff":      { page: 3 },
  "residence-forest":     { page: 4 },
  "residence-ocean":      { page: 5 },
  "residence-desert":     { page: 6 },
  "residence-mountains":  { page: 7 },
  "experience-spa":       { page: 8 },
  "experience-yacht":     { page: 9 },
  "architecture-01":      { page: 10 },
  "architecture-02":      { page: 11 },
  "architecture-03":      { page: 12 },
  sustainability:         { page: 13 },
  testimonial:            { page: 14 },
  contact:                { page: 15 },

  // Derived crops — a different framing of a related frame.
  // `rect` is normalised {x,y,w,h} against the bar-stripped frame, used where
  // the crop has to land on a specific subject rather than a generic corner.
  "hero-reveal":          { page: 6,  zoom: 1.45, gravity: "east",  derived: true },
  "experience-dining":    { page: 10, zoom: 1.55, gravity: "east",  derived: true },
  "experience-cultural":  { page: 2,  zoom: 1.5,  gravity: "west",  derived: true },
  "architecture-04":      { page: 11, zoom: 1.5,  gravity: "south", derived: true },
  "architecture-05":      { page: 6,  zoom: 1.6,  gravity: "north", derived: true },
  "architecture-06":      { page: 7,  zoom: 1.4,  gravity: "north", derived: true },
  // The subject is the woman at frame left — a generic "north" crop lands on
  // empty mountains and reads as a smear, so target her explicitly.
  "testimonial-portrait": { page: 14, rect: { x: 0.04, y: 0.0, w: 0.36, h: 0.86 }, derived: true },
  final:                  { page: 3,  zoom: 1.3,  gravity: "west",  derived: true, cool: true },
};

/* -------------------------------------------------------------------- grade
 * A single restrained pass so photographic frames sit in the same world as the
 * dark editorial UI: cool the shadows, hold the warm key light, lift contrast
 * a touch. Deliberately gentle — the CSS grade in ImageFrame does the rest.
 */
function grade(pipe, { cool = false } = {}) {
  // NOTE: never use sharp's .tint() here — it converts to greyscale first and
  // would throw away the photography's colour entirely.
  //
  // BOLD, not moody. These frames carry the page on their own, so push
  // saturation and contrast up rather than crushing them into the background.
  // The browser adds no dark scrim on top any more, so what is baked here is
  // what the visitor sees.
  return pipe
    .modulate({
      brightness: cool ? 0.96 : 1.05,
      saturation: cool ? 1.02 : 1.24,
    })
    .linear(
      cool ? [1.1, 1.11, 1.2] : [1.16, 1.14, 1.12],
      cool ? [-14, -13, -8] : [-16, -15, -13],
    )
    .gamma(1.04);
}

/* --------------------------------------------------------------------- main */

const meta = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "meta.json"), "utf8"));
const byPage = Object.fromEntries(meta.map((m) => [m.page, m]));
const assets = readManifest();

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const blur = {};
const report = [];

for (const a of assets) {
  const spec = MAP[a.key];
  if (!spec) { console.warn(`  !! no source mapped for ${a.key}`); continue; }
  const src = byPage[spec.page];
  const raw = fs.readFileSync(path.join(SRC_DIR, src.file));
  const { w, h } = src;

  const bar = detectBar(raw, w, h);
  // Stage 1: strip the caption bar, plus a 1% bite off each vertical edge —
  // several PDF frames carry a bright one-pixel sliver of the page behind them.
  // Every frame also carries a 1-4px black rule along its bottom edge from the
  // PDF layout, so take at least 2% off the bottom whether or not a bar was found.
  const inset = Math.round(w * 0.01);
  const keepH = h - Math.max(bar.cropH, Math.ceil(h * 0.02));
  const keepW = w - inset * 2;

  let base = sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .extract({ left: inset, top: 0, width: keepW, height: keepH });

  // Stage 2: for derived slots, punch in so the crop is a different picture.
  if (spec.rect) {
    const r = spec.rect;
    const cw = Math.max(24, Math.round(keepW * r.w));
    const chh = Math.max(24, Math.round(keepH * r.h));
    const left = Math.min(keepW - cw, Math.max(0, Math.round(keepW * r.x)));
    const top = Math.min(keepH - chh, Math.max(0, Math.round(keepH * r.y)));
    base = sharp(await base.png().toBuffer()).extract({
      left, top, width: cw, height: chh,
    });
  } else if (spec.zoom && spec.zoom > 1) {
    const cw = Math.max(24, Math.round(keepW / spec.zoom));
    const chh = Math.max(24, Math.round(keepH / spec.zoom));
    let left = Math.round((keepW - cw) / 2);
    let top = Math.round((keepH - chh) / 2);
    if (spec.gravity === "west") left = 0;
    if (spec.gravity === "east") left = keepW - cw;
    if (spec.gravity === "north") top = 0;
    if (spec.gravity === "south") top = keepH - chh;
    base = sharp(await base.png().toBuffer()).extract({
      left, top, width: cw, height: chh,
    });
  }

  // Stage 3: crop to the target ASPECT at native resolution first, so the
  // upscaler is never asked to invent pixels it will then throw away.
  const nat = await base.png().toBuffer();
  const nm = await sharp(nat).metadata();
  const targetAR = a.width / a.height;
  const natAR = (nm.width ?? 1) / (nm.height ?? 1);
  let cw = nm.width ?? 1;
  let chh = nm.height ?? 1;
  if (natAR > targetAR) cw = Math.round(chh * targetAR);
  else chh = Math.round(cw / targetAR);

  let buf = await sharp(nat)
    .extract({
      left: Math.round(((nm.width ?? 1) - cw) / 2),
      top: Math.round(((nm.height ?? 1) - chh) / 2),
      width: cw,
      height: chh,
    })
    .png()
    .toBuffer();

  // Stage 4: PROGRESSIVE upscale. A single 6x lanczos jump turns a 330px frame
  // to mush; stepping at <=1.5x with a light sharpen between passes keeps edge
  // structure intact and is the single biggest quality win available here.
  let curW = cw;
  while (curW < a.width) {
    const nextW = Math.min(a.width, Math.round(curW * 1.5));
    const nextH = Math.round(nextW / targetAR);
    buf = await sharp(buf)
      .resize(nextW, nextH, { kernel: "lanczos3" })
      .sharpen({ sigma: 0.7, m1: 0.35, m2: 0.6 })
      .png()
      .toBuffer();
    curW = nextW;
  }

  // Stage 5: grade, then a final restrained pass. Heavy sharpening at this
  // magnification only produces halos, so most of it happened between steps.
  let pipe = sharp(buf).resize(a.width, a.height, { fit: "fill", kernel: "lanczos3" });
  pipe = grade(pipe, { cool: spec.cool });
  pipe = pipe.sharpen({ sigma: 0.9, m1: 0.3, m2: 0.55 });

  // Stage 6: film grain. Real 35mm grain is what lets an upscaled frame read as
  // photographed rather than soft — it gives the eye high-frequency detail to
  // latch onto exactly where the upscaler has none. Neutral mean so `overlay`
  // does not shift exposure.
  const grain = await sharp({
    create: {
      width: a.width,
      height: a.height,
      channels: 3,
      noise: { type: "gaussian", mean: 128, sigma: 9 },
    },
  })
    .png()
    .toBuffer();

  const outBuf = await sharp(await pipe.png().toBuffer())
    .composite([{ input: grain, blend: "overlay" }])
    .webp({ quality: 92, effort: 6 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, a.file), outBuf);

  await sharp(outBuf).resize(1000).jpeg({ quality: 78 }).toFile(path.join(PREVIEW_DIR, `${a.key}.jpg`));

  const lq = await sharp(outBuf).resize(24).webp({ quality: 40 }).toBuffer();
  blur[a.key] = `data:image/webp;base64,${lq.toString("base64")}`;

  const st = await sharp(outBuf).stats();
  const mean = (st.channels.reduce((s, c) => s + c.mean, 0) / st.channels.length).toFixed(1);
  const sd = (st.channels.reduce((s, c) => s + c.stdev, 0) / st.channels.length).toFixed(1);
  report.push({ key: a.key, page: spec.page, derived: !!spec.derived, bar: bar.cropH, kb: Math.round(outBuf.length / 1024), mean, sd });
  console.log(
    `  ${a.key.padEnd(22)} p${String(spec.page).padStart(2)}  bar-${String(bar.cropH).padStart(3)}px  ` +
    `${a.width}x${a.height}  ${String(Math.round(outBuf.length / 1024)).padStart(4)}KB  mean=${mean} sd=${sd}` +
    (spec.derived ? "  [derived crop]" : ""),
  );
}

fs.writeFileSync(
  BLUR_FILE,
  `/**\n * AUTO-GENERATED by scripts/import-source-images.mjs — do not edit by hand.\n` +
    ` * Tiny base64 LQIP previews used as the next/image blurDataURL, so every\n` +
    ` * frame resolves out of a colour-correct blur instead of popping in.\n */\n` +
    `export const BLUR: Record<string, string> = ${JSON.stringify(blur, null, 2)};\n`,
);

const bad = report.filter((r) => +r.sd < 12 || +r.mean < 8 || +r.mean > 210);
console.log(`\n${report.length} assets written. ${report.filter((r) => r.derived).length} are derived crops.`);
console.log(bad.length ? `SUSPECT: ${bad.map((b) => b.key).join(", ")}` : "All frames pass the tone/contrast check.");
