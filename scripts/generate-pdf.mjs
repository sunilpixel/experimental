#!/usr/bin/env node
/**
 * AURUM — IMAGE ASSET CATALOGUE (PDF)
 * =============================================================================
 * Builds AURUM-IMAGE-ASSETS.pdf: a designed A4-landscape catalogue of every
 * image slot on the site, for the art director who will replace them.
 *
 *   cover  +  contents  +  one page per asset  +  closing workflow page
 *
 * It READS ONLY. It never touches public/images — the preview JPEGs written by
 * scripts/import-source-images.mjs are placed into the PDF as-is, contained to
 * their real aspect ratio (measured with sharp) so nothing is ever distorted.
 *
 * Fonts are pdfkit's built-in Helvetica / Helvetica-Bold / Helvetica-Oblique /
 * Courier. Nothing is embedded, nothing is fetched.
 *
 * Run:  node scripts/generate-pdf.mjs      (or: npm run catalog)
 * =============================================================================
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "src", "lib", "images.ts");
const PREVIEW_DIR = path.join(ROOT, "public", "images", "preview");
const OUT = path.join(ROOT, "AURUM-IMAGE-ASSETS.pdf");

/* ------------------------------------------------------------------ palette
 * Straight from the @theme block in src/app/globals.css. */
const INK = "#05060a";
const OBSIDIAN = "#0a0b10";
const GRAPHITE = "#14161c";
const SLATE = "#2a2d36";
const ASH = "#6f6b62";
const BONE = "#b9b3a7";
const IVORY = "#f2efe8";
const PORCELAIN = "#faf8f4";
const GOLD = "#c8a76a";
const GOLD_BRIGHT = "#e8d3a3";
const GOLD_DEEP = "#8f7440";

const SWATCHES = [
  ["ink", INK],
  ["obsidian", OBSIDIAN],
  ["graphite", GRAPHITE],
  ["slate", SLATE],
  ["ash", ASH],
  ["bone", BONE],
  ["ivory", IVORY],
  ["porcelain", PORCELAIN],
  ["gold", GOLD],
  ["gold-bright", GOLD_BRIGHT],
  ["gold-deep", GOLD_DEEP],
];

/* --------------------------------------------------------------- geometry */
const W = 841.89; // A4 landscape
const H = 595.28;
const M = 48;

/* ------------------------------------------------------------------ source
 * Mirrors the MAP in scripts/import-source-images.mjs: which page of the
 * supplied AURUM-INDIVIDUAL-IMAGES.pdf each slot was cut from, and whether the
 * slot is a derived crop (no dedicated source frame of its own). */
const SOURCE = {
  hero: { page: 1 },
  nature: { page: 2 },
  "residence-cliff": { page: 3 },
  "residence-forest": { page: 4 },
  "residence-ocean": { page: 5 },
  "residence-desert": { page: 6 },
  "residence-mountains": { page: 7 },
  "experience-spa": { page: 8 },
  "experience-yacht": { page: 9 },
  "architecture-01": { page: 10 },
  "architecture-02": { page: 11 },
  "architecture-03": { page: 12 },
  sustainability: { page: 13 },
  testimonial: { page: 14 },
  contact: { page: 15 },

  "hero-reveal": { page: 6, derived: true, how: "1.45x crop, east" },
  "experience-dining": { page: 10, derived: true, how: "1.55x crop, east" },
  "experience-cultural": { page: 2, derived: true, how: "1.5x crop, west" },
  "architecture-04": { page: 11, derived: true, how: "1.5x crop, south" },
  "architecture-05": { page: 6, derived: true, how: "1.6x crop, north" },
  "architecture-06": { page: 7, derived: true, how: "1.4x crop, north" },
  "testimonial-portrait": { page: 14, derived: true, how: "targeted crop, figure at frame left" },
  final: { page: 3, derived: true, how: "1.3x crop, west, graded cool" },
};

/* ----------------------------------------------------------- text hygiene
 * The built-in Helvetica/Courier are WinAnsi-encoded, so a handful of the
 * manifest's typographic characters have to be folded down before they reach
 * pdfkit or they render as notdef boxes. */
