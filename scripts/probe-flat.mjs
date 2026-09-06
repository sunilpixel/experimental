/**
 * Finds every element that declares transform-style: preserve-3d while also
 * carrying a property that FORCES it flat.
 *
 * Per CSS Transforms 2, a "grouping property" — opacity < 1, filter, clip-path,
 * mask, overflow other than visible, and crucially `will-change` LISTING any of
 * them — makes the used value of transform-style flat. getComputedStyle still
 * reports preserve-3d, so this never shows up in devtools: the 3D scene simply
 * collapses onto one plane. If that plane is then translated past the
 * perspective distance, the whole chapter renders black.
 */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(process.env.AURUM_URL || "http://localhost:3000", {
  waitUntil: "load",
  timeout: 120000,
});
await page.waitForTimeout(3000);

const rows = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.transformStyle !== "preserve-3d") return;
    const reasons = [];
    if (/opacity|filter|clip-path|mask/.test(cs.willChange)) reasons.push(`will-change:${cs.willChange}`);
    if (parseFloat(cs.opacity) < 1) reasons.push(`opacity:${cs.opacity}`);
    if (cs.filter !== "none") reasons.push(`filter:${cs.filter}`);
    if (cs.overflow !== "visible") reasons.push(`overflow:${cs.overflow}`);
    if (cs.clipPath !== "none") reasons.push("clip-path");
    if (!reasons.length) return;
    const chapter = el.closest("[data-chapter]");
    out.push({
      chapter: chapter ? chapter.dataset.chapter : "(chrome)",
      cls: String(el.className).slice(0, 60),
      reasons: reasons.join("  "),
    });
  });
  return out;
});

if (!rows.length) {
  console.log("clean — no preserve-3d element is being force-flattened");
} else {
  console.log(`${rows.length} element(s) with preserve-3d forced FLAT:\n`);
  for (const r of rows) {
    console.log(`  [${r.chapter}] ${r.cls}\n      ${r.reasons}`);
  }
}
await browser.close();
