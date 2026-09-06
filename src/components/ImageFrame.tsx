"use client";

import Image from "next/image";
import { img } from "@/lib/images";

type CursorLabel = "view" | "drag" | "enter" | "scroll" | false;

type Props = {
  /** Key from the IMAGE_ASSETS manifest, e.g. "hero" */
  name: string;
  /** Classes for the positioned wrapper (must establish size + position). */
  className?: string;
  /** Classes for the <img> itself — use for object-position tweaks. */
  imgClassName?: string;
  /**
   * Soft bottom falloff for text legibility. OFF by default — the photography
   * is graded bold in `scripts/import-source-images.mjs` and is meant to be
   * seen, not veiled. Turn it on only where type sits directly over a frame.
   */
  grade?: boolean;
  /** Inset shadow vignette. */
  vignette?: boolean;
  priority?: boolean;
  sizes?: string;
  /** Extra flat overlay tint, 0–1. */
  scrim?: number;
  /** Custom-cursor affordance broadcast on hover. */
  cursor?: CursorLabel;
  /** Wrapper style passthrough (clip-path start states etc.) */
  style?: React.CSSProperties;
  /** Applied to the inner scaling layer — the element GSAP should transform. */
  innerClassName?: string;
  children?: React.ReactNode;
};

/**
 * Only fall back to `relative` when the caller has not positioned the frame
 * itself.
 *
 * This is load-bearing. Tailwind emits `.relative` AFTER `.absolute` in the
 * stylesheet, and class-attribute order means nothing to the cascade — so a
 * hard-coded `relative` in the base string silently beat every caller's
 * `absolute`. The frame then had auto height, its `absolute inset-0` inner
 * layer resolved to 0px, and the `<Image fill>` rendered 0x0: whole chapters
 * opened on black while their choreography played over nothing.
 */
function positionClass(className: string) {
  return /(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className)
    ? ""
    : "relative";
}

/**
 * The single image primitive for the whole site.
 *
 * Structure is deliberately three-deep so animations always have a clean
 * transform target that never fights the clip-path on the wrapper:
 *
 *   .frame        <- wrapper: sizing, clip-path, masks   (className)
 *     .frame-inner  <- transform target: scale/rotate/x/y (innerClassName)
 *       <img>       <- fills, object-cover               (imgClassName)
 *       .grade      <- grading overlay
 */
export default function ImageFrame({
  name,
  className = "",
  imgClassName = "",
  innerClassName = "",
  grade = false,
  vignette = false,
  priority = false,
  sizes = "100vw",
  scrim = 0,
  cursor = false,
  style,
  children,
}: Props) {
  const a = img(name);

  return (
    <div
      className={`frame ${positionClass(className)} overflow-hidden ${className}`}
      style={style}
      data-cursor={cursor || undefined}
    >
      <div
        className={`frame-inner absolute inset-0 h-full w-full ${innerClassName}`}
      >
        <Image
          src={a.src}
          alt={a.alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={90}
          placeholder={a.placeholder}
          blurDataURL={a.blurDataURL}
          className={`h-full w-full object-cover ${imgClassName}`}
          draggable={false}
        />
        {grade ? (
          // Bottom-only falloff, and only as far up as type actually reaches.
          // No radial darkening — that is what was flattening the photography.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, transparent 58%, rgba(5,6,10,0.42) 100%)",
            }}
          />
        ) : null}
        {vignette ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: "inset 0 0 14vw 3vw rgba(5,6,10,0.3)" }}
          />
        ) : null}
        {scrim > 0 ? (
          // Hard-capped: sections were passing values up to 0.36, which read as
          // a grey veil over the whole frame.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `rgba(5,6,10,${Math.min(scrim, 0.14)})` }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}
