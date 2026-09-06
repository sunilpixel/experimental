/** Reports the computed 3D compositing chain: transform-style, will-change,
 *  perspective, opacity and overflow. `will-change: opacity` (even at opacity 1)
 *  forces transform-style to FLAT, which silently collapses a 3D scene. */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const prefix = process.argv[2] || "psg-";

const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(process.env.AURUM_URL || "http://localhost:3000", {
  waitUntil: "load",
  timeout: 120000,
});
await page.waitForTimeout(2500);

const rows = await page.evaluate((pfx) => {
  const out = [];
  document.querySelectorAll(`[class*="${pfx}"]`).forEach((el) => {
    const cs = getComputedStyle(el);
    const cls = String(el.className)
      .split(" ")
      .filter((c) => c.startsWith(pfx) || c === "will-anim")
      .join(" ");
    if (!cls) return;
    if (out.some((o) => o.cls === cls)) return;
    out.push({
      cls,
      transformStyle: cs.transformStyle,
      willChange: cs.willChange,
      perspective: cs.perspective,
      opacity: cs.opacity,
      overflow: cs.overflow,
    });
  });
  return out.slice(0, 10);
}, prefix);

for (const r of rows) {
  const flagged =
    r.transformStyle === "flat" && /opacity|filter/.test(r.willChange)
      ? "   <-- preserve-3d KILLED by will-change"
      : "";
  console.log(
    `  ${r.cls.padEnd(26)} style=${r.transformStyle.padEnd(11)} will-change=${r.willChange.padEnd(20)} persp=${r.perspective}${flagged}`,
  );
}
await browser.close();
