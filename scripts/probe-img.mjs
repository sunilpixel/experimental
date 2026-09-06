/** Reports every <img> inside a chapter: real source, natural size, box, and
 *  any failed image request. Answers "is the photo actually there". */
import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const [, , chapter = "passage", prog = "0.45"] = process.argv;

const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const failed = [];
page.on("response", (r) => {
  if (r.url().includes("/images/") || r.url().includes("_next/image")) {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 120)}`);
  }
});
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));

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

await page.evaluate((y) => window.scrollTo(0, y), Math.round(box.top + box.height * Number(prog)));
await page.waitForTimeout(2500);

const imgs = await page.evaluate((id) => {
  const root = document.querySelector(`[data-chapter="${id}"]`);
  return [...root.querySelectorAll("img")].map((i) => {
    const r = i.getBoundingClientRect();
    const cs = getComputedStyle(i);
    return {
      src: (i.currentSrc || i.getAttribute("src") || "").slice(-64),
      natural: `${i.naturalWidth}x${i.naturalHeight}`,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      onScreen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight,
      opacity: cs.opacity,
      visibility: cs.visibility,
      complete: i.complete,
    };
  });
}, chapter);

console.log(`${imgs.length} <img> inside #${chapter}`);
for (const [n, i] of imgs.entries()) {
  console.log(
    `  [${n}] natural=${i.natural.padEnd(11)} box=${i.box.padEnd(10)} op=${i.opacity} vis=${i.visibility} complete=${i.complete} onScreen=${i.onScreen}\n      ...${i.src}`,
  );
}
console.log("\nfailed image requests:", failed.length ? failed : "none");
if (errs.length) console.log("page errors:", errs.slice(0, 5));
await browser.close();
