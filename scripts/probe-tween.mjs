/** Lists the children of a chapter's pinned timeline, sorted by end time, so the
 *  tween that stretches a "normalised 0->1" timeline past 1 is obvious. */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const chapter = process.argv[2] || "hero";

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

const rows = await page.evaluate((id) => {
  const ST = window.ScrollTrigger;
  const t = ST.getAll().find((x) => {
    const ch = x.trigger && x.trigger.closest ? x.trigger.closest("[data-chapter]") : null;
    return ch && ch.dataset.chapter === id && x.pin && x.animation;
  });
  if (!t) return { error: "no pinned timeline for " + id };
  const tl = t.animation;
  const kids = tl.getChildren(false).map((c) => {
    const targets = c.targets ? c.targets() : [];
    const cls = targets.length && targets[0].className ? String(targets[0].className).slice(0, 34) : String(targets[0] && targets[0].nodeName || "?");
    return {
      start: +c.startTime().toFixed(3),
      dur: +c.duration().toFixed(3),
      end: +(c.startTime() + c.duration()).toFixed(3),
      target: cls,
      props: Object.keys(c.vars || {}).filter((k) => !["duration", "ease", "stagger", "force3D", "immediateRender", "transformOrigin", "transformPerspective"].includes(k)).slice(0, 4).join(","),
    };
  });
  kids.sort((a, b) => b.end - a.end);
  return { duration: +tl.totalDuration().toFixed(3), kids: kids.slice(0, 12) };
}, chapter);

if (rows.error) console.log(rows.error);
else {
  console.log(`#${chapter} pinned timeline duration=${rows.duration}\n`);
  console.log("  latest-ending tweens:");
  for (const k of rows.kids) {
    const flag = k.end > 1.001 ? "   <-- past 1.0" : "";
    console.log(`   start=${String(k.start).padStart(6)} dur=${String(k.dur).padStart(6)} end=${String(k.end).padStart(6)}  ${k.target.padEnd(36)} ${k.props}${flag}`);
  }
}
await browser.close();
