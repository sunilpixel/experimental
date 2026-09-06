/** For each visible plate, asks the browser what element is ACTUALLY painted at
 *  the plate's centre point. If something else answers, the plate is occluded;
 *  if the plate answers but the screen is black, it is a compositing failure. */
import { chromium } from "playwright-core";

const EDGE = "C:/Users/Sunil/Desktop/Projects/experimental" && "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [, , chapter = "passage", ...pts] = process.argv;
const POINTS = pts.length ? pts.map(Number) : [0.05, 0.25, 0.45, 0.65, 0.85];

const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(process.env.AURUM_URL || "http://localhost:3000", {
  waitUntil: "load",
  timeout: 120000,
});
await page.waitForTimeout(3000);

const box = await page.evaluate((id) => {
  const el = document.querySelector(`[data-chapter="${id}"]`);
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: el.offsetHeight };
}, chapter);

for (const p of POINTS) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(box.top + box.height * p));
  await page.waitForTimeout(1600);

  const info = await page.evaluate((id) => {
    const root = document.querySelector(`[data-chapter="${id}"]`);
    const plates = [...root.querySelectorAll(".psg-plate, .frame")];
    const lit = [];
    plates.forEach((pl, i) => {
      const cs = getComputedStyle(pl);
      const op = parseFloat(cs.opacity);
      if (op < 0.05) return;
      const r = pl.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      if (cx < 0 || cx > innerWidth || cy < 0 || cy > innerHeight) {
        lit.push({ i, op: op.toFixed(2), at: `${cx},${cy}`, hit: "OFFSCREEN" });
        return;
      }
      const top = document.elementFromPoint(cx, cy);
      const cls = top ? String(top.className).slice(0, 46) : "null";
      lit.push({ i, op: op.toFixed(2), at: `${cx},${cy}`, hit: top ? `${top.tagName}.${cls}` : "null" });
    });
    return lit;
  }, chapter);

  console.log(`\nprogress ${p}:`);
  if (!info.length) console.log("   no plate above 5% opacity");
  for (const r of info) console.log(`   plate[${r.i}] op=${r.op} centre=${r.at}  painted-on-top: ${r.hit}`);
}

await browser.close();
