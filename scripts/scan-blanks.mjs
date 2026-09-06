/**
 * AURUM — blank sweep.
 *
 * Walks the whole document, screenshots each step, and measures how much of the
 * viewport is actually carrying image. Reports every stretch that renders as
 * near-empty ink, mapped back to the chapter that owns it, so "it goes blank in
 * lots of places" becomes a list of exact scroll positions.
 *
 *   node scripts/scan-blanks.mjs            # 60 steps
 *   node scripts/scan-blanks.mjs 120        # finer
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots", "blanks");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const STEPS = Number(process.argv[2] || 60);

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});

await page.goto(process.env.AURUM_URL || "http://localhost:3000", {
  waitUntil: "load",
  timeout: 120000,
});
await page
  .waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 30000 })
  .catch(() => console.warn("! preloader never signalled"));
await page.waitForTimeout(2500);

const meta = await page.evaluate(() => ({
  docH: document.body.scrollHeight,
  vh: window.innerHeight,
  chapters: [...document.querySelectorAll("[data-chapter]")].map((el) => ({
    id: el.dataset.chapter,
    top: el.getBoundingClientRect().top + window.scrollY,
    h: el.offsetHeight,
  })),
}));

const maxY = meta.docH - meta.vh;
const chapterAt = (y) => {
  const mid = y + meta.vh / 2;
  const c = meta.chapters.filter((c) => mid >= c.top && mid < c.top + c.h).pop();
  return c ? c.id : "-";
};

console.log(`document ${meta.docH}px, scanning ${STEPS} steps\n`);

const rows = [];
for (let i = 0; i <= STEPS; i++) {
  const y = Math.round((i / STEPS) * maxY);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(700);
  const buf = await page.screenshot();
  const st = await sharp(buf).stats();
  const mean = st.channels.reduce((s, c) => s + c.mean, 0) / st.channels.length;
  const sd = st.channels.reduce((s, c) => s + c.stdev, 0) / st.channels.length;
  // Ink ground is ~5/255. Almost no spread means nothing is on screen but chrome.
  // Two failure shapes: a near-black frame, and a frame that is technically
  // "not black" but is >85% dead ink with content only at one edge.
  const dark = sd < 14 && mean < 26;
  const mostlyEmpty = mean < 16 && sd < 34;
  const blank = dark || mostlyEmpty;
  rows.push({ i, y, ch: chapterAt(y), mean: +mean.toFixed(1), sd: +sd.toFixed(1), blank });
  if (blank) {
    await sharp(buf).resize(720).png().toFile(path.join(OUT, `blank-${String(i).padStart(3, "0")}-${chapterAt(y)}.png`));
  }
}

const blanks = rows.filter((r) => r.blank);
console.log(`${blanks.length} / ${rows.length} sampled frames render as near-empty\n`);

// Collapse consecutive blanks into ranges per chapter.
const ranges = [];
for (const r of blanks) {
  const last = ranges[ranges.length - 1];
  if (last && last.ch === r.ch && r.i === last.endI + 1) {
    last.endI = r.i;
    last.endY = r.y;
  } else {
    ranges.push({ ch: r.ch, startI: r.i, endI: r.i, startY: r.y, endY: r.y });
  }
}

if (!ranges.length) {
  console.log("no blank stretches — every sampled frame carries image");
} else {
  console.log("BLANK STRETCHES");
  for (const g of ranges) {
    const span = ((g.endI - g.startI + 1) / (STEPS + 1)) * 100;
    console.log(
      `  ${String(g.ch).padEnd(16)} y ${String(g.startY).padStart(6)} -> ${String(g.endY).padStart(6)}   ${span.toFixed(1)}% of page`,
    );
  }
}

console.log("\nper-chapter coverage (mean luminance of sampled frames):");
const byCh = {};
for (const r of rows) (byCh[r.ch] ||= []).push(r);
for (const [ch, rs] of Object.entries(byCh)) {
  const blankN = rs.filter((r) => r.blank).length;
  const avg = (rs.reduce((s, r) => s + r.mean, 0) / rs.length).toFixed(1);
  console.log(
    `  ${ch.padEnd(16)} frames=${String(rs.length).padStart(3)}  blank=${String(blankN).padStart(3)}  avg-luma=${avg}` +
      (blankN ? "   <-- has blanks" : ""),
  );
}

if (errors.length) {
  console.log("\nconsole/page errors:");
  for (const e of [...new Set(errors)].slice(0, 10)) console.log("  " + e);
}
console.log(`\nblank screenshots saved to .shots/blanks/`);
await browser.close();
