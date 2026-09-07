import { BLUR } from "@/lib/image-blur";

export type ImageAsset = {
  /** Manifest key used across the app: img("hero") */
  key: string;
  /** Filename inside /public/images */
  file: string;
  alt: string;
  /** Which chapter consumes it */
  section: string;
  purpose: string;
  width: number;
  height: number;
  ratio: string;
  /**
   * Provenance of the shipped photograph. Pexels content is free for commercial
   * use without attribution, but every file is traceable to its source photo:
   * https://www.pexels.com/photo/<id>/
   */
  credit: string;
  /** Procedural scene recipe used by the retired placeholder generator */
  recipe: string;
  /** Deterministic seed so placeholder regeneration is reproducible */
  seed: number;
  /** Art-direction brief for the slot — the search brief for picking a photo */
  prompt: string;
};

export const IMAGE_ASSETS: ImageAsset[] = [
  {
    key: "hero",
    file: "hero.webp",
    alt: "Full moon low over layered snow-capped ridges at blue hour above a black forest",
    section: "01 — Hero",
    purpose:
      "Full-bleed opening frame. Scales 1.15 to 1.6 and rotates behind the pinned headline.",
    width: 3840,
    height: 2160,
    ratio: "16:9",
    credit: "Pexels #34657590",
    recipe: "alpine-dusk",
    seed: 1101,
    prompt:
      "Ultra-wide cinematic architectural photograph, a cantilevered glass and blackened-steel residence perched above a still alpine lake, colossal moon low on the horizon, layered mountain ridges in atmospheric haze, blue hour with a thin band of warm amber light, anamorphic lens, deep shadows, dark editorial colour grading, 8k, no people",
  },
  {
    key: "hero-reveal",
    file: "hero-reveal.webp",
    alt: "Modernist white building mirrored in still water at dusk",
    section: "01 — Hero (circle reveal)",
    purpose:
      "Second frame revealed through the expanding circle() clip-path in hero phase 05.",
    width: 3840,
    height: 2160,
    ratio: "16:9",
    credit: "Pexels #14572307",
    recipe: "ocean-infinity",
    seed: 1102,
    prompt:
      "Cinematic architectural photograph, a black-bottom infinity pool merging with a mirror-still lake at sunset, low sculptural travertine terrace, a single olive tree, warm gold rim light on water, mountains dissolving into haze, anamorphic flare, dark moody grade, 8k, no people",
  },
  {
    key: "nature",
    file: "nature.webp",
    alt: "Sunlit mountain valley framed by a dark stone opening",
    section: "02 — Nature / Philosophy",
    purpose:
      "Sits behind the word NATURE; revealed through letter-shaped SVG masks, then goes full-bleed.",
    width: 3840,
    height: 2880,
    ratio: "4:3",
    credit: "Pexels #18709769",
    recipe: "portal-valley",
    seed: 2201,
    prompt:
      "Cinematic photograph looking through a monumental circular opening cut in a raw concrete wall onto a sunlit mountain valley with pines and a glacial lake, a single linen chaise inside the shadowed foreground, god rays, warm light against cold stone, architectural digest, 8k, no people",
  },
  {
    key: "residence-cliff",
    file: "residence-cliff.webp",
    alt: "House on a headland cliff above the sea at sunset",
    section: "03 — Residences",
    purpose:
      "Panel 1 of the pinned horizontal gallery. Rotated -4deg, partially clipped.",
    width: 2880,
    height: 3840,
    ratio: "3:4",
    credit: "Pexels #2059467",
    recipe: "cliff-villa",
    seed: 3301,
    prompt:
      "Vertical cinematic photograph of a modernist villa terraced into an Amalfi cliff face at dusk, warm interior light spilling from full-height glazing, cypress trees, dark sea below, distant coastal lights, moody film grade, medium format, 8k, no people",
  },
  {
    key: "residence-forest",
    file: "residence-forest.webp",
    alt: "Dark timber cabin against a wall of near-black conifers",
    section: "03 — Residences",
    purpose: "Panel 2 of the pinned horizontal gallery. Rotated +2deg.",
    width: 2875,
    height: 3833,
    ratio: "3:4",
    credit: "Pexels #6547200",
    recipe: "forest-house",
    seed: 3302,
    prompt:
      "Vertical cinematic photograph of a blackened-timber and glass house set among old-growth conifers in low mist, soft directional dawn light, deep greens desaturated to near-monochrome, one warm lit window, Pacific Northwest, 8k, no people",
  },
  {
    key: "residence-ocean",
    file: "residence-ocean.webp",
    alt: "White villa on a sheer cliff above a deep blue sea",
    section: "03 — Residences",
    purpose: "Panel 3 — the dominant centre frame that all panels collapse into.",
    width: 2880,
    height: 3840,
    ratio: "3:4",
    credit: "Pexels #8266995",
    recipe: "ocean-cliff",
    seed: 3303,
    prompt:
      "Vertical cinematic photograph of a sculptural whitewashed residence on an Aegean cliff at golden hour, curved parapets, deep blue sea, long shadows, warm amber sun low in frame, editorial travel photography, 8k, no people",
  },
  {
    key: "residence-desert",
    file: "residence-desert.webp",
    alt: "Dune ridge under raking light at sunset",
    section: "03 — Residences",
    purpose:
      "Panel 4 of the pinned horizontal gallery. Rotated +5deg, heaviest blur at rest.",
    width: 2880,
    height: 3840,
    ratio: "3:4",
    credit: "Pexels #28993988",
    recipe: "desert-dunes",
    seed: 3304,
    prompt:
      "Vertical cinematic photograph of a monolithic sand-toned concrete pavilion between towering dunes at sunset, long raking shadows, fine airborne dust catching light, reflecting pool at its base, minimal and severe, 8k, no people",
  },
  {
    key: "residence-mountains",
    file: "residence-mountains.webp",
    alt: "Jagged snow-covered peak against a cold sky",
    section: "03 — Residences",
    purpose: "Panel 5 of the pinned horizontal gallery. Rotated -3deg.",
    width: 2880,
    height: 3840,
    ratio: "3:4",
    credit: "Pexels #8698393",
    recipe: "snow-peaks",
    seed: 3305,
    prompt:
      "Vertical cinematic photograph of a glass and dark-stone chalet on a snow ridge beneath jagged alpine peaks, cold blue shadow with a single warm interior glow, blowing spindrift, high contrast, Swiss Valais, 8k, no people",
  },
  {
    key: "experience-spa",
    file: "experience-spa.webp",
    alt: "Dark stone rock pool with white water",
    section: "04 — Experiences",
    purpose:
      "Fills the growing circle() mask; also the WELLNESS & SPA orbiting node.",
    width: 3376,
    height: 3376,
    ratio: "1:1",
    credit: "Pexels #32577924",
    recipe: "spa-water",
    seed: 4401,
    prompt:
      "Cinematic photograph of a dark basalt thermal bath in a vaulted stone chamber, a single circular oculus casting a shaft of warm light onto steaming water, ripples, minimal, deeply atmospheric, wet stone reflections, 8k, no people",
  },
  {
    key: "experience-yacht",
    file: "experience-yacht.webp",
    alt: "Aerial view of a single boat on near-black open water",
    section: "04 — Experiences",
    purpose: "YACHT JOURNEYS orbiting node.",
    width: 3840,
    height: 3840,
    ratio: "1:1",
    credit: "Pexels #34193423",
    recipe: "yacht-sea",
    seed: 4402,
    prompt:
      "Cinematic aerial photograph of a dark sailing yacht crossing a molten gold sun-path on deep blue open sea at sunset, long lens compression, glittering specular highlights, minimal horizon, 8k, no people",
  },
  {
    key: "experience-dining",
    file: "experience-dining.webp",
    alt: "Candlelit table set in a dim panelled dining room",
    section: "04 — Experiences",
    purpose: "PRIVATE DINING orbiting node.",
    width: 3379,
    height: 3379,
    ratio: "1:1",
    credit: "Pexels #36747300",
    recipe: "dining-glow",
    seed: 4403,
    prompt:
      "Cinematic photograph of a long dark oak table set for two in a raw stone dining room, candlelight and a single pendant, deep shadow, linen and hand-thrown ceramics, warm amber pools of light, Nordic fine dining, 8k, no people",
  },
  {
    key: "experience-cultural",
    file: "experience-cultural.webp",
    alt: "Receding stone colonnade in deep shadow",
    section: "04 — Experiences",
    purpose: "CULTURAL IMMERSION orbiting node.",
    width: 3840,
    height: 3840,
    ratio: "1:1",
    credit: "Pexels #7393760",
    recipe: "cultural-arch",
    seed: 4404,
    prompt:
      "Cinematic photograph of an ancient stone colonnade at low golden hour, receding arches, dust in the light shafts, weathered limestone texture, deep shadow between columns, archaeological and reverent, 8k, no people",
  },
  {
    key: "architecture-01",
    file: "architecture-01.webp",
    alt: "Board-formed concrete planes meeting a hard shadow line",
    section: "◆ — Architecture interlude",
    purpose: "Strip 1 (drifts left). Material study.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #12800839",
    recipe: "concrete-mono",
    seed: 5501,
    prompt:
      "Cinematic detail photograph of board-formed concrete planes meeting at a hard shadow line, raking afternoon light, visible timber grain in the concrete, monochrome warm grey, abstract architectural minimalism, 8k",
  },
  {
    key: "architecture-02",
    file: "architecture-02.webp",
    alt: "Glass towers at dusk reflecting a warm sunset",
    section: "◆ — Architecture interlude",
    purpose: "Strip 2 (drifts right). Facade study.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #8672787",
    recipe: "glass-facade",
    seed: 5502,
    prompt:
      "Cinematic photograph of a full-height glass facade grid reflecting a dusk sky, blackened steel mullions, a few warm lit interiors, precise repetition, cold blue against amber, architectural photography, 8k, no people",
  },
  {
    key: "architecture-03",
    file: "architecture-03.webp",
    alt: "Geometric shaft of daylight falling across a dark stairwell",
    section: "◆ — Architecture interlude",
    purpose: "Strip 3 (drifts left, faster). Interior study.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #15663491",
    recipe: "stair-light",
    seed: 5503,
    prompt:
      "Cinematic photograph looking up a sculptural cantilevered stone stairwell with a single shaft of daylight falling through a slot skylight, dust motes, deep chiaroscuro, travertine and blackened steel, 8k, no people",
  },
  {
    key: "architecture-04",
    file: "architecture-04.webp",
    alt: "Stone columns mirrored in still dark water",
    section: "◆ — Architecture interlude",
    purpose: "Strip 4 (drifts right, slower). Threshold study.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #20207682",
    recipe: "colonnade-pool",
    seed: 5504,
    prompt:
      "Cinematic photograph of a travertine colonnade beside a black reflecting pool at dawn, perfect mirror reflection, cold mist over the water, single warm light at the far end, serene and monumental, 8k, no people",
  },
  {
    key: "architecture-05",
    file: "architecture-05.webp",
    alt: "Low sun banding through a timber screen into a dark room",
    section: "◆ — Architecture interlude",
    purpose: "Strip 1/3 second frame. Detail study.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #13692644",
    recipe: "bronze-screen",
    seed: 5505,
    prompt:
      "Cinematic detail photograph of a patinated bronze brise-soleil screen filtering low sun into a dark interior, hard bands of warm light across a stone floor, shallow depth of field, luxury material study, 8k",
  },
  {
    key: "architecture-06",
    file: "architecture-06.webp",
    alt: "Mountain peaks emerging above a sea of low cloud",
    section: "◆ — Architecture interlude",
    purpose: "Strip 2/4 second frame. Horizon study.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #30322584",
    recipe: "cloud-terrace",
    seed: 5506,
    prompt:
      "Cinematic photograph of a minimal stone rooftop terrace floating above a sea of low cloud at sunrise, distant peaks emerging, a single dark daybed, cold blue foreground with warm horizon, 8k, no people",
  },
  {
    key: "sustainability",
    file: "sustainability.webp",
    alt: "Aerial view of a road curving through dense forest canopy",
    section: "05 — Sustainability",
    purpose:
      "Full-bleed parallax bed behind the animated SVG statistics path.",
    width: 3840,
    height: 2160,
    ratio: "16:9",
    credit: "Pexels #15328419",
    recipe: "forest-road",
    seed: 6601,
    prompt:
      "Cinematic aerial photograph of a slender elevated road curving through dense untouched rainforest canopy, morning mist in the valleys, shafts of sun, deep saturated greens graded dark and filmic, sense of scale and stewardship, 8k, no people",
  },
  {
    key: "testimonial",
    file: "testimonial.webp",
    alt: "Dark panelled room with tall warm-lit windows onto a landscape",
    section: "06 — Testimonial",
    purpose: "Cinematic bed behind the word-by-word quote animation.",
    width: 3840,
    height: 2400,
    ratio: "8:5",
    credit: "Pexels #13207063",
    recipe: "interior-fire",
    seed: 7701,
    prompt:
      "Cinematic photograph of a dark stone lounge at dusk, a low linear fireplace glowing, a deep boucle sofa, and a monumental circular window framing snow peaks, firelight against cold blue exterior, moody and expensive, 8k, no people",
  },
  {
    key: "testimonial-portrait",
    file: "testimonial-portrait.webp",
    alt: "Low-key portrait in warm side light against a near-black ground",
    section: "06 — Testimonial",
    purpose:
      "Slides in from the right via clip-path inset. Portrait of the speaker.",
    width: 3072,
    height: 3840,
    ratio: "4:5",
    credit: "Pexels #31870740",
    recipe: "portrait-lowkey",
    seed: 7702,
    prompt:
      "Low-key editorial portrait, a person in their fifties in a dark tailored overcoat, single warm side light against a near-black background, shallow depth of field, film grain, Peter Lindbergh mood, 85mm, 8k",
  },
  {
    key: "contact",
    file: "contact.webp",
    alt: "Illuminated arches receding over a dark avenue",
    section: "07 — Contact",
    purpose:
      "Slowly rotates and scales behind the closing headline and masked form.",
    width: 3840,
    height: 2160,
    ratio: "16:9",
    credit: "Pexels #14506204",
    recipe: "moon-portal",
    seed: 8801,
    prompt:
      "Cinematic photograph of a monumental illuminated circular portal cut through a dark rock face, mirrored shallow water floor, mist, a single distant figure for scale, cold moonlight with a warm core, surreal and monumental, 8k",
  },
  {
    key: "final",
    file: "final.webp",
    alt: "Full moon over a calm sea with a silver light path",
    section: "08 — Final reveal",
    purpose:
      "Collapses circle to ellipse to vertical slit to black, before the end-credit logo.",
    width: 3840,
    height: 2160,
    ratio: "16:9",
    credit: "Pexels #14539405",
    recipe: "moon-water",
    seed: 9901,
    prompt:
      "Cinematic photograph of a vast calm ocean under a full moon, a single silver light-path across the water, faint clouds, no land, near-monochrome blue-black with a cold silver highlight, meditative and final, 8k",
  },
];

export const IMAGE_MAP: Record<string, ImageAsset> = Object.fromEntries(
  IMAGE_ASSETS.map((a) => [a.key, a]),
);

/** Everything next/image needs for a manifest key. Spread it onto <Image/>. */
export function img(key: string) {
  const a = IMAGE_MAP[key];
  if (!a) {
    throw new Error("[AURUM] Unknown image key: " + key);
  }
  const blur = BLUR[a.key];
  return {
    src: "/images/" + a.file,
    alt: a.alt,
    width: a.width,
    height: a.height,
    blurDataURL: blur,
    placeholder: (blur ? "blur" : "empty") as "blur" | "empty",
  };
}
