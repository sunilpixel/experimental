/** Sweeps a chapter and reports one computed property per step, so a tween's
 *  real curve can be compared against where it was authored.
 *  node scripts/probe-sweep.mjs hero .hero-cut clipPath */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [, , chapter = "hero", sel = ".hero-cut", prop = "clipPath"] = process.argv;

const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(process.env.AURUM_URL || "http://localhost:3000", {
  waitUntil: "load",
  timeout: 120000,
});
await page
  .waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 30000 })
  .catch(() => {});
await page.waitForTimeout(2500);

const geo = await page.evaluate((id) => {
  const el = document.querySelector(`[data-chapter="${id}"]`);
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: el.offsetHeight };
}, chapter);

console.log(`#${chapter}  top=${Math.round(geo.top)}  height=${geo.height}`);
console.log(`sweeping ${sel} -> ${prop}\n`);

for (let p = 0; p <= 1.0001; p += 0.1) {
  const y = Math.round(geo.top + geo.height * p);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(900);
  const v = await page.evaluate(
    ([s, pr]) => {
      const el = document.querySelector(s);
      if (!el) return "NOT FOUND";
      const cs = getComputedStyle(el);
      return String(cs[pr]).slice(0, 60);
    },
    [sel, prop],
  );
  console.log(`  p=${p.toFixed(1)}  y=${String(y).padStart(6)}   ${v}`);
}
await browser.close();
