# AURUM — IMAGE ASSETS

**For the art director replacing this photography.**
Companion PDF: `AURUM-IMAGE-ASSETS.pdf` (one designed page per asset, with a large preview).

---

## 1. STATUS — READ THIS FIRST

**Every one of the 23 image assets currently on this site is a placeholder. All 23 must be replaced with true high-resolution originals before any public launch.**

Here is exactly what they are and where they came from, with nothing softened:

- The client supplied 15 photographic frames inside **`AURUM-INDIVIDUAL-IMAGES.pdf`**.
- That PDF is a **catalogue, not a delivery package**. Each frame is embedded in it at roughly **340 × 230 px** — thumbnail resolution. Pages 7–15 additionally have a **caption bar burned into the bottom of the picture area**, so part of the photograph is covered by type that is not removable without losing image.
- `scripts/import-source-images.mjs` extracts those frames, detects and removes the burned-in caption bar, crops each one to its slot's aspect ratio, upscales with lanczos3 plus a restrained unsharp mask, and applies the shared AURUM grade (raised saturation and contrast — deliberately **not** darkened).
- 15 supplied frames have to fill **23 manifest slots**. The remaining **8 slots are art-directed crops of a related frame** — a different framing of the same source, flagged `derived: true` in that script's `MAP`. They are:
  `hero-reveal`, `experience-dining`, `experience-cultural`, `architecture-04`, `architecture-05`, `architecture-06`, `testimonial-portrait`, `final`.

**The consequence:** every file in `public/images/` is upscaled from a ~340 px source. They hold together at the sizes the site uses — full-bleed beds, drifting strips, small orbiting nodes — because the grade is bold and the motion is fast. They are **not** true 4K photography. Look at any of them at 100% and the interpolation is obvious. The 8 derived crops are worse again: they are ~340 px sources cropped further, then upscaled, so their effective resolution is closer to 200–250 px.

Nothing here is a judgement on the pictures themselves — the client's frames are good. The problem is purely that we were handed a contact sheet instead of the masters.

**What is needed:** the original high-resolution files behind those 15 frames (uncaptioned, full-frame), plus **8 genuinely new photographs** for the derived slots, which currently have no source of their own.

---

## 2. HOW TO REPLACE AN IMAGE

### The short version

1. Produce the new file at (or above) the dimensions listed for that slot in the table below.
2. Save it as **WebP**, quality ~90.
3. Give it the **exact same filename** and drop it into `public/images/`, overwriting the placeholder.
4. Keep the **same aspect ratio**. If the ratio genuinely has to change, update `width` and `height` for that entry in `src/lib/images.ts` to match the new file.
5. Rebuild. Nothing else needs touching.

### How the site consumes images

**`src/lib/images.ts` is the single manifest.** Every photograph on the site is declared there once, as an object with `key`, `file`, `alt`, `section`, `purpose`, `width`, `height`, `ratio` and `prompt`. Sections never hardcode a path — they call `img("hero")`, which looks the key up and returns everything `next/image` needs.

