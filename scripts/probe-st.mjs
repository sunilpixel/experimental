/** Dumps every live ScrollTrigger: trigger element, start/end in px, pin, and
 *  current progress. Reveals duplicate or mis-ranged triggers on a chapter. */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const at = Number(process.argv[2] || 0);

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

if (at) {
  await page.evaluate((y) => window.scrollTo(0, y), at);
  await page.waitForTimeout(1500);
}

const rows = await page.evaluate(() => {
  const ST = window.ScrollTrigger || (window.gsap && window.gsap.core && window.ScrollTrigger);
  if (!ST) return { error: "ScrollTrigger not on window" };
  return {
    scrollY: window.scrollY,
    list: ST.getAll().map((t) => {
      const el = t.trigger;
      const id = el && el.closest ? el.closest("[data-chapter]") : null;
      return {
        chapter: id ? id.dataset.chapter : "-",
        trigger: el ? String(el.className).split(" ").slice(0, 2).join(" ").slice(0, 30) : "-",
        start: Math.round(t.start),
        end: Math.round(t.end),
        dist: Math.round(t.end - t.start),
        pin: !!t.pin,
        progress: +t.progress.toFixed(3),
      };
    }),
  };
});

if (rows.error) {
  console.log(rows.error, "— exposing it for the probe");
} else {
  console.log(`scrollY=${rows.scrollY}   ${rows.list.length} ScrollTriggers\n`);
  const byCh = {};
  for (const r of rows.list) (byCh[r.chapter] ||= []).push(r);
  for (const [ch, list] of Object.entries(byCh)) {
    console.log(`  ${ch}  (${list.length})`);
    for (const t of list) {
      console.log(
        `     ${t.trigger.padEnd(24)} ${String(t.start).padStart(6)} -> ${String(t.end).padStart(6)}  dist=${String(t.dist).padStart(5)}  pin=${t.pin ? "Y" : "n"}  p=${t.progress}`,
      );
    }
  }
}
await browser.close();