const FOLD = [
  ["◆", "•"], // ◆ black diamond -> bullet
  ["●", "•"], // ● black circle  -> bullet
  ["→", ">"],
  ["≥", ">="],
  ["≤", "<="],
  ["…", "..."],
  [" ", " "],
];
// Newlines survive — pdfkit honours them as hard breaks inside a wrapped block.
const KEEP = /[^\n\x20-\x7E¡-ÿ–—‘’“”•]/g;

function t(value) {
  let s = String(value ?? "");
  for (const [from, to] of FOLD) s = s.split(from).join(to);
  return s.replace(KEEP, "-");
}

/* ---------------------------------------------------------------- manifest
 * Parsed straight out of src/lib/images.ts so the catalogue can never drift
 * from the code. `recipe` and `seed` are deliberately ignored — they are
 * vestigial fields from a retired procedural placeholder system. */
function readManifest() {
  const txt = fs.readFileSync(MANIFEST, "utf8");
  const open = txt.indexOf("IMAGE_ASSETS: ImageAsset[] = [");
  if (open < 0) throw new Error("Could not find IMAGE_ASSETS in " + MANIFEST);
  const close = txt.indexOf("\n];", open);
  if (close < 0) throw new Error("Could not find the end of IMAGE_ASSETS");
  const body = txt.slice(open, close);

  const marks = [];
  const kre = /^\s{4}key:\s*"([^"]+)",/gm;
  let m;
  while ((m = kre.exec(body))) marks.push({ key: m[1], at: m.index });
  if (!marks.length) throw new Error("No manifest entries parsed");

  const str = (chunk, field) => {
    const hit = chunk.match(new RegExp(field + ':\\s*"((?:[^"\\\\]|\\\\.)*)"'));
    return hit ? hit[1].replace(/\\"/g, '"') : "";
  };
  const num = (chunk, field) => {
    const hit = chunk.match(new RegExp(field + ":\\s*(\\d+)"));
    return hit ? Number(hit[1]) : 0;
  };

  return marks.map((mark, i) => {
    const chunk = body.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : body.length);
    return {
      key: mark.key,
      file: str(chunk, "file"),
      alt: str(chunk, "alt"),
      section: str(chunk, "section"),
      purpose: str(chunk, "purpose"),
      ratio: str(chunk, "ratio"),
      prompt: str(chunk, "prompt"),
      width: num(chunk, "width"),
      height: num(chunk, "height"),
    };
  });
}

/* Chapter grouping for the contents page: "03 - Residences" and
 * "01 - Hero (circle reveal)" fold to their leading code, order preserved. */
function chapterOf(section) {
  const parts = section.split("—");
  const code = (parts[0] || "").trim();
  const rest = (parts[1] || "").trim().replace(/\s*\(.*\)\s*$/, "");
  return { code, title: rest, label: `${code} — ${rest}` };
}

function sourceLine(key) {
  const s = SOURCE[key];
  if (!s) return "Unmapped";
  return s.derived
    ? `Derived crop of page ${s.page} of the supplied PDF (${s.how})`
    : `Page ${s.page} of the supplied PDF`;
}

function replacementLine(a) {
  const s = SOURCE[a.key] || {};
  const lines = [
    `Deliver WebP at quality 90, ${a.width} x ${a.height} or larger, named exactly "${a.file}", and drop it into public/images/ over the placeholder. The manifest key "${a.key}" already points at that filename, so nothing else needs editing.`,
    `Hold the ${a.ratio} ratio - ImageFrame renders with fill + object-cover, so a wrong ratio silently crops rather than breaking layout. If the ratio must change, update width and height in src/lib/images.ts.`,
  ];
  lines.push(
    s.derived
      ? "PRIORITY: this slot has no dedicated source frame. It needs a genuinely new photograph, not a re-crop."
      : "The current file is upscaled from a ~340px catalogue thumbnail. Supply the true high-resolution original.",
  );
  return lines.join("\n\n");
}

/* ------------------------------------------------------------ draw helpers */
function rule(doc, x, y, w, color = GOLD, thickness = 0.7) {
  doc.save().lineWidth(thickness).strokeColor(color)
    .moveTo(x, y).lineTo(x + w, y).stroke().restore();
}

function label(doc, x, y, text, w) {
  doc.font("Helvetica-Bold").fontSize(6.2).fillColor(GOLD)
    .text(t(text).toUpperCase(), x, y, { characterSpacing: 1.7, width: w });
  return doc.y;
}

