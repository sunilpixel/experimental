import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
const DIR = "public/images/preview";
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".jpg")).sort();
const COLS = 4, CELL = 420, LABEL = 30;
const rows = Math.ceil(files.length / COLS);
const tiles = [];
for (const [i, f] of files.entries()) {
  const buf = await sharp(path.join(DIR, f))
    .resize(CELL, CELL - LABEL, { fit: "cover", position: "centre" }).toBuffer();
  tiles.push({ input: buf, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL });
  const svg = Buffer.from(
    `<svg width="${CELL}" height="${LABEL}"><rect width="${CELL}" height="${LABEL}" fill="#000"/>` +
    `<text x="8" y="20" font-family="monospace" font-size="17" fill="#e8d3a3">${String(i+1).padStart(2,"0")} ${f.replace(".jpg","")}</text></svg>`);
  tiles.push({ input: svg, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL + CELL - LABEL });
}
await sharp({ create: { width: COLS*CELL, height: rows*CELL, channels: 3, background: "#000" } })
  .composite(tiles).jpeg({ quality: 88 }).toFile(".shots/contact-sheet.jpg");
console.log(`contact sheet: ${files.length} frames -> .shots/contact-sheet.jpg`);
