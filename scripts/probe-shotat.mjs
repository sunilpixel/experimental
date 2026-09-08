/** Screenshot the page at explicit scrollY values: node scripts/probe-shotat.mjs 7387 9850 ... */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const VW = Number(process.env.VW || 1600), VH = Number(process.env.VH || 900);
const ys = process.argv.slice(2).map(Number);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(process.env.AURUM_URL || "http://localhost:3000", { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(2500);
for (const y of ys) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(1700);
  const f = path.join(OUT, `at-${VW}-${y}.png`);
  await page.screenshot({ path: f });
  console.log("shot " + path.basename(f));
}
await browser.close();
