/** Peak caption opacity per residence card across the whole chapter, and
 *  whether the caption ink ever crosses the ledger or the copy rail. */
import { chromium } from "playwright-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(2000);
const span = await page.evaluate(() => {
  const el = document.querySelector('[data-chapter="residences"]');
  const r = el.getBoundingClientRect();
  return { top: r.top + scrollY, h: el.offsetHeight };
});
const peak = {}, bad = [];
for (let i = 0; i <= 90; i++) {
  const y = Math.round(span.top + (span.h * i) / 90);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(430);
  const rows = await page.evaluate(() => {
    const rail = document.querySelector(".res-rail").getBoundingClientRect().left;
    const led = document.querySelector(".res-ledger").getBoundingClientRect().right;
    return [...document.querySelectorAll(".res-panel")].map((p) => {
      const meta = p.querySelector(".res-meta");
      const t = p.querySelector(".res-cap-line");
      const rng = document.createRange(); rng.selectNodeContents(t);
      const b = rng.getBoundingClientRect();
      return { name: t.textContent.trim(), op: +getComputedStyle(meta).opacity, l: b.left, r: b.right, rail, led };
    });
  });
  for (const r of rows) {
    peak[r.name] = Math.max(peak[r.name] ?? 0, r.op);
    // a caption is only a problem while it is actually legible
    if (r.op > 0.2 && (r.r > r.rail || r.l < r.led)) bad.push({ y, ...r });
  }
}
console.log("peak caption opacity per card:");
for (const [k, v] of Object.entries(peak)) console.log("  " + k.padEnd(16) + v.toFixed(2));
console.log(`\ncaptions crossing chrome while legible: ${bad.length}`);
for (const b of bad.slice(0, 12))
  console.log(`  @${b.y} ${b.name} op=${b.op.toFixed(2)} ink=[${b.l.toFixed(0)},${b.r.toFixed(0)}] ledgerRight=${b.led.toFixed(0)} railLeft=${b.rail.toFixed(0)}`);
await browser.close();
