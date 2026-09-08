/**
 * AURUM — fetch real photography from Pexels and build every site asset.
 *
 * Why this exists: the original assets were extracted from a catalogue PDF at
 * ~340x252px and upscaled 4-7x, so they carried no real detail. This script
 * pulls genuine high-resolution Pexels originals (~4000px) and DOWNSAMPLES them
 * to the published sizes, so every pixel we ship is real.
 *
 * Pexels content is free for commercial use without attribution, but the photo
 * id for every asset is recorded here and in src/lib/images.ts (`credit`) so the
 * provenance of each file stays traceable.
 *
 *   node scripts/fetch-pexels-images.mjs          # build everything
 *   node scripts/fetch-pexels-images.mjs hero     # rebuild single keys
 *
 * Writes: public/images/*.webp, public/images/preview/*.jpg, src/lib/image-blur.ts
 *
 * Downloaded originals are cached in node_modules/.cache/aurum-pexels. They are
 * ~40MB and must not live under public/ — anything there is served by Next and
 * shipped in the deployment — and node_modules is already gitignored.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/images");
const PREVIEW = path.join(OUT, "preview");
const SOURCE = path.join(ROOT, "node_modules/.cache/aurum-pexels");
const BLUR_TS = path.join(ROOT, "src/lib/image-blur.ts");

/** Target geometry per aspect ratio. Real photos, so these are honest sizes. */
// 4K class: every ratio carries 2160px on its short edge, so a portrait is as
// genuinely 4K as a landscape rather than 4K in name only.
const SHORTFALL = [];

const SIZES = {
  "16:9": [3840, 2160],
  "4:3": [3840, 2880],
  "3:4": [2880, 3840],
  "1:1": [3840, 3840],
  "8:5": [3840, 2400],
  "4:5": [3072, 3840],
};

/**
 * key -> chosen Pexels photo. `id` is the number at the end of the photo page
 * URL (https://www.pexels.com/photo/<slug>-<id>/). `note` records what the
 * frame actually shows — the alt text in images.ts describes the same thing.
 */
const MANIFEST = (() => {
  /* Single source of truth: the curators' picks (photo id, crop focus, what the
     frame actually shows) joined with the site manifest (filename, ratio). */
  const picks = fs
    .readdirSync(path.join(ROOT, "scripts/picks"))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/picks", f), "utf8")));

  const manifestTs = fs.readFileSync(path.join(ROOT, "src/lib/images.ts"), "utf8");
  const meta = {};
  const re = /\{\s*key:\s*"([^"]+)",\s*file:\s*"([^"]+)",[\s\S]*?ratio:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(manifestTs))) meta[m[1]] = { file: m[2], ratio: m[3] };

  return picks.map((p) => {
    const info = meta[p.key];
    if (!info) throw new Error(`pick "${p.key}" has no entry in src/lib/images.ts`);
    return { key: p.key, file: info.file, ratio: info.ratio, id: p.id, focus: p.focus || "centre", note: p.note || "", exposure: p.exposure };
  });
})();

/* The ORIGINAL file. Adding ?w= caps the WIDTH, so a 6016x4016 landscape comes
   back as 4000x2670 and can no longer fill a portrait slot — it silently
   shortfalls even though the original is enormous. Take the original and let
   sharp do every resize. */
const cdn = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
const page = (id) => `https://www.pexels.com/photo/${id}/`;

