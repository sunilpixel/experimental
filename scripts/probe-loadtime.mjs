/** What actually holds the preloader: document readiness vs animation clock. */
import { chromium } from "playwright-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.addInitScript(() => {
  window.__marks = [];
  window.__long = [];
  addEventListener("DOMContentLoaded", () => window.__marks.push(["DOMContentLoaded", performance.now()]));
  addEventListener("load", () => window.__marks.push(["window.load", performance.now()]));
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); })
    .observe({ entryTypes: ["longtask"] });
  const obs = new MutationObserver(() => {
    const de = document.documentElement;
    if (de.hasAttribute("data-aurum-loaded") && !window.__doneMark) {
      window.__doneMark = 1; window.__marks.push(["data-aurum-loaded", performance.now()]);
    }
  });
  addEventListener("DOMContentLoaded", () => obs.observe(document.documentElement, { attributes: true }));
});
await page.goto(process.env.AURUM_URL || "http://localhost:3000", { waitUntil: "commit", timeout: 120000 });
await page.waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 60000 });
await page.waitForTimeout(300);
const r = await page.evaluate(() => ({
  marks: window.__marks,
  long: window.__long,
  imgs: performance.getEntriesByType("resource")
    .filter((e) => /\/_next\/image|\.webp/.test(e.name))
    .map((e) => ({ n: e.name.slice(-70), start: Math.round(e.startTime), end: Math.round(e.responseEnd), kb: Math.round(e.transferSize / 1024) }))
    .sort((a, b) => b.end - a.end).slice(0, 8),
  lag: typeof gsap !== "undefined" ? "gsap-global" : "scoped",
}));
console.log("marks:"); for (const [k, v] of r.marks) console.log(`  ${k.padEnd(20)} ${Math.round(v)}ms`);
console.log(`long tasks (>50ms): ${r.long.length}, total ${r.long.reduce((a,b)=>a+b,0)}ms, worst ${Math.max(0,...r.long)}ms`);
console.log("slowest image responses:"); for (const i of r.imgs) console.log(`  ${String(i.end).padStart(6)}ms  ${String(i.kb).padStart(5)}KB  ${i.n}`);
await browser.close();
