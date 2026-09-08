/**
 * AURUM — preloader filmstrip.
 * Shoots the overture every FRAME_MS from first paint, stamping each file with
 * the counter it caught, then keeps shooting through the exit so the handoff
 * can be inspected for a flash.
 *
 *   node scripts/probe-curtain.mjs
 *   VW=1366 VH=768 node scripts/probe-curtain.mjs
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const VW = Number(process.env.VW || 1600), VH = Number(process.env.VH || 900);
const FRAME_MS = Number(process.env.FRAME_MS || 140);
const N = Number(process.env.FRAMES || 46);
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith(`curtain-${VW}-`)) fs.unlinkSync(path.join(OUT, f));

const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
await page.goto(process.env.AURUM_URL || "http://localhost:3000", { waitUntil: "commit", timeout: 120000 });

// Start the strip when the count first moves, so the frames are the overture
// and not the pre-hydration hold.
await page.waitForFunction(() => {
  const c = document.querySelector("#aurum-preloader .pl-counter-inner");
  return !c || Number(c.textContent.trim()) > 0;
}, undefined, { timeout: 40000 }).catch(() => {});

for (let i = 0; i < N; i++) {
  const st = await page.evaluate(() => {
    const c = document.querySelector("#aurum-preloader .pl-counter-inner");
    return {
      n: c ? c.textContent.trim() : "---",
      out: document.documentElement.hasAttribute("data-aurum-loaded"),
      panel: !!document.getElementById("aurum-preloader"),
    };
  });
  const tag = st.panel ? st.n : (st.out ? "gone" : "----");
  await page.screenshot({ path: path.join(OUT, `curtain-${VW}-${String(i).padStart(2, "0")}-${tag}.png`) });
  if (!st.panel && i > 4) break;
  await page.waitForTimeout(FRAME_MS);
}
console.log(fs.readdirSync(OUT).filter((f) => f.startsWith(`curtain-${VW}-`)).join("\n"));
console.log(errs.length ? "\nerrors:\n  " + [...new Set(errs)].join("\n  ") : "\nno console errors");
await browser.close();