function field(doc, x, y, w, name, value, opts = {}) {
  const after = label(doc, x, y, name, w);
  doc.font(opts.mono ? "Courier" : opts.font || "Helvetica")
    .fontSize(opts.size || 9.4)
    .fillColor(opts.color || IVORY)
    .text(t(value), x, after + 2.5, { width: w, lineGap: opts.lineGap ?? 1.6 });
  return doc.y + (opts.gap ?? 10);
}

function runningHead(doc, right) {
  doc.font("Helvetica-Bold").fontSize(6.6).fillColor(GOLD)
    .text("AURUM", M, 40, { characterSpacing: 3.4 });
  doc.font("Helvetica").fontSize(6.6).fillColor(ASH)
    .text(t(right).toUpperCase(), M, 40, {
      characterSpacing: 1.8, width: W - M * 2, align: "right",
    });
  rule(doc, M, 56, W - M * 2, SLATE, 0.6);
}

function footer(doc, indexText) {
  rule(doc, M, 556, 42, GOLD, 1.1);
  doc.font("Helvetica").fontSize(7.4).fillColor(ASH)
    .text(t(indexText), M, 550, { width: W - M * 2, align: "right", characterSpacing: 1.4 });
}

/* -------------------------------------------------------------------- main */
async function main() {
  const assets = readManifest();

  const missing = assets.filter((a) => !SOURCE[a.key]);
  if (missing.length) {
    throw new Error("No source mapping for: " + missing.map((a) => a.key).join(", "));
  }

  // Measure every preview up front so the layout pass stays synchronous and
  // every image can be contained to its real aspect ratio.
  const previews = new Map();
  for (const a of assets) {
    const p = path.join(PREVIEW_DIR, `${a.key}.jpg`);
    if (!fs.existsSync(p)) {
      console.warn(`  !! missing preview for ${a.key} — page will run without it`);
      continue;
    }
    const meta = await sharp(p).metadata();
    previews.set(a.key, { path: p, w: meta.width, h: meta.height });
  }

  const derivedCount = assets.filter((a) => SOURCE[a.key].derived).length;
  const suppliedCount = assets.length - derivedCount;

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    autoFirstPage: false,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: "AURUM — Image Asset Catalogue",
      Author: "AURUM",
      Subject: `${assets.length} image slots, all placeholders pending real photography`,
      Keywords: "aurum, image assets, art direction, replacement",
    },
  });

  let pages = 0;
  doc.on("pageAdded", () => {
    pages += 1;
    doc.rect(0, 0, W, H).fill(INK); // ink painted explicitly on EVERY page
  });

  const done = new Promise((resolve, reject) => {
    const out = fs.createWriteStream(OUT);
    out.on("finish", resolve);
    out.on("error", reject);
    doc.on("error", reject);
    doc.pipe(out);
  });

  /* ------------------------------------------------------------------ cover */
  doc.addPage();

  rule(doc, M, 62, W - M * 2, SLATE, 0.6);
  doc.font("Helvetica").fontSize(7).fillColor(ASH)
    .text("IMAGE ASSET CATALOGUE", M, 46, { characterSpacing: 2.4 });
  doc.font("Helvetica").fontSize(7).fillColor(ASH)
    .text(new Date().toISOString().slice(0, 10), M, 46, {
      width: W - M * 2, align: "right", characterSpacing: 1.6,
    });

  doc.font("Helvetica-Bold").fontSize(96).fillColor(IVORY)
    .text("AURUM", M - 20, 150, {
      width: W - M * 2, align: "center", characterSpacing: 40,
    });

  rule(doc, W / 2 - 130, 288, 260, GOLD, 1.2);

  doc.font("Helvetica").fontSize(13).fillColor(GOLD_BRIGHT)
    .text("IMAGE ASSET CATALOGUE", M - 4, 308, {
      width: W - M * 2, align: "center", characterSpacing: 7.5,
    });

  doc.font("Helvetica").fontSize(8.6).fillColor(BONE)
    .text(
      t(`${assets.length} ASSETS · ${suppliedCount} SUPPLIED FRAMES · ${derivedCount} DERIVED CROPS`),
      M - 2, 334, { width: W - M * 2, align: "center", characterSpacing: 3 },
    );

  // Plain-language status band.
  const bandX = M + 74;
  const bandW = W - (M + 74) * 2;
  const bandY = 396;
  const bandH = 104;
  doc.save().rect(bandX, bandY, bandW, bandH).fill(GRAPHITE).restore();
  doc.save().rect(bandX, bandY, 2.4, bandH).fill(GOLD).restore();

  doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD)
    .text("STATUS", bandX + 22, bandY + 17, { characterSpacing: 2.6 });
  doc.font("Helvetica").fontSize(9.6).fillColor(IVORY)
    .text(
      t(
        "Every asset in this catalogue is a placeholder. All of them are upscaled from roughly 340px frames " +
        "embedded in the supplied AURUM-INDIVIDUAL-IMAGES.pdf, which is a catalogue rather than a delivery " +
        `package. ${derivedCount} of the ${assets.length} slots have no source frame at all and are art-directed crops of a ` +
        "related picture. They read acceptably at the sizes the site uses, but they are not true high-resolution " +
        "photography. Every file needs replacing with the real original before any public launch.",
      ),
      bandX + 22, bandY + 33, { width: bandW - 44, lineGap: 2.2 },
    );

  doc.font("Courier").fontSize(7.4).fillColor(ASH)
    .text("public/images/  ·  src/lib/images.ts", M, 540, { width: W - M * 2, align: "center" });

  /* --------------------------------------------------------------- contents */
  doc.addPage();
  runningHead(doc, "Contents");

  doc.font("Helvetica-Bold").fontSize(26).fillColor(IVORY)
    .text("CONTENTS", M, 84, { characterSpacing: 6 });
  rule(doc, M, 124, 120, GOLD, 1.1);

  const groups = [];
  for (const a of assets) {
    const ch = chapterOf(a.section);
    let g = groups.find((x) => x.code === ch.code);
    if (!g) {
      g = { code: ch.code, label: ch.label, items: [] };
      groups.push(g);
    }
    g.items.push(a);
  }

  // Page numbers: cover(1) + contents(2) + assets start at 3.
  const pageOf = new Map(assets.map((a, i) => [a.key, i + 3]));

  const colX = [M, 448];
  const colW = 346;
  let col = 0;
  let cy = 156;
  const CONTENTS_BOTTOM = 534;

  for (const g of groups) {
    const blockH = 20 + g.items.length * 15 + 12;
    if (cy + blockH > CONTENTS_BOTTOM && col === 0) {
      col = 1;
      cy = 156;
    }
    const x = colX[col];

    doc.font("Helvetica-Bold").fontSize(7.4).fillColor(GOLD)
      .text(t(g.label).toUpperCase(), x, cy, { characterSpacing: 2.4, width: colW });
    cy = doc.y + 4;
    rule(doc, x, cy, colW, SLATE, 0.5);
    cy += 7;

    for (const a of g.items) {
      const flag = SOURCE[a.key].derived ? "  • derived" : "";
      doc.font("Courier").fontSize(8.6).fillColor(IVORY)
        .text(t(a.file), x, cy, { width: colW - 116, lineBreak: false });
      doc.font("Helvetica").fontSize(7.6).fillColor(SOURCE[a.key].derived ? GOLD_DEEP : ASH)
        .text(t(flag), x + colW - 150, cy + 0.8, { width: 92, lineBreak: false });
      doc.font("Helvetica").fontSize(8.4).fillColor(ASH)
        .text(String(pageOf.get(a.key)), x, cy, { width: colW, align: "right" });
      cy += 15;
    }
    cy += 12;
  }

  doc.font("Helvetica-Oblique").fontSize(8).fillColor(ASH)
    .text(
      t(`• derived  =  no dedicated source frame; an art-directed crop of a related picture. ${derivedCount} of ${assets.length}.`),
      M, 548, { width: W - M * 2 },
    );

  /* ------------------------------------------------------------ asset pages */
  const IMG_X = M;
  const IMG_Y = 78;
  const IMG_W = 372;
  const IMG_H = 424;
  const SX = 456;
  const SW = W - M - SX;

  assets.forEach((a, i) => {
    const src = SOURCE[a.key];
    doc.addPage();
    runningHead(doc, a.section);

    // --- preview, contained, never distorted -------------------------------
    const p = previews.get(a.key);
    if (p) {
      const scale = Math.min(IMG_W / p.w, IMG_H / p.h);
      const dw = p.w * scale;
      const dh = p.h * scale;
      const dx = IMG_X + (IMG_W - dw) / 2;
      const dy = IMG_Y + (IMG_H - dh) / 2;
      doc.save().rect(dx - 5, dy - 5, dw + 10, dh + 10).fill(OBSIDIAN).restore();
      doc.image(p.path, dx, dy, { width: dw, height: dh });
      doc.save().lineWidth(0.6).strokeColor(GOLD_DEEP)
        .rect(dx, dy, dw, dh).stroke().restore();
    } else {
      doc.save().rect(IMG_X, IMG_Y, IMG_W, IMG_H).fill(GRAPHITE).restore();
      doc.font("Helvetica").fontSize(9).fillColor(ASH)
        .text("preview unavailable", IMG_X, IMG_Y + IMG_H / 2, { width: IMG_W, align: "center" });
    }

    doc.font("Helvetica-Oblique").fontSize(7.8).fillColor(BONE)
      .text(t(a.alt), IMG_X, 512, { width: IMG_W, lineGap: 1.4 });

    // --- spec column -------------------------------------------------------
    doc.font("Helvetica-Bold").fontSize(19).fillColor(IVORY)
      .text(t(a.key.replace(/-/g, " ").toUpperCase()), SX, 76, {
        characterSpacing: 2.2, width: SW,
      });
    let y = doc.y + 6;
    rule(doc, SX, y, SW, GOLD, 1.1);
    y += 12;

    if (src.derived) {
      doc.save().rect(SX, y, SW, 15).fill(GRAPHITE).restore();
      doc.font("Helvetica-Bold").fontSize(6.6).fillColor(GOLD_BRIGHT)
        .text("DERIVED CROP — NO SOURCE FRAME OF ITS OWN", SX + 7, y + 4.6, {
          characterSpacing: 1.5, width: SW - 14,
        });
      y += 24;
    }

    y = field(doc, SX, y, SW, "Filename", a.file, { mono: true, size: 10 });
    y = field(doc, SX, y, SW, "Section", a.section);
    y = field(doc, SX, y, SW, "Dimensions", `${a.width} × ${a.height} px`);
    y = field(doc, SX, y, SW, "Aspect ratio", a.ratio);
    y = field(doc, SX, y, SW, "Source", sourceLine(a.key), { size: 9 });
    y = field(doc, SX, y, SW, "Purpose", a.purpose, { size: 9, lineGap: 1.8 });
    y = field(doc, SX, y, SW, "Generation prompt", a.prompt, {
      size: 8.8, lineGap: 2.4, color: GOLD_BRIGHT, font: "Helvetica-Oblique",
    });
    y = field(doc, SX, y, SW, "Replacement instructions", replacementLine(a), {
      size: 8.2, lineGap: 2.2, color: BONE, gap: 0,
    });

    if (y > 548) {
      console.warn(`  !! spec column overflows on ${a.key} (y=${y.toFixed(0)})`);
    }

    footer(doc, `${String(i + 1).padStart(2, "0")} / ${assets.length}`);
  });

  /* ---------------------------------------------------------------- closing */
  doc.addPage();
  runningHead(doc, "Replacement workflow");

  doc.font("Helvetica-Bold").fontSize(26).fillColor(IVORY)
    .text("REPLACING THESE ASSETS", M, 84, { characterSpacing: 5 });
  rule(doc, M, 124, 120, GOLD, 1.1);

  const steps = [
    ["01", "Shoot or generate the real frame", "Work from the GENERATION PROMPT on that asset's page. Match the aspect ratio exactly and meet or exceed the listed pixel dimensions from a true original - never an upscale."],
    ["02", "Grade it bold, not dark", "Raised saturation and contrast, one warm key light against cold ambient shadow. Do NOT darken. The site lays no dark scrim over photography any more, so what is in the file is what the visitor sees."],
    ["03", "Export WebP, quality 90", "Use the exact filename from the FILENAME line. Filenames are the contract between the file and the manifest."],
    ["04", "Drop it into public/images/", "Overwrite the placeholder in place. The manifest key already points at that filename, so no code change is needed."],
    ["05", "Only if the ratio changed", "Update width and height for that entry in src/lib/images.ts. ImageFrame renders with fill + object-cover, so a mismatched ratio silently crops instead of erroring."],
    ["06", "Do not re-run the import script", "scripts/import-source-images.mjs rewrites the whole of public/images and regenerates src/lib/image-blur.ts. Running it after you have dropped in real photography will destroy it."],
  ];

  let sy = 158;
  for (const [n, title, body] of steps) {
    doc.font("Helvetica-Bold").fontSize(16).fillColor(GOLD_DEEP)
      .text(n, M, sy - 2, { width: 42 });
    doc.font("Helvetica-Bold").fontSize(10.4).fillColor(IVORY)
      .text(t(title), M + 46, sy, { width: 480, characterSpacing: 0.4 });
    doc.font("Helvetica").fontSize(8.8).fillColor(BONE)
      .text(t(body), M + 46, doc.y + 2.5, { width: 480, lineGap: 1.8 });
    sy = doc.y + 13;
  }

  // Palette reference, right-hand column.
  const PX = 590;
  const PW = W - M - PX;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD)
    .text("SHARED PALETTE", PX, 158, { characterSpacing: 2.4, width: PW });
  rule(doc, PX, 172, PW, SLATE, 0.5);

  let py = 182;
  for (const [name, hex] of SWATCHES) {
    doc.save().rect(PX, py, 22, 11).fill(hex).restore();
    doc.save().lineWidth(0.4).strokeColor(SLATE).rect(PX, py, 22, 11).stroke().restore();
    doc.font("Helvetica").fontSize(7.4).fillColor(IVORY)
      .text(t(name), PX + 30, py + 2.2, { width: 78, lineBreak: false });
    doc.font("Courier").fontSize(7.4).fillColor(ASH)
      .text(hex, PX + 30, py + 2.2, { width: PW - 30, align: "right", lineBreak: false });
    py += 16;
  }

  doc.font("Helvetica-Oblique").fontSize(8).fillColor(BONE)
    .text(
      t("Replacements should be shot and graded bold and saturated with one warm key light - not darkened."),
      PX, py + 10, { width: PW, lineGap: 2 },
    );

  rule(doc, M, 540, W - M * 2, SLATE, 0.6);
  doc.font("Helvetica").fontSize(7.4).fillColor(ASH)
    .text(t("AURUM — IMAGE ASSET CATALOGUE"), M, 550, { characterSpacing: 2 });
  doc.font("Helvetica").fontSize(7.4).fillColor(ASH)
    .text(t(`${assets.length} assets · all pending replacement · see IMAGE-ASSETS.md`), M, 550, {
      width: W - M * 2, align: "right",
    });

  doc.end();
  await done;

  /* ------------------------------------------------------------- verify */
  const expected = 2 + assets.length + 1; // cover + contents + assets + closing
  const bytes = fs.statSync(OUT).size;
  const raw = fs.readFileSync(OUT, "latin1");
  const counted = (raw.match(/\/Type\s*\/Page(?![\w])/g) || []).length;

  const problems = [];
  if (pages !== expected) problems.push(`tracked ${pages} pages, expected ${expected}`);
  if (counted !== expected) problems.push(`/Type /Page count is ${counted}, expected ${expected}`);
  if (bytes < 300 * 1024) problems.push(`file is ${bytes} bytes, expected > 300KB`);

  console.log(`\n  ${path.relative(ROOT, OUT)}`);
  console.log(`  pages tracked  : ${pages}`);
  console.log(`  /Type /Page    : ${counted}`);
  console.log(`  expected       : ${expected}  (cover + contents + ${assets.length} assets + closing)`);
  console.log(`  size           : ${(bytes / 1024).toFixed(1)} KB`);
  console.log(`  assets         : ${assets.length}  (${suppliedCount} supplied, ${derivedCount} derived)`);

  if (problems.length) {
    throw new Error("Catalogue failed verification: " + problems.join("; "));
  }
  console.log("  OK — catalogue verified.\n");
}

main().catch((err) => {
  console.error("\n[AURUM] catalogue build failed:\n", err);
  process.exitCode = 1;
});