async function download(id) {
  const dest = path.join(SOURCE, `${id}.jpg`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50000) return dest;
  const res = await fetch(cdn(id));
  if (!res.ok) throw new Error(`pexels ${id}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50000)
    throw new Error(`pexels ${id}: suspiciously small (${buf.length} bytes)`);
  fs.writeFileSync(dest, buf);
  return dest;
}

/**
 * One shared grade so all 23 read as a single shoot: a touch brighter, richer
 * colour, a little more contrast. Restrained and bold — never dark or veiled.
 * NEVER use .tint(): it converts to greyscale first and destroys the colour.
 * No grain, no upscaling, no progressive resize steps — these are real photos.
 *
 * `saturation` was 1.12, which is inside the noise on this particular set: half
 * these frames are mist, snow, concrete and night, and they were landing on the
 * page reading grey. 1.34 is a real lift and still short of the point where the
 * gold-hour frames (experience-cultural, residence-desert) go orange.
 *
 * `modulate` scales chroma multiplicatively, so it does nothing whatever for a
 * pixel that has none. Three sources here are monochrome BEFORE we touch them —
 * see MONO below — and no grade can put colour back into them.
 */
const grade = (p, exposure = 1) =>
  p
    .modulate({ brightness: 1.02 * exposure, saturation: 1.34 })
    .linear([1.06, 1.05, 1.04], [-8, -8, -7])
    .gamma(1.02)
    .sharpen({ sigma: 0.6 });

async function build(entry) {
  let [w, h] = SIZES[entry.ratio];
  const src = await download(entry.id);

  const meta = await sharp(src).metadata();

  /**
   * NEVER upscale. The whole reason we moved to Pexels is that the previous
   * assets were 340px frames blown up 7x. If a source cannot fill the 4K slot
   * after its cover-crop, step the slot DOWN to the largest size that source
   * genuinely supports and say so — a smaller honest frame beats a large soft
   * one, and the shortfall is a signal to re-pick the photo.
   */
  const coverScale = Math.max(w / meta.width, h / meta.height);
  if (coverScale > 1) {
    const capped = [Math.round(w / coverScale), Math.round(h / coverScale)];
    console.warn(
      `  ! ${entry.key}: source ${meta.width}x${meta.height} cannot fill ${w}x${h}` +
        ` (would upscale x${coverScale.toFixed(2)}) -> capping at ${capped[0]}x${capped[1]}`,
    );
    SHORTFALL.push({ key: entry.key, id: entry.id, src: `${meta.width}x${meta.height}`, want: `${w}x${h}`, got: `${capped[0]}x${capped[1]}` });
    [w, h] = capped;
  }

  const position = entry.focus === "attention" ? sharp.strategy.attention : "centre";

  /**
   * One cover-crop per pipeline, sized directly to the output we want. sharp
   * applies only the LAST resize in a chain, so `.resize(w,h,cover).resize(1000)`
   * silently throws the crop away and emits the source aspect ratio — which
   * quietly gave every preview and every LQIP the wrong shape. Deriving each
   * size from the same aspect keeps the framing identical.
   */
  const framedAt = (outW) =>
    grade(
      sharp(src).resize(outW, Math.round((outW * h) / w), { fit: "cover", position }),
      entry.exposure ?? 1,
    );

  const webp = path.join(OUT, entry.file);
  await framedAt(w).webp({ quality: 92, effort: 6 }).toFile(webp);

  const jpg = path.join(PREVIEW, `${entry.key}.jpg`);
  await framedAt(1000).jpeg({ quality: 86 }).toFile(jpg);

  const blur = await framedAt(24).webp({ quality: 60 }).toBuffer();
  const blurDataURL = `data:image/webp;base64,${blur.toString("base64")}`;

  return { ...entry, width: w, height: h, webp, jpg, blurDataURL, source: `${meta.width}x${meta.height}` };
}

/**
 * Refuse to ship a frame that is flat, blown out, or a failed download.
 *
 * Deliberately NOT a per-channel mean band: several frames here are legitimately
 * monochromatic — a cistern under amber light or low sun through a timber screen
 * has a near-zero blue channel by nature, and that is the look we want. So the
 * exposure gate runs on perceptual luminance, with a floor on the brightest
 * channel to still catch an all-black frame.
 */
async function verify(built) {
  const problems = [];
  const notes = [];
  const meta = await sharp(built.webp).metadata();
  if (meta.width !== built.width || meta.height !== built.height)
    problems.push(`size ${meta.width}x${meta.height} != ${built.width}x${built.height}`);
  if (meta.format !== "webp") problems.push(`format ${meta.format}`);

  const stats = await sharp(built.webp).stats();
  const [r, g, b] = stats.channels.slice(0, 3);
  const luma = 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;
  const meanStdev = (r.stdev + g.stdev + b.stdev) / 3;
  const entropy = stats.entropy;

  if (luma < 10 || luma > 225) problems.push(`luma ${luma.toFixed(1)} outside 10-225`);

  // Highlight presence, not mean brightness, is what separates a real exposure
  // from a broken download. Several frames here are intentionally low-key — a
  // white hull on black water, a portrait lit by one warm edge — and their
  // channel MEANS are low by design while their highlights are fully present.
  const peak = Math.max(r.max, g.max, b.max);
  if (peak < 200) problems.push(`no real highlights (peak channel ${peak})`);

  // Detail gate. A failed download or a genuinely empty frame has both low
  // spatial variance AND low entropy; a calm moonlit sea has low variance but
  // plenty of real information, so it is allowed through on entropy.
  if (meanStdev < 25) {
    if (meanStdev >= 15 && entropy >= 5)
      notes.push(`low-contrast by design (stdev ${meanStdev.toFixed(1)}, entropy ${entropy.toFixed(2)})`);
    else problems.push(`flat frame: stdev ${meanStdev.toFixed(1)}, entropy ${entropy.toFixed(2)}`);
  }

  return {
    problems,
    notes,
    means: [r, g, b].map((c) => +c.mean.toFixed(1)),
    luma: +luma.toFixed(1),
    peak: Math.max(r.max, g.max, b.max),
    stdev: +meanStdev.toFixed(1),
    entropy: +entropy.toFixed(2),
    bytes: fs.statSync(built.webp).size,
  };
}

function writeBlurMap(built) {
  const body = built
    .map((b) => `  ${JSON.stringify(b.key)}: ${JSON.stringify(b.blurDataURL)},`)
    .join("\n");
  fs.writeFileSync(
    BLUR_TS,
    `// AUTO-GENERATED by scripts/fetch-pexels-images.mjs — do not edit by hand.
// 24px-wide WebP LQIP for every manifest key, inlined as a base64 data URI.

export const BLUR: Record<string, string> = {
${body}
};
`,
  );
}

async function main() {
  const only = process.argv.slice(2);
  for (const d of [OUT, PREVIEW, SOURCE]) fs.mkdirSync(d, { recursive: true });

  const targets = only.length ? MANIFEST.filter((m) => only.includes(m.key)) : MANIFEST;
  if (!targets.length) throw new Error(`no manifest keys matched: ${only.join(", ")}`);

  const built = [];
  const failures = [];

  for (const entry of targets) {
    const b = await build(entry);
    const v = await verify(b);
    b.verdict = v;
    built.push(b);
    if (v.problems.length) failures.push(`${entry.key}: ${v.problems.join("; ")}`);
    console.log(
      `${entry.key.padEnd(21)} #${String(entry.id).padEnd(9)} ${b.source} -> ${b.width}x${b.height}  ` +
        `luma ${String(v.luma).padStart(5)} stdev ${String(v.stdev).padStart(4)} entropy ${v.entropy}  ` +
        `${(v.bytes / 1024).toFixed(0).padStart(4)}KB  ${v.problems.length ? "FAIL" : "ok"}` +
        (v.notes.length ? `  (${v.notes.join("; ")})` : ""),
    );
  }

  // No two outputs may be byte-identical — that would mean a duplicated download.
  const seen = new Map();
  for (const b of built) {
    const digest = fs.readFileSync(b.webp).toString("base64");
    if (seen.has(digest)) failures.push(`${b.key} is byte-identical to ${seen.get(digest)}`);
    seen.set(digest, b.key);
  }

  if (only.length) {
    console.log("\npartial run — BLUR map left untouched; re-run with no args to regenerate");
  } else {
    if (built.length !== MANIFEST.length)
      throw new Error(`built ${built.length} of ${MANIFEST.length} manifest keys`);
    writeBlurMap(built);
    console.log(`\nwrote ${path.relative(ROOT, BLUR_TS)} (${built.length} keys)`);
  }

  console.log("\nprovenance:");
  for (const b of built) console.log(`  ${b.key.padEnd(21)} Pexels #${String(b.id).padEnd(9)} ${page(b.id)}`);

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`\nAll ${built.length} assets verified.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

if (SHORTFALL.length) {
  console.log(`
${SHORTFALL.length} slot(s) could not reach the 4K target from their source:`);
  for (const s2 of SHORTFALL) {
    console.log(`  ${s2.key.padEnd(22)} Pexels #${s2.id}  src ${s2.src}  want ${s2.want}  got ${s2.got}`);
  }
  console.log("Re-pick these with a larger original to hit full 4K.");
}