**`src/components/ImageFrame.tsx` renders every photograph.** It is the only image primitive in the codebase. It wraps `next/image` with `fill` (so the frame's own box, not the file, controls layout), `object-cover`, `quality={90}`, a `sizes` hint, and a `blurDataURL` placeholder so each frame resolves out of a colour-correct blur instead of popping in. Its three-deep structure — wrapper / transform layer / image — exists so GSAP always has a clean transform target that never fights the wrapper's `clip-path`.

Because `ImageFrame` uses `fill` + `object-cover`, **a wrong aspect ratio will not break the layout — it will silently crop your photograph.** That is why matching the ratio matters more than matching the exact pixel dimensions.

**`src/lib/image-blur.ts` holds the blur placeholders.** It is auto-generated: a base64 24 px WebP LQIP per key. It is written by the import script, not by hand.

> ⚠️ **Do not re-run `scripts/import-source-images.mjs` (or `npm run images` / `npm run assets`) casually.**
> It rewrites the whole of `public/images/` — every `.webp`, every preview JPEG — and regenerates `src/lib/image-blur.ts`. It only makes sense to run with the source PDF frames present (it needs `AURUM_SRC_DIR` pointing at the extracted raw frames), and running it after you have dropped in real replacements **will destroy those replacements**. `scripts/generate-images.placeholder.mjs` is a retired procedural placeholder generator and should never be run at all.

When you replace files by hand, the stale blur placeholder for that key is a 24 px thumbnail of the *old* picture. It is only visible for a few hundred milliseconds during load, so it is usually acceptable, but if the new photograph is very different in colour, regenerate just that entry's base64 string in `src/lib/image-blur.ts`.

### A note on two vestigial fields

`src/lib/images.ts` still carries `recipe` and `seed` on every entry. **Ignore them.** They described an earlier procedural placeholder system that has been retired; they have no effect on anything. `prompt` is the field that still matters — it is the art direction, reproduced in full in section 4 below and in the PDF.

---

## 3. THE FULL ASSET TABLE

23 assets. Source page numbers refer to `AURUM-INDIVIDUAL-IMAGES.pdf`.

| Filename | Chapter / section | Dimensions | Ratio | Source page | Derived? | Purpose | REPLACE? |
|---|---|---|---|---|---|---|---|
| `hero.webp` | 01 — Hero | 3840 × 2160 | 16:9 | p1 | — | Full-bleed opening frame; scales 1.15→1.6 and rotates behind the pinned headline | **YES** |
| `hero-reveal.webp` | 01 — Hero (circle reveal) | 3840 × 2160 | 16:9 | derived from p6 | ● derived | Second frame revealed through the expanding `circle()` clip-path in hero phase 05 | **YES — priority** |
| `nature.webp` | 02 — Nature / Philosophy | 3200 × 2400 | 4:3 | p2 | — | Sits behind the word NATURE; revealed through letter-shaped SVG masks, then goes full-bleed | **YES** |
| `residence-cliff.webp` | 03 — Residences | 1800 × 2400 | 3:4 | p3 | — | Panel 1 of the pinned horizontal gallery; rotated −4°, partially clipped | **YES** |
| `residence-forest.webp` | 03 — Residences | 1800 × 2400 | 3:4 | p4 | — | Panel 2 of the pinned horizontal gallery; rotated +2° | **YES** |
| `residence-ocean.webp` | 03 — Residences | 1800 × 2400 | 3:4 | p5 | — | Panel 3 — the dominant centre frame all panels collapse into | **YES** |
| `residence-desert.webp` | 03 — Residences | 1800 × 2400 | 3:4 | p6 | — | Panel 4; rotated +5°, heaviest blur at rest | **YES** |
| `residence-mountains.webp` | 03 — Residences | 1800 × 2400 | 3:4 | p7 | — | Panel 5; rotated −3° | **YES** |
| `experience-spa.webp` | 04 — Experiences | 2600 × 2600 | 1:1 | p8 | — | Fills the growing `circle()` mask; also the WELLNESS & SPA orbiting node | **YES** |
| `experience-yacht.webp` | 04 — Experiences | 1600 × 1600 | 1:1 | p9 | — | YACHT JOURNEYS orbiting node | **YES** |
| `experience-dining.webp` | 04 — Experiences | 1600 × 1600 | 1:1 | derived from p10 | ● derived | PRIVATE DINING orbiting node | **YES — priority** |
| `experience-cultural.webp` | 04 — Experiences | 1600 × 1600 | 1:1 | derived from p2 | ● derived | CULTURAL IMMERSION orbiting node | **YES — priority** |
| `architecture-01.webp` | ◆ — Architecture interlude | 2000 × 1250 | 8:5 | p10 | — | Strip 1 (drifts left); material study | **YES** |
| `architecture-02.webp` | ◆ — Architecture interlude | 2000 × 1250 | 8:5 | p11 | — | Strip 2 (drifts right); facade study | **YES** |
| `architecture-03.webp` | ◆ — Architecture interlude | 2000 × 1250 | 8:5 | p12 | — | Strip 3 (drifts left, faster); interior study | **YES** |
| `architecture-04.webp` | ◆ — Architecture interlude | 2000 × 1250 | 8:5 | derived from p11 | ● derived | Strip 4 (drifts right, slower); threshold study | **YES — priority** |
| `architecture-05.webp` | ◆ — Architecture interlude | 2000 × 1250 | 8:5 | derived from p6 | ● derived | Strip 1/3 second frame; detail study | **YES — priority** |
| `architecture-06.webp` | ◆ — Architecture interlude | 2000 × 1250 | 8:5 | derived from p7 | ● derived | Strip 2/4 second frame; horizon study | **YES — priority** |
| `sustainability.webp` | 05 — Sustainability | 3840 × 2160 | 16:9 | p13 | — | Full-bleed parallax bed behind the animated SVG statistics path | **YES** |
| `testimonial.webp` | 06 — Testimonial | 3200 × 2000 | 8:5 | p14 | — | Cinematic bed behind the word-by-word quote animation | **YES** |
| `testimonial-portrait.webp` | 06 — Testimonial | 760 × 950 | 4:5 | derived from p14 | ● derived | Slides in from the right via `clip-path` inset; portrait of the speaker | **YES — priority** |
| `contact.webp` | 07 — Contact | 3840 × 2160 | 16:9 | p15 | — | Slowly rotates and scales behind the closing headline and masked form | **YES** |
| `final.webp` | 08 — Final reveal | 3840 × 2160 | 16:9 | derived from p3 | ● derived | Collapses circle → ellipse → vertical slit → black before the end-credit logo | **YES — priority** |

**Priority order for the shoot:** the 8 derived slots first — they have no dedicated source at all and are the weakest frames on the page. Then the four full-bleed 16:9 beds (`hero`, `sustainability`, `contact`, `final`), which are displayed largest and show the upscaling most. Then the rest.

---

## 4. PER-ASSET DIRECTION

Each block gives the exact generation prompt from the manifest — copy-pasteable straight into an image model — and a real-world capture direction if the frame is being photographed rather than generated.

---

### `hero.webp` — 01 — Hero
**3840 × 2160 · 16:9 · source p1 · supplied frame**
Full-bleed opening frame. Scales 1.15 to 1.6 and rotates behind the pinned headline.

**Prompt**
> Ultra-wide cinematic architectural photograph, a cantilevered glass and blackened-steel residence perched above a still alpine lake, colossal moon low on the horizon, layered mountain ridges in atmospheric haze, blue hour with a thin band of warm amber light, anamorphic lens, deep shadows, dark editorial colour grading, 8k, no people

**If shot for real:** 24 mm on full frame, or a 40 mm anamorphic for the horizontal flare. Blue hour, 20–30 minutes after sunset, when the interior lights and the sky are within two stops. Landscape, tripod, f/8, bracket the sky. Because the frame scales to 1.6 and rotates behind the headline, **shoot wider than you think you need** — the top-left quadrant is the only region guaranteed to stay in view.

---

### `hero-reveal.webp` — 01 — Hero (circle reveal) · ● DERIVED
**3840 × 2160 · 16:9 · currently a 1.45× east crop of p6 · needs its own photograph**
Second frame revealed through the expanding circle() clip-path in hero phase 05.

**Prompt**
> Cinematic architectural photograph, a black-bottom infinity pool merging with a mirror-still lake at sunset, low sculptural travertine terrace, a single olive tree, warm gold rim light on water, mountains dissolving into haze, anamorphic flare, dark moody grade, 8k, no people

**If shot for real:** 35 mm, camera low and close to the pool lip so the water edge and the lake horizon fuse into one line. Sunset, sun just above the far ridge and slightly into frame for the rim light. Landscape. Tripod, polariser off (you want the reflection). The reveal opens from the **centre** of the frame, so the subject must be centred.

---

### `nature.webp` — 02 — Nature / Philosophy
**3200 × 2400 · 4:3 · source p2 · supplied frame**
Sits behind the word NATURE; revealed through letter-shaped SVG masks, then goes full-bleed.

**Prompt**
> Cinematic photograph looking through a monumental circular opening cut in a raw concrete wall onto a sunlit mountain valley with pines and a glacial lake, a single linen chaise inside the shadowed foreground, god rays, warm light against cold stone, architectural digest, 8k, no people

**If shot for real:** 28–35 mm from inside the shadowed room, sensor plane parallel to the wall so the circle stays a true circle. Mid-morning, sun high enough to light the valley but low enough for shafts. Landscape, 4:3. Expose for the valley and let the interior fall; bracket if you want detail in the chaise. This one is first read **through letterforms**, so it needs strong large-scale contrast — a busy frame turns to mush inside the mask.

---

### `residence-cliff.webp` — 03 — Residences
**1800 × 2400 · 3:4 · source p3 · supplied frame**
Panel 1 of the pinned horizontal gallery. Rotated −4°, partially clipped.

**Prompt**
> Vertical cinematic photograph of a modernist villa terraced into an Amalfi cliff face at dusk, warm interior light spilling from full-height glazing, cypress trees, dark sea below, distant coastal lights, moody film grade, medium format, 8k, no people

**If shot for real:** 50 mm, from an opposite headland or a boat. Civil twilight, roughly 20 minutes after sunset, when the interior warmth balances the remaining sky. Vertical. Tripod, long exposure to smooth the sea. The panel is rotated −4° and clipped, so **leave 8% breathing room on all four edges** — anything near the border will be cut.

---

### `residence-forest.webp` — 03 — Residences
**1800 × 2400 · 3:4 · source p4 · supplied frame**
Panel 2 of the pinned horizontal gallery. Rotated +2°.

**Prompt**
> Vertical cinematic photograph of a blackened-timber and glass house set among old-growth conifers in low mist, soft directional dawn light, deep greens desaturated to near-monochrome, one warm lit window, Pacific Northwest, 8k, no people

**If shot for real:** 85 mm to compress the trunks against the house. Dawn, in mist, within 40 minutes of sunrise. Vertical. Overcast or fog is the point — no direct sun. Leave the single warm window as the only saturated element in the frame.

---

### `residence-ocean.webp` — 03 — Residences
**1800 × 2400 · 3:4 · source p5 · supplied frame**
Panel 3 — the dominant centre frame that all panels collapse into.

**Prompt**
> Vertical cinematic photograph of a sculptural whitewashed residence on an Aegean cliff at golden hour, curved parapets, deep blue sea, long shadows, warm amber sun low in frame, editorial travel photography, 8k, no people

**If shot for real:** 35 mm, three-quarter view so the curved parapets read as volume rather than a flat wall. Golden hour, sun low and raking across the render to pick up its texture. Vertical. **This is the hero of the gallery** — every other panel collapses into it — so it should be the strongest single residence frame in the set.

---

### `residence-desert.webp` — 03 — Residences
**1800 × 2400 · 3:4 · source p6 · supplied frame**
Panel 4 of the pinned horizontal gallery. Rotated +5°, heaviest blur at rest.

**Prompt**
> Vertical cinematic photograph of a monolithic sand-toned concrete pavilion between towering dunes at sunset, long raking shadows, fine airborne dust catching light, reflecting pool at its base, minimal and severe, 8k, no people

**If shot for real:** 70–135 mm long lens to compress the dunes and make them tower over the pavilion. Last 30 minutes before sunset, when the dune shadows are longest and airborne dust is backlit. Vertical. It sits at heaviest blur at rest, so **bold shape beats fine detail** — silhouette and shadow are what survive.

---

### `residence-mountains.webp` — 03 — Residences
**1800 × 2400 · 3:4 · source p7 · supplied frame**
Panel 5 of the pinned horizontal gallery. Rotated −3°.

**Prompt**
> Vertical cinematic photograph of a glass and dark-stone chalet on a snow ridge beneath jagged alpine peaks, cold blue shadow with a single warm interior glow, blowing spindrift, high contrast, Swiss Valais, 8k, no people

**If shot for real:** 50 mm. Mid-afternoon with the chalet already in shadow while the peaks behind it still hold sun — that split is the whole picture. Vertical. Polariser to hold the sky, and a fast enough shutter (1/1000) to freeze spindrift.

---

### `experience-spa.webp` — 04 — Experiences
**2600 × 2600 · 1:1 · source p8 · supplied frame**
Fills the growing circle() mask; also the WELLNESS & SPA orbiting node.

**Prompt**
> Cinematic photograph of a dark basalt thermal bath in a vaulted stone chamber, a single circular oculus casting a shaft of warm light onto steaming water, ripples, minimal, deeply atmospheric, wet stone reflections, 8k, no people

**If shot for real:** 24 mm from the water's edge, tripod, 1–2 s exposure so the steam blurs into a body rather than freezing as speckle. Time it for when the sun aligns with the oculus — usually a 20-minute window near solar noon. Square crop from a 4:3 capture. This frame is also **shown circular** as an orbiting node, so keep the shaft of light and the pool centred and the corners quiet.

---

### `experience-yacht.webp` — 04 — Experiences
**1600 × 1600 · 1:1 · source p9 · supplied frame**
YACHT JOURNEYS orbiting node.

**Prompt**
> Cinematic aerial photograph of a dark sailing yacht crossing a molten gold sun-path on deep blue open sea at sunset, long lens compression, glittering specular highlights, minimal horizon, 8k, no people

**If shot for real:** drone at 100–150 m, 50–70 mm equivalent, looking down the sun-path. The last 20 minutes before sunset. Square. The yacht should be small in frame — the sun-path is the subject. Shown as a small circular node, so **one clear shape on one clear field**.

---

### `experience-dining.webp` — 04 — Experiences · ● DERIVED
**1600 × 1600 · 1:1 · currently a 1.55× east crop of p10 · needs its own photograph**
PRIVATE DINING orbiting node.

**Prompt**
> Cinematic photograph of a long dark oak table set for two in a raw stone dining room, candlelight and a single pendant, deep shadow, linen and hand-thrown ceramics, warm amber pools of light, Nordic fine dining, 8k, no people

**If shot for real:** 35 mm, table height, looking down its length. After dark, lit only by the candles and pendant — no fill. ISO 1600, f/2, and let the corners go black. Square. Warm the white balance rather than correcting it.

---

### `experience-cultural.webp` — 04 — Experiences · ● DERIVED
**1600 × 1600 · 1:1 · currently a 1.5× west crop of p2 · needs its own photograph**
CULTURAL IMMERSION orbiting node.

**Prompt**
> Cinematic photograph of an ancient stone colonnade at low golden hour, receding arches, dust in the light shafts, weathered limestone texture, deep shadow between columns, archaeological and reverent, 8k, no people

**If shot for real:** 24–35 mm looking straight down the colonnade, one-point perspective, camera centred between the columns. First hour after sunrise, when low sun rakes through the arches and the shafts are visible. Square. Kick a little dust if the air is too clean.

---

### `architecture-01.webp` — ◆ — Architecture interlude
**2000 × 1250 · 8:5 · source p10 · supplied frame**
Strip 1 (drifts left). Material study.

**Prompt**
> Cinematic detail photograph of board-formed concrete planes meeting at a hard shadow line, raking afternoon light, visible timber grain in the concrete, monochrome warm grey, abstract architectural minimalism, 8k

**If shot for real:** 85–105 mm, straight on, sensor parallel to the wall. Late afternoon, sun raking across the surface at a shallow angle so the board grain casts its own micro-shadows. Landscape. This is a **texture** frame that drifts horizontally, so it must work when only a third of it is visible — no single focal point.

---

### `architecture-02.webp` — ◆ — Architecture interlude
**2000 × 1250 · 8:5 · source p11 · supplied frame**
Strip 2 (drifts right). Facade study.

**Prompt**
> Cinematic photograph of a full-height glass facade grid reflecting a dusk sky, blackened steel mullions, a few warm lit interiors, precise repetition, cold blue against amber, architectural photography, 8k, no people

**If shot for real:** 70–200 mm from distance to flatten perspective, or a tilt-shift so the mullions stay perfectly vertical. Dusk, when a handful of interiors are lit but the sky still has colour to reflect. Landscape. Keep the grid dead level — this frame drifts sideways and any convergence will read as a wobble.

---

### `architecture-03.webp` — ◆ — Architecture interlude
**2000 × 1250 · 8:5 · source p12 · supplied frame**
Strip 3 (drifts left, faster). Interior study.

**Prompt**
> Cinematic photograph looking up a sculptural cantilevered stone stairwell with a single shaft of daylight falling through a slot skylight, dust motes, deep chiaroscuro, travertine and blackened steel, 8k, no people

**If shot for real:** 14–20 mm looking straight up, camera on the floor or a beanbag. Near midday, when the slot skylight throws a hard shaft rather than ambient wash. Landscape. Expose for the shaft; let everything else go to black.

---

### `architecture-04.webp` — ◆ — Architecture interlude · ● DERIVED
**2000 × 1250 · 8:5 · currently a 1.5× south crop of p11 · needs its own photograph**
Strip 4 (drifts right, slower). Threshold study.

**Prompt**
> Cinematic photograph of a travertine colonnade beside a black reflecting pool at dawn, perfect mirror reflection, cold mist over the water, single warm light at the far end, serene and monumental, 8k, no people

**If shot for real:** 35 mm at water level, tripod low. Dawn, before any wind — the mirror is the picture and it survives about 15 minutes. Landscape. Long exposure to flatten what ripple there is. The single warm light at the far end is the only warm note; everything else stays cold.

---

### `architecture-05.webp` — ◆ — Architecture interlude · ● DERIVED
**2000 × 1250 · 8:5 · currently a 1.6× north crop of p6 · needs its own photograph**
Strip 1/3 second frame. Detail study.

**Prompt**
> Cinematic detail photograph of a patinated bronze brise-soleil screen filtering low sun into a dark interior, hard bands of warm light across a stone floor, shallow depth of field, luxury material study, 8k

**If shot for real:** 50 mm at f/2 for genuinely shallow depth, focused on the near edge of the screen. Low sun, first or last hour, angled so the bands fall across the floor rather than up a wall. Landscape. Meter for the bronze, not the shadow.

---

### `architecture-06.webp` — ◆ — Architecture interlude · ● DERIVED
**2000 × 1250 · 8:5 · currently a 1.4× north crop of p7 · needs its own photograph**
Strip 2/4 second frame. Horizon study.

**Prompt**
> Cinematic photograph of a minimal stone rooftop terrace floating above a sea of low cloud at sunrise, distant peaks emerging, a single dark daybed, cold blue foreground with warm horizon, 8k, no people

**If shot for real:** 35 mm, terrace edge in the lower third, cloud sea filling the middle. Sunrise during a cloud inversion — check the forecast, this is a weather shot as much as an architecture one. Landscape. Graduated ND to hold the warm horizon against the cold foreground.

---

### `sustainability.webp` — 05 — Sustainability
**3840 × 2160 · 16:9 · source p13 · supplied frame**
Full-bleed parallax bed behind the animated SVG statistics path.

**Prompt**
> Cinematic aerial photograph of a slender elevated road curving through dense untouched rainforest canopy, morning mist in the valleys, shafts of sun, deep saturated greens graded dark and filmic, sense of scale and stewardship, 8k, no people

**If shot for real:** drone at 300–400 m, 24 mm equivalent, looking down at 45°. Early morning, an hour after sunrise, with mist still sitting in the valleys and sun shafts breaking across the canopy. Landscape. An **animated SVG statistics path is drawn over this frame**, so the upper-left half needs to stay relatively calm — put the road's curve low and right.

---

### `testimonial.webp` — 06 — Testimonial
**3200 × 2000 · 8:5 · source p14 · supplied frame**
Cinematic bed behind the word-by-word quote animation.

**Prompt**
> Cinematic photograph of a dark stone lounge at dusk, a low linear fireplace glowing, a deep boucle sofa, and a monumental circular window framing snow peaks, firelight against cold blue exterior, moody and expensive, 8k, no people

**If shot for real:** 24 mm, tripod, exposure-blended for the fire and the exterior. Dusk, at the crossover moment when interior and exterior are within about two stops. Landscape. The quote animates word by word across the middle band, so **keep the centre of the frame quiet** — the fireplace low, the window off-centre.

---

### `testimonial-portrait.webp` — 06 — Testimonial · ● DERIVED
**760 × 950 · 4:5 · currently a targeted rect crop of p14 (the figure at frame left) · needs its own photograph**
Slides in from the right via clip-path inset. Portrait of the speaker.

**Prompt**
> Low-key editorial portrait, a person in their fifties in a dark tailored overcoat, single warm side light against a near-black background, shallow depth of field, film grain, Peter Lindbergh mood, 85mm, 8k

**If shot for real:** 85 mm at f/1.4–f/2. Single warm key at 45° camera-left, black flag opposite to keep the shadow side genuinely dark, black or very deep grey seamless behind. Indoors, time of day irrelevant. Vertical, 4:5. **This is the one frame that is a real person** — if there is an actual named client giving the quote, it should be them, and their permission is a prerequisite for launch.

---

### `contact.webp` — 07 — Contact
**3840 × 2160 · 16:9 · source p15 · supplied frame**
Slowly rotates and scales behind the closing headline and masked form.

**Prompt**
> Cinematic photograph of a monumental illuminated circular portal cut through a dark rock face, mirrored shallow water floor, mist, a single distant figure for scale, cold moonlight with a warm core, surreal and monumental, 8k

**If shot for real:** 24 mm, tripod, long exposure. Night, moonlit, with the portal itself practically lit from within. Landscape. One distant figure, small, for scale. The frame **rotates slowly** behind the contact form, so the composition must survive a few degrees either way — nothing critical near a corner.

---

### `final.webp` — 08 — Final reveal · ● DERIVED
**3840 × 2160 · 16:9 · currently a 1.3× west crop of p3, graded cool · needs its own photograph**
Collapses circle to ellipse to vertical slit to black, before the end-credit logo.

**Prompt**
> Cinematic photograph of a vast calm ocean under a full moon, a single silver light-path across the water, faint clouds, no land, near-monochrome blue-black with a cold silver highlight, meditative and final, 8k

**If shot for real:** 50 mm, tripod, 2–4 s exposure at ISO 800 or so. Full moon, clear night, moon high and behind the camera. Landscape. No land in frame. The picture **collapses to a vertical slit** on the way out, so the moon's light-path must run down the **exact centre** of the frame — that vertical column is the last thing the visitor sees. Note this is the one asset graded cool rather than warm.

---

## 5. THE SHARED GRADE

All replacements must sit in the same world. Match this.

### Palette — from the `@theme` block in `src/app/globals.css`

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#05060a` | Page ground. Everything sits on this. |
| `--color-obsidian` | `#0a0b10` | Raised surfaces |
| `--color-graphite` | `#14161c` | Cards, panels |
| `--color-slate` | `#2a2d36` | Rules, dividers |
| `--color-ash` | `#6f6b62` | Muted type |
| `--color-bone` | `#b9b3a7` | Secondary type |
| `--color-ivory` | `#f2efe8` | Primary type |
| `--color-porcelain` | `#faf8f4` | Brightest highlight |
| `--color-gold` | `#c8a76a` | Accent — rules, marks, hover |
| `--color-gold-bright` | `#e8d3a3` | Accent highlight |
| `--color-gold-deep` | `#8f7440` | Accent shadow |

### How to grade

**Bold and saturated, with one warm key light. Do not darken.**

This is a deliberate reversal of the usual dark-editorial instinct, and it matters:

- **The site no longer lays a dark scrim over its photography.** `ImageFrame` renders `grade` off by default, its bottom falloff only reaches the lower 42% and only where type actually sits, and any `scrim` a section passes is hard-capped at 0.14. What is baked into the file is essentially what the visitor sees.
- So the photography has to **carry the page on its own**. A frame that is graded moody and dark will disappear into `#05060a` and the section will read as empty.
- The import script pushes saturation to ~1.24 and lifts contrast accordingly for exactly this reason. Replacements should arrive already at that level, not expecting the site to lift them.

Practically:

- **One warm key.** Amber, low, raking. Every frame in this set has a single dominant warm source — sun, fire, candle, a lit interior — and it should be identifiably one light, not an evenly lit scene.
- **Cold everything else.** The contrast between a warm key and cold ambient shadow is the signature of the whole set. Push shadows toward blue.
- **Saturation up, not down.** Rich greens, deep blues, real amber. The one exception is `final.webp`, which is intentionally near-monochrome and graded cool.
- **Protect the blacks but do not crush them.** They should sit just above `#05060a` so the frame reads as a picture and not as a hole in the page.
- **Highlights can go bright.** `--color-porcelain` `#faf8f4` is the ceiling; specular highlights on water and glass are welcome there.
- **No people** in any frame except `testimonial-portrait.webp`.

### Delivery checklist

- [ ] WebP, quality ~90
- [ ] Exact filename from the table in section 3
- [ ] Aspect ratio matches (or `width`/`height` updated in `src/lib/images.ts`)
- [ ] At or above the listed pixel dimensions, from a true high-resolution original — **not upscaled**
- [ ] Graded bold, saturated, one warm key, not darkened
- [ ] Dropped into `public/images/`, overwriting the placeholder
- [ ] `src/lib/image-blur.ts` regenerated for that key if the colour changed substantially
- [ ] Import script **not** re-run afterwards
