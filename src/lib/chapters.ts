/**
 * AURUM — chapter spine.
 * Single source of truth for the vertical timeline, the navigation tone
 * inversion, and the section anchors. Sections declare `data-chapter={id}`
 * on their root; <ChapterProgress/> observes them centrally.
 */

export type Tone = "light" | "dark";

export type Chapter = {
  /** Displayed in the vertical timeline. "◆" marks an unnumbered interlude. */
  numeral: string;
  id: string;
  /** Two-line label shown beside the numeral. */
  label: [string, string];
  /** Background luminance while this chapter owns the viewport. */
  tone: Tone;
  interlude?: boolean;
};

export const CHAPTERS: Chapter[] = [
  { numeral: "01", id: "hero", label: ["A NEW DIMENSION", "OF LUXURY"], tone: "dark" },
  { numeral: "02", id: "nature", label: ["OUR", "PHILOSOPHY"], tone: "light" },
  { numeral: "03", id: "residences", label: ["ICONIC", "RESIDENCES"], tone: "dark" },
  { numeral: "◇", id: "passage", label: ["THE", "PASSAGE"], tone: "dark", interlude: true },
  { numeral: "04", id: "experiences", label: ["CURATED", "EXPERIENCES"], tone: "dark" },
  { numeral: "◆", id: "architecture", label: ["FORM", "AND MATERIAL"], tone: "dark", interlude: true },
  { numeral: "05", id: "sustainability", label: ["A BETTER", "TOMORROW"], tone: "light" },
  { numeral: "06", id: "testimonial", label: ["VOICES", "THAT MATTER"], tone: "dark" },
  { numeral: "07", id: "contact", label: ["GET", "IN TOUCH"], tone: "dark" },
];

export const NAV_LINKS = [
  { label: "PHILOSOPHY", target: "#nature" },
  { label: "RESIDENCES", target: "#residences" },
  { label: "EXPERIENCES", target: "#experiences" },
  { label: "JOURNAL", target: "#architecture" },
  { label: "CONTACT", target: "#contact" },
];

export const RESIDENCES = [
  { name: "THE CLIFF", place: "TROMS, NORWAY", year: "2023", area: "820 m²", image: "residence-cliff" },
  { name: "THE FOREST", place: "TOFINO, CANADA", year: "2022", area: "640 m²", image: "residence-forest" },
  { name: "THE OCEAN", place: "MILOS, GREECE", year: "2024", area: "1,140 m²", image: "residence-ocean" },
  { name: "THE DESERT", place: "AL FAYA, UAE", year: "2023", area: "980 m²", image: "residence-desert" },
  { name: "THE MOUNTAINS", place: "VALAIS, SWITZERLAND", year: "2025", area: "1,320 m²", image: "residence-mountains" },
] as const;

export const EXPERIENCES = [
  { label: "PRIVATE DINING", image: "experience-dining" },
  { label: "THERMAL WATERS", image: "experience-spa" },
  { label: "YACHT JOURNEYS", image: "experience-yacht" },
  { label: "CULTURAL IMMERSION", image: "experience-cultural" },
] as const;

export const STATS = [
  { value: "100%", label: "RENEWABLE ENERGY" },
  { value: "50K+", label: "TREES PLANTED" },
  { value: "ZERO", label: "SINGLE-USE PLASTIC" },
] as const;
