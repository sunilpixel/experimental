# Image credits

Every photograph on this site — all **23** of them — comes from [Pexels](https://www.pexels.com/).

The Pexels licence permits commercial use **without attribution**, so nothing here is
legally required. These credits are recorded anyway for two reasons: so the provenance of
every shipped file stays traceable back to its source photograph, and so the photographers
can be properly credited if the client chooses to publish a credits page.

**How to read this file**

- **Filename** is the file in `public/images/`.
- **Section** is the `section` field from `src/lib/images.ts` — the chapter that consumes
  the image. A few frames are reused elsewhere (the architecture strips also appear in the
  Passage interlude, and three residence frames reappear behind the Testimonial), but each
  image is credited once, against its primary chapter.
- **Photo id** is the number in the Pexels URL. It is the id recorded in
  `scripts/picks/*.json`, which is what `scripts/fetch-pexels-images.mjs` actually
  downloads.
- Photographer names are taken from the Pexels photo page for each id.

**A note on five names.** The photographers for photo ids 2059467, 8266995, 12800839,
14572307 and 18802079 were first recovered from XMP/EXIF metadata embedded in the
downloaded originals. Those five were then cross-checked against their Pexels pages. Three
agreed (allowing for casing and username-vs-display-name); **two did not** — see
[Needs manual check](#needs-manual-check) at the end. Where the two sources disagree, the
name credited below is the one shown on the Pexels photo page, since that is the
authoritative credit for a Pexels image.

---

## Credits table

| Filename | Section | Photographer | Pexels URL |
| --- | --- | --- | --- |
| `hero.webp` | 01 — Hero | Luke Miller | https://www.pexels.com/photo/18802079/ |
| `hero-reveal.webp` | 01 — Hero (circle reveal) | Ljubisa Pokrajac | https://www.pexels.com/photo/14572307/ |
| `nature.webp` | 02 — Nature / Philosophy | Stijn Dijkstra | https://www.pexels.com/photo/18709769/ |
| `residence-cliff.webp` | 03 — Residences | Tobias Bjørkli | https://www.pexels.com/photo/2059467/ |
| `residence-forest.webp` | 03 — Residences | Dmitry Zvolskiy | https://www.pexels.com/photo/6547200/ |
| `residence-ocean.webp` | 03 — Residences | Erik Mclean | https://www.pexels.com/photo/8266995/ |
| `residence-desert.webp` | 03 — Residences | Jean-Daniel Francoeur | https://www.pexels.com/photo/28993988/ |
| `residence-mountains.webp` | 03 — Residences | Valeria Nikitina | https://www.pexels.com/photo/8698393/ |
| `experience-spa.webp` | 04 — Experiences | X1ntao ZHOU | https://www.pexels.com/photo/32577924/ |
| `experience-yacht.webp` | 04 — Experiences | Ugur Tandogan | https://www.pexels.com/photo/34193423/ |
| `experience-dining.webp` | 04 — Experiences | Max Griss | https://www.pexels.com/photo/36747300/ |
| `experience-cultural.webp` | 04 — Experiences | Matteo Basile | https://www.pexels.com/photo/7393760/ |
| `architecture-01.webp` | ◆ — Architecture interlude | Kaan Keskin | https://www.pexels.com/photo/12800839/ |
| `architecture-02.webp` | ◆ — Architecture interlude | Ale Bustos | https://www.pexels.com/photo/8672787/ |
| `architecture-03.webp` | ◆ — Architecture interlude | IAN | https://www.pexels.com/photo/15663491/ |
| `architecture-04.webp` | ◆ — Architecture interlude | Laura Cleffmann | https://www.pexels.com/photo/20207682/ |
| `architecture-05.webp` | ◆ — Architecture interlude | Francesco Nasi | https://www.pexels.com/photo/13692644/ |
| `architecture-06.webp` | ◆ — Architecture interlude | Diogo Miranda | https://www.pexels.com/photo/30322584/ |
| `sustainability.webp` | 05 — Sustainability | Andreas Ebner | https://www.pexels.com/photo/15328419/ |
| `testimonial.webp` | 06 — Testimonial | Aviz Media | https://www.pexels.com/photo/13207063/ |
| `testimonial-portrait.webp` | 06 — Testimonial | Mâide Arslan | https://www.pexels.com/photo/31870740/ |
| `contact.webp` | 07 — Contact | Wellington Silva | https://www.pexels.com/photo/14506204/ |
| `final.webp` | 08 — Final reveal | Pramod Tiwari | https://www.pexels.com/photo/14539405/ |

---

## Per-image detail

Dimensions below are the dimensions declared for each slot in `src/lib/images.ts`. The
description of each frame is taken from the `note` field of the corresponding entry in
`scripts/picks/*.json`.

### `hero.webp`
- **Photographer:** Luke Miller
- **Section:** 01 — Hero
- **Pexels page:** https://www.pexels.com/photo/18802079/
- **Original file:** https://images.pexels.com/photos/18802079/pexels-photo-18802079.jpeg
- **Dimensions:** 2560 × 1440 (16:9)
- **The frame shows:** a flat-roofed timber and stone house with warm-lit windows set into a dark conifer headland above the sea at last light.

### `hero-reveal.webp`
- **Photographer:** Ljubisa Pokrajac
- **Section:** 01 — Hero (circle reveal)
- **Pexels page:** https://www.pexels.com/photo/14572307/
- **Original file:** https://images.pexels.com/photos/14572307/pexels-photo-14572307.jpeg
- **Dimensions:** 2560 × 1440 (16:9)
- **The frame shows:** mist lifting off dark still water against a conifer treeline at dusk, a single band of warm light on the horizon.

### `nature.webp`
- **Photographer:** Stijn Dijkstra
- **Section:** 02 — Nature / Philosophy
- **Pexels page:** https://www.pexels.com/photo/18709769/
- **Original file:** https://images.pexels.com/photos/18709769/pexels-photo-18709769.jpeg
- **Dimensions:** 2400 × 1800 (4:3)
- **The frame shows:** a stone arched watchtower window opening onto layered misty ridges, with a near-black masonry surround.

### `residence-cliff.webp`
- **Photographer:** Tobias Bjørkli
- **Section:** 03 — Residences
- **Pexels page:** https://www.pexels.com/photo/2059467/
- **Original file:** https://images.pexels.com/photos/2059467/pexels-photo-2059467.jpeg
- **Dimensions:** 1600 × 2133 (3:4)
- **The frame shows:** a cantilevered glass and timber house on a snowy slope at dusk, warm interior light against a teal sky.

### `residence-forest.webp`
- **Photographer:** Dmitry Zvolskiy
- **Section:** 03 — Residences
- **Pexels page:** https://www.pexels.com/photo/6547200/
- **Original file:** https://images.pexels.com/photos/6547200/pexels-photo-6547200.jpeg
- **Dimensions:** 1600 × 2133 (3:4)
- **The frame shows:** a timber-clad upper volume cantilevered over a charcoal glazed ground floor among tall pines, snow on the ground, flat white sky.

### `residence-ocean.webp`
- **Photographer:** Erik Mclean
- **Section:** 03 — Residences
- **Pexels page:** https://www.pexels.com/photo/8266995/
- **Original file:** https://images.pexels.com/photos/8266995/pexels-photo-8266995.jpeg
- **Dimensions:** 1600 × 2133 (3:4)
- **The frame shows:** a sculptural white timber studio with a folded cantilevered roof on bare coastal rock above a grey North Atlantic.

### `residence-desert.webp`
- **Photographer:** Jean-Daniel Francoeur
- **Section:** 03 — Residences
- **Pexels page:** https://www.pexels.com/photo/28993988/
- **Original file:** https://images.pexels.com/photos/28993988/pexels-photo-28993988.jpeg
- **Dimensions:** 1600 × 2133 (3:4)
- **The frame shows:** raw board-formed concrete courtyard walls with two low benches in warm arid light.

### `residence-mountains.webp`
- **Photographer:** Valeria Nikitina
- **Section:** 03 — Residences
- **Pexels page:** https://www.pexels.com/photo/8698393/
- **Original file:** https://images.pexels.com/photos/8698393/pexels-photo-8698393.jpeg
- **Dimensions:** 1600 × 2133 (3:4)
- **The frame shows:** a long glazed pavilion glowing warm amber behind snow-covered boulders and bare trees at blue hour.

### `experience-spa.webp`
- **Photographer:** X1ntao ZHOU
- **Section:** 04 — Experiences
- **Pexels page:** https://www.pexels.com/photo/32577924/
- **Original file:** https://images.pexels.com/photos/32577924/pexels-photo-32577924.jpeg
- **Dimensions:** 1800 × 1800 (1:1)
- **The frame shows:** steaming geothermal water against a muted mineral shore under overcast light.

### `experience-yacht.webp`
- **Photographer:** Ugur Tandogan
- **Section:** 04 — Experiences
- **Pexels page:** https://www.pexels.com/photo/34193423/
- **Original file:** https://images.pexels.com/photos/34193423/pexels-photo-34193423.jpeg
- **Dimensions:** 1800 × 1800 (1:1)
- **The frame shows:** an overhead drone view of a white motor yacht under way, its wake cutting across near-black open water.

### `experience-dining.webp`
- **Photographer:** Max Griss
- **Section:** 04 — Experiences
- **Pexels page:** https://www.pexels.com/photo/36747300/
- **Original file:** https://images.pexels.com/photos/36747300/pexels-photo-36747300.jpeg
- **Dimensions:** 1800 × 1800 (1:1)
- **The frame shows:** a long timber table laid with glassware and linen in a dim room, lit only by two tapers and a wall sconce against a deep slate-green wall.

### `experience-cultural.webp`
- **Photographer:** Matteo Basile
- **Section:** 04 — Experiences
- **Pexels page:** https://www.pexels.com/photo/7393760/
- **Original file:** https://images.pexels.com/photos/7393760/pexels-photo-7393760.jpeg
- **Dimensions:** 1800 × 1800 (1:1)
- **The frame shows:** a black-and-white view along a classical stone colonnade, low raking sun striping the travertine columns and casting long shadows across the cobbles.

### `architecture-01.webp`
- **Photographer:** Kaan Keskin
- **Section:** ◆ — Architecture interlude
- **Pexels page:** https://www.pexels.com/photo/12800839/
- **Original file:** https://images.pexels.com/photos/12800839/pexels-photo-12800839.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** a board-formed concrete wall with visible timber grain and tie holes, cut diagonally by the hard black shadow of a projecting soffit.

### `architecture-02.webp`
- **Photographer:** Ale Bustos
- **Section:** ◆ — Architecture interlude
- **Pexels page:** https://www.pexels.com/photo/8672787/
- **Original file:** https://images.pexels.com/photos/8672787/pexels-photo-8672787.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** a near-black facade of staggered dark metal and glass panels seen at a raking angle, filling the frame as a repeating grid.

### `architecture-03.webp`
- **Photographer:** IAN
- **Section:** ◆ — Architecture interlude
- **Pexels page:** https://www.pexels.com/photo/15663491/
- **Original file:** https://images.pexels.com/photos/15663491/pexels-photo-15663491.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** a black-and-white interior stairwell void where a ceiling light slot throws a single hard wedge of daylight down a white wall, the stair balustrade in silhouette at right.

### `architecture-04.webp`
- **Photographer:** Laura Cleffmann
- **Section:** ◆ — Architecture interlude
- **Pexels page:** https://www.pexels.com/photo/20207682/
- **Original file:** https://images.pexels.com/photos/20207682/pexels-photo-20207682.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** a monochrome dusk view of a low glass-and-concrete pavilion behind a long board-formed wall, mirrored in the still dark water of a reflecting pool, bare branches overhead.

### `architecture-05.webp`
- **Photographer:** Francesco Nasi
- **Section:** ◆ — Architecture interlude
- **Pexels page:** https://www.pexels.com/photo/13692644/
- **Original file:** https://images.pexels.com/photos/13692644/pexels-photo-13692644.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** low sun raking through a full-height vertical louvre screen, scattering bands and dapples of light across a polished stone floor in an otherwise dark room.

### `architecture-06.webp`
- **Photographer:** Diogo Miranda
- **Section:** ◆ — Architecture interlude
- **Pexels page:** https://www.pexels.com/photo/30322584/
- **Original file:** https://images.pexels.com/photos/30322584/pexels-photo-30322584.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** a near-black mountain ridge filling the lower frame with cloud tearing across it in white ribbons, a pale misty valley and further ridges receding above at first light.

### `sustainability.webp`
- **Photographer:** Andreas Ebner
- **Section:** 05 — Sustainability
- **Pexels page:** https://www.pexels.com/photo/15328419/
- **Original file:** https://images.pexels.com/photos/15328419/pexels-photo-15328419.jpeg
- **Dimensions:** 2560 × 1440 (16:9)
- **The frame shows:** an aerial view at dusk of dark forested ridges rising out of a sea of fog filling the valleys below, in near-monochrome blue-grey.

### `testimonial.webp`
- **Photographer:** Aviz Media
- **Section:** 06 — Testimonial
- **Pexels page:** https://www.pexels.com/photo/13207063/
- **Original file:** https://images.pexels.com/photos/13207063/pexels-photo-13207063.jpeg
- **Dimensions:** 2200 × 1375 (8:5)
- **The frame shows:** a long linear gas fireplace burning along a dark steel and glass surround, the single source of light in an otherwise black room.

### `testimonial-portrait.webp`
- **Photographer:** Mâide Arslan
- **Section:** 06 — Testimonial
- **Pexels page:** https://www.pexels.com/photo/31870740/
- **Original file:** https://images.pexels.com/photos/31870740/pexels-photo-31870740.jpeg
- **Dimensions:** 1400 × 1750 (4:5)
- **The frame shows:** a profile portrait of an older man with a white beard and grey hair tied back, wearing a heavy salt-and-pepper tweed coat, lit softly from one side against a near-black ground.

### `contact.webp`
- **Photographer:** Wellington Silva
- **Section:** 07 — Contact
- **Pexels page:** https://www.pexels.com/photo/14506204/
- **Original file:** https://images.pexels.com/photos/14506204/pexels-photo-14506204.jpeg
- **Dimensions:** 2560 × 1440 (16:9)
- **The frame shows:** a tall stone portal framing a receding barrel-vaulted colonnade in cold pale grey-green light, ending at a dark door marked by three small brass lamps.

### `final.webp`
- **Photographer:** Pramod Tiwari
- **Section:** 08 — Final reveal
- **Pexels page:** https://www.pexels.com/photo/14539405/
- **Original file:** https://images.pexels.com/photos/14539405/pexels-photo-14539405.jpeg
- **Dimensions:** 2560 × 1440 (16:9)
- **The frame shows:** a full moon low over a calm dark sea with a single silver light path, hills in silhouette either side.

---

## Needs manual check

Nothing is unattributed — a photographer was resolved for all 23 images. The entries below
are worth a human glance before this list is published anywhere public.

**Two names where embedded file metadata disagrees with the Pexels page.** In both cases
the Pexels byline was confirmed on a second, more specific lookup, and the Pexels name is
what this file credits. The metadata value may belong to whoever edited or exported the
file rather than to the photographer, but the conflict has not been explained.

| Photo id | Credited here (Pexels page) | Name found in file metadata |
| --- | --- | --- |
| 2059467 (`residence-cliff.webp`) | Tobias Bjørkli | Henning Kristensen |
| 8266995 (`residence-ocean.webp`) | Erik Mclean | LUXXCREATIVE.COM |

**Three names where metadata and Pexels agree,** recorded for transparency. These needed
only a casing or handle-vs-display-name reconciliation and are not in doubt: 12800839
metadata `KAAN KESKIN` → Kaan Keskin; 14572307 metadata `ljubo2mad` (the contributor's
username) → Ljubisa Pokrajac; 18802079 metadata `LUKE MILLER_PHOTOGRAPH` → Luke Miller.

**Two names whose written form should be confirmed** — the identities are not in doubt.
Both are reproduced exactly as the contributor styles them on Pexels and have deliberately
not been tidied into normal case: **IAN** (15663491) and **X1ntao ZHOU** (32577924).

---

## Regenerating the images

Every file in `public/images/` is produced by `scripts/fetch-pexels-images.mjs`. It is the
single path from a Pexels photo id to a shipped asset:

- The photo ids live in `scripts/picks/*.json`. The script joins those picks with
  `src/lib/images.ts` (filename and aspect ratio) to build its manifest, so **the picks
  files are the source of truth for which photograph fills each slot.**
- It downloads the **ORIGINAL** file —
  `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg` with no query string.
  This is deliberate: appending `?w=` caps the **width**, so a large landscape original
  silently comes back too small to fill a portrait slot. The original is taken whole and
  every resize is done locally.
- Originals are cached in `node_modules/.cache/aurum-pexels` (~40MB, gitignored). They must
  not be moved under `public/`, since anything there is served by Next and shipped in the
  deployment.

```
node scripts/fetch-pexels-images.mjs          # rebuild everything
node scripts/fetch-pexels-images.mjs hero     # rebuild single keys
```

**Re-running it overwrites everything in `public/images/`** — the `.webp` assets, the
`public/images/preview/` JPEGs, and the generated `src/lib/image-blur.ts`. Any manual edit
to a file in that directory is lost on the next run; change the pick or the script instead.
