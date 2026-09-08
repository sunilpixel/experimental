import { chromium } from "playwright-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE, args: ["--force-device-scale-factor=1"] });
for (const [w, h] of [[1600, 900], [1024, 768], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(process.env.AURUM_URL || "http://localhost:3000", { waitUntil: "commit", timeout: 120000 });
  await page.waitForFunction(() => {
    const c = document.querySelector("#aurum-preloader .pl-counter-inner");
    return c && Number(c.textContent.trim()) >= 88;
  }, undefined, { timeout: 40000 }).catch(() => {});
  console.log(`--- ${w}x${h} ---`);
  console.log(await page.evaluate(() => {
    const ink = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return b; };
    const gs = [...document.querySelectorAll("#aurum-preloader .pl-glyph")];
    if (!gs.length) return "  (panel gone)";
    const top = Math.min(...gs.map((g) => ink(g).top));
    const bot = Math.max(...gs.map((g) => ink(g).bottom));
    const rule = document.querySelector("#aurum-preloader .pl-rule").getBoundingClientRect();
    const yr = ink(document.querySelector("#aurum-preloader .pl-year-inner"));
    const ct = ink(document.querySelector("#aurum-preloader .pl-counter-inner"));
    const mk = document.querySelector("#aurum-preloader .pl-mark").getBoundingClientRect();
    return [
      `  glyph ink   y=[${top.toFixed(0)}, ${bot.toFixed(0)}]`,
      `  rule        y=${rule.top.toFixed(0)}   gap under glyphs = ${(rule.top - bot).toFixed(0)}px`,
      `  year  ink   y=[${yr.top.toFixed(0)}, ${yr.bottom.toFixed(0)}] x=[${yr.left.toFixed(0)}, ${yr.right.toFixed(0)}]  gap under rule = ${(yr.top - rule.top).toFixed(0)}px`,
      `  count ink   y=[${ct.top.toFixed(0)}, ${ct.bottom.toFixed(0)}] x=[${ct.left.toFixed(0)}, ${ct.right.toFixed(0)}]`,
      `  mark box    y=[${mk.top.toFixed(0)}, ${mk.bottom.toFixed(0)}]  gap above glyphs = ${(top - mk.bottom).toFixed(0)}px`,
    ].join("\n");
  }));
  await page.close();
}
await browser.close();
