/**
 * "Why is this chapter blank?" — walks every element inside a chapter and
 * reports the ones that would suppress paint: zero opacity, a collapsed
 * clip-path, visibility/display off, a zero-area box, or a transform that has
 * pushed it off screen. Reports the ancestor chain so the culprit is obvious.
 */
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [, , chapter = "hero", prog = "0.5"] = process.argv;

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

const box = await page.evaluate((id) => {
  const el = document.querySelector(`[data-chapter="${id}"]`);
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: el.offsetHeight };
}, chapter);

await page.evaluate((y) => window.scrollTo(0, y), Math.round(box.top + box.height * Number(prog)));
await page.waitForTimeout(2000);

const rows = await page.evaluate((id) => {
  const root = document.querySelector(`[data-chapter="${id}"]`);
  const out = [];
  const walk = (el, depth) => {
    if (depth > 6) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const cls = String(el.className).split(" ").slice(0, 3).join(" ").slice(0, 44);
    const problems = [];
    if (parseFloat(cs.opacity) < 0.02) problems.push(`opacity=${cs.opacity}`);
    if (cs.visibility === "hidden") problems.push("visibility=hidden");
    if (cs.display === "none") problems.push("display=none");
    if (cs.clipPath !== "none") problems.push(`clip=${cs.clipPath.slice(0, 46)}`);
    if (r.width < 2 || r.height < 2) problems.push(`box=${Math.round(r.width)}x${Math.round(r.height)}`);
    if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight)
      problems.push(`offscreen @${Math.round(r.left)},${Math.round(r.top)}`);
    if (problems.length) out.push({ depth, cls, problems: problems.join("  ") });
    [...el.children].forEach((c) => walk(c, depth + 1));
  };
  [...root.children].forEach((c) => walk(c, 0));
  return out;
}, chapter);

console.log(`#${chapter} at progress ${prog} — elements that suppress paint:\n`);
if (!rows.length) console.log("  none found (paint failure is compositing, not CSS state)");
for (const r of rows.slice(0, 30)) {
  console.log(`  ${"  ".repeat(r.depth)}${r.cls || "(no class)"}\n  ${"  ".repeat(r.depth)}   ${r.problems}`);
}
await browser.close();
