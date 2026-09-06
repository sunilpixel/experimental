/**
 * AURUM — live DOM probe. Scrolls to a point inside a chapter and reports the
 * computed state of the elements a timeline is supposed to be driving, so a
 * "why is this blank" question gets an answer instead of a theory.
 *
 *   node scripts/probe.mjs sustainability 0.3 ".sus-head,.sus-line,.sus-rule"
 */
import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const [, , chapter, prog = "0.3", sel = ""] = process.argv;

const browser = await chromium.launch({ executablePath: EDGE });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));

await page.goto(process.env.AURUM_URL || "http://localhost:3000", {
  waitUntil: "load",
  timeout: 120000,
});
await page
  .waitForFunction(() => document.documentElement.hasAttribute("data-aurum-loaded"), { timeout: 30000 })
  .catch(() => {});
await page.waitForTimeout(2000);

const box = await page.evaluate((id) => {
  const el = document.querySelector(`[data-chapter="${id}"]`);
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: el.offsetHeight };
}, chapter);

await page.evaluate((y) => window.scrollTo(0, y), Math.round(box.top + box.height * Number(prog)));
await page.waitForTimeout(2000);

const report = await page.evaluate((selectors) => {
  const out = [];
  for (const s of selectors.split(",").filter(Boolean)) {
    const nodes = document.querySelectorAll(s.trim());
    if (!nodes.length) {
      out.push({ sel: s.trim(), count: 0 });
      continue;
    }
    nodes.forEach((n, i) => {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      out.push({
        sel: s.trim(),
        i,
        count: nodes.length,
        text: (n.textContent || "").trim().slice(0, 28),
        transform: cs.transform,
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        box: `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.left)},${Math.round(r.top)}`,
        parentOverflow: n.parentElement ? getComputedStyle(n.parentElement).overflow : "-",
        parentBox: n.parentElement
          ? `${Math.round(n.parentElement.getBoundingClientRect().width)}x${Math.round(n.parentElement.getBoundingClientRect().height)}`
          : "-",
      });
    });
  }
  return out;
}, sel);

for (const r of report) {
  if (!r.count) {
    console.log(`  ${r.sel}  -> NOT FOUND (0 elements)`);
    continue;
  }
  console.log(
    `  ${r.sel}[${r.i}] "${r.text}"\n` +
      `     transform=${r.transform}\n` +
      `     opacity=${r.opacity} vis=${r.visibility} display=${r.display} box=${r.box}\n` +
      `     parent: overflow=${r.parentOverflow} box=${r.parentBox}`,
  );
}
if (errs.length) console.log("\npage errors:", errs.slice(0, 5));
await browser.close();
