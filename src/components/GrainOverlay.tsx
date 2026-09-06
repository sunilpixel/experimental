"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, MQ } from "@/lib/gsap";

/**
 * 35mm film grain.
 *
 * The texture is an inline feTurbulence tile (no network request, no PNG), and
 * the "movement" is not a smooth tween — real grain does not slide, it JUMPS.
 * So the plate is hard-cut between eight fixed offsets on a ~9fps step loop,
 * which is what sells it as emulsion rather than a static noise overlay.
 */

const GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>" +
  "<filter id='g' x='0%' y='0%' width='100%' height='100%'>" +
  "<feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch' seed='11'/>" +
  "<feColorMatrix type='saturate' values='0'/>" +
  "</filter>" +
  "<rect width='220' height='220' filter='url(#g)'/>" +
  "</svg>";

const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

/** Eight deterministic hard-cut positions — never Math.random(). */
const OFFSETS: readonly [number, number][] = [
  [0, 0],
  [-13, 8],
  [9, -15],
  [-6, 17],
  [15, 4],
  [-16, -9],
  [5, 13],
  [-9, -5],
];

const STEP = 0.11;

export default function GrainOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  // Mount-gate on motion preference so reduced-motion users get no element at
  // all (CSS already hides .grain, but there is no reason to paint it either).
  useEffect(() => {
    if (window.matchMedia(MQ.reduced).matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const tl = gsap.timeline({ repeat: -1 });
    OFFSETS.forEach(([x, y]) => {
      tl.set(el, { x, y, force3D: true });
      tl.to({}, { duration: STEP });
    });

    return () => {
      tl.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="grain"
      style={{ "--grain-url": GRAIN_URL } as React.CSSProperties}
    />
  );
}
