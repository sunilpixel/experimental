/** Trace the preloader counter against wall clock. */
import { chromium } from "playwright-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.addInitScript(() => {
  window.__t = [];
  const tick = () => {
    const c = document.querySelector("#aurum-preloader .pl-counter-inner");
    const de = document.documentElement;
    window.__t.push([Math.round(performance.now()), c ? c.textContent.trim() : "-",
      de.hasAttribute("data-aurum-loaded") ? "OUT" : ""]);
    if (!de.hasAttribute("data-aurum-loaded")) setTimeout(tick, 100);
  };
  addEventListener("DOMContentLoaded", tick);
});
await page.goto("http://localhost:3000", { waitUntil: "commit", timeout: 120000 });
await page.waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 60000 });
const t = await page.evaluate(() => window.__t);
let prev = null;
for (const [ms, c, out] of t) {
  if (c !== prev || out) { console.log(`${String(ms).padStart(5)}ms  counter=${c} ${out}`); prev = c; }
}
await browser.close();
