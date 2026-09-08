/**
 * AURUM — text overlap probe.
 * Scrolls the whole document and reports pairs of visible text runs whose
 * painted boxes intersect. Non-destructive; dev-only diagnostic.
 *
 *   node scripts/probe-overlap.mjs           # 60 samples
 *   node scripts/probe-overlap.mjs 120       # finer
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots");
const URL_BASE = process.env.AURUM_URL || "http://localhost:3000";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const STEPS = Number(process.argv[2] || 60);
const VW = Number(process.env.VW || 1600);
const VH = Number(process.env.VH || 900);

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(URL_BASE, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(2500);

const COLLECT = () => {
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walk.nextNode())) {
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    // effective opacity through ancestors
    let op = 1, a = el;
    while (a && a !== document.body) {
      op *= Number(getComputedStyle(a).opacity);
      if (getComputedStyle(a).visibility === "hidden") { op = 0; break; }
      a = a.parentElement;
    }
    if (op < 0.55) continue;
    // INK rect, not the block box: a left-aligned line inside a 40vw block
    // otherwise reports 40vw of empty space as occupied and every neighbour
    // looks like a collision.
    const rng = document.createRange();
    rng.selectNodeContents(n);
    const boxes = [...rng.getClientRects()].filter((b) => b.width > 1 && b.height > 1);
    if (!boxes.length) continue;
    const r = {
      left: Math.min(...boxes.map((b) => b.left)),
      top: Math.min(...boxes.map((b) => b.top)),
      right: Math.max(...boxes.map((b) => b.right)),
      bottom: Math.max(...boxes.map((b) => b.bottom)),
    };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const sect = el.closest("[data-chapter]");
    out.push({
      text: t.slice(0, 40),
      op: Number(op.toFixed(2)),
      fs: Math.round(parseFloat(cs.fontSize)),
      tag: el.tagName.toLowerCase(),
      cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || "")).slice(0, 60),
      chapter: sect ? sect.dataset.chapter : "-",
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      // paint order proxy
      path: (() => { const p = []; let e = el; while (e && e !== document.body) { p.push(e.tagName + (e.id ? "#" + e.id : "")); e = e.parentElement; } return p.join(">"); })(),
    });
  }
  return out;
};

const docH = await page.evaluate(() => document.body.scrollHeight);
console.log(`viewport ${VW}x${VH}   document ${docH}px   ${STEPS} samples`);

const hits = new Map();
for (let i = 0; i <= STEPS; i++) {
  const y = Math.round((docH - VH) * (i / STEPS));
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(650);
  const items = await page.evaluate(COLLECT);
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const A = items[a], B = items[b];
      // skip ancestor/descendant relationships
      if (A.path.includes(B.path) || B.path.includes(A.path)) continue;
      const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ox <= 1 || oy <= 1) continue;
      const area = ox * oy;
      const frac = area / Math.min(A.w * A.h, B.w * B.h);
      if (frac < 0.25) continue;
      const key = `${A.chapter}|${A.text}|${B.text}`;
      const prev = hits.get(key);
      if (!prev || frac > prev.frac) hits.set(key, { A, B, frac, y, scrollY: y, ox, oy });
    }
  }
}

const rows = [...hits.values()].sort((p, q) => q.frac - p.frac);
console.log(`\n${rows.length} overlapping text pair(s):\n`);
for (const r of rows.slice(0, 60)) {
  console.log(`[${r.A.chapter}] ${(r.frac * 100).toFixed(0)}% overlap  @scrollY=${r.scrollY}`);
  console.log(`    A  ${r.A.tag}.${r.A.cls}  "${r.A.text}"  (${r.A.x},${r.A.y} ${r.A.w}x${r.A.h}) fs=${r.A.fs} op=${r.A.op}`);
  console.log(`    B  ${r.B.tag}.${r.B.cls}  "${r.B.text}"  (${r.B.x},${r.B.y} ${r.B.w}x${r.B.h}) fs=${r.B.fs} op=${r.B.op}`);
}
await browser.close();
