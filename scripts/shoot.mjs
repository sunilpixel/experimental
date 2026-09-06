/**
 * AURUM — visual debugger.
 *
 * Drives the running dev server in real Edge and screenshots the page at chosen
 * points inside a chapter's pinned timeline, so scroll-driven state can actually
 * be inspected instead of guessed at.
 *
 *   node scripts/shoot.mjs                     # every chapter, 3 points each
 *   node scripts/shoot.mjs passage             # one chapter, 5 points
 *   node scripts/shoot.mjs passage 0.1 0.5 0.9 # explicit progress points
 *
 * Output: .shots/<chapter>-<progress>.png
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots");
const URL_BASE = process.env.AURUM_URL || "http://localhost:3000";
const EDGE =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const [, , only, ...pts] = process.argv;
const POINTS = pts.length ? pts.map(Number) : [0.15, 0.5, 0.85];

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: EDGE,
  args: ["--force-device-scale-factor=1"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));

await page.goto(URL_BASE, { waitUntil: "load", timeout: 120000 });

// Let the preloader run its course and hand off to the hero.
await page
  .waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 30000 })
  .catch(() => console.warn("  ! preloader never set data-aurum-loaded"));
await page.waitForTimeout(2500);

/** Each chapter's scroll span, measured from its pin trigger. */
const spans = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("[data-chapter]").forEach((el) => {
    const r = el.getBoundingClientRect();
    out.push({
      id: el.dataset.chapter,
      top: r.top + window.scrollY,
      height: el.offsetHeight,
    });
  });
  return { chapters: out, docHeight: document.body.scrollHeight };
});

console.log(`document height: ${spans.docHeight}px`);
for (const c of spans.chapters) {
  console.log(`  ${c.id.padEnd(16)} top=${Math.round(c.top)}  height=${c.height}`);
}

const targets = only
  ? spans.chapters.filter((c) => c.id === only)
  : spans.chapters;

for (const c of targets) {
  for (const p of POINTS) {
    const y = Math.round(c.top + c.height * p);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    // Lenis lerps and ScrollTrigger scrubs — give both time to settle.
    await page.waitForTimeout(1800);
    const file = path.join(OUT, `${c.id}-${String(p).replace(".", "_")}.png`);
    await page.screenshot({ path: file });
    console.log(`  shot ${path.basename(file)}  (y=${y})`);
  }
}

if (errors.length) {
  console.log(`\n${errors.length} console error(s):`);
  for (const e of [...new Set(errors)].slice(0, 15)) console.log("  " + e);
} else {
  console.log("\nno console errors");
}

await browser.close();
