/**
 * Reports each pinned ScrollTrigger's attached timeline duration.
 *
 * Every chapter is authored on a 0 -> 1 normalised timeline, so a tween written
 * at position 0.86 is meant to run in the last 14% of the pin. If the timeline's
 * total duration is not 1, ScrollTrigger still maps scroll progress across the
 * WHOLE duration, so 0.86 lands at 0.86/duration — the finale fires early and
 * the chapter sits in its end state (often fully clipped away) for the rest of
 * the pin. That is what reads as "blank".
 */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
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

const rows = await page.evaluate(() => {
  const ST = window.ScrollTrigger;
  return ST.getAll()
    .filter((t) => t.animation)
    .map((t) => {
      const ch = t.trigger && t.trigger.closest ? t.trigger.closest("[data-chapter]") : null;
      const a = t.animation;
      return {
        chapter: ch ? ch.dataset.chapter : "-",
        pin: !!t.pin,
        dur: +a.totalDuration().toFixed(3),
        children: a.getChildren ? a.getChildren(false).length : 0,
      };
    });
});

console.log("timeline durations (should be 1.000 for a normalised chapter)\n");
for (const r of rows) {
  const bad = r.pin && Math.abs(r.dur - 1) > 0.005;
  console.log(
    `  ${r.chapter.padEnd(16)} pin=${r.pin ? "Y" : "n"}  duration=${String(r.dur).padStart(7)}  tweens=${String(r.children).padStart(3)}` +
      (bad ? `   <-- finale fires at ${(0.86 / r.dur).toFixed(2)} instead of 0.86` : ""),
  );
}
await browser.close();
