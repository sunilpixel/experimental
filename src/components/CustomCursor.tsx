"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, MQ } from "@/lib/gsap";

/**
 * The AURUM pointer. Desktop, fine-pointer, motion-allowed only.
 *
 * Two bodies with different masses: a gold dot that is almost exact, and a
 * hairline ring that lags behind it. Both are driven by gsap.quickTo — one
 * cached tween per axis, mutated on pointermove — so a mousemove never touches
 * the style attribute directly and never allocates a tween.
 *
 * State is read from the closest [data-cursor] ancestor of whatever the pointer
 * is over, so sections declare their own affordances and this file never has to
 * know about them.
 */

type CursorKey = "default" | "view" | "drag" | "enter" | "scroll" | "link";

type CursorState = {
  ring: number;
  dot: number;
  plate: string;
  label: string;
  chevrons: number;
};

const STATES: Record<CursorKey, CursorState> = {
  default: { ring: 1, dot: 1, plate: "rgba(5,6,10,0)", label: "", chevrons: 0 },
  link: { ring: 1.65, dot: 0.42, plate: "rgba(5,6,10,0)", label: "", chevrons: 0 },
  view: { ring: 4.2, dot: 0, plate: "rgba(5,6,10,0.34)", label: "VIEW", chevrons: 0 },
  drag: { ring: 4.6, dot: 0, plate: "rgba(5,6,10,0.34)", label: "DRAG", chevrons: 1 },
  enter: { ring: 3.6, dot: 0, plate: "rgba(5,6,10,0.28)", label: "ENTER →", chevrons: 0 },
  scroll: { ring: 3.2, dot: 0, plate: "rgba(5,6,10,0.28)", label: "SCROLL", chevrons: 0 },
};

const INTERACTIVE =
  "a,button,input,textarea,select,summary,[role=button],[role=link]";

const CLIPPED = "inset(0% 0% 100% 0%)";
const OPEN = "inset(0% 0% 0% 0%)";

function resolveKey(el: Element | null): CursorKey {
  if (!el) return "default";
  const tagged = el.closest<HTMLElement>("[data-cursor]");
  if (tagged) {
    const raw = tagged.dataset.cursor;
    if (raw === "view" || raw === "drag" || raw === "enter" || raw === "scroll") {
      return raw;
    }
  }
  return el.closest(INTERACTIVE) ? "link" : "default";
}

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const chevLeftRef = useRef<HTMLSpanElement>(null);
  const chevRightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia(MQ.reduced).matches;
    if (fine && !reduced) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const follow = followRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    const chevL = chevLeftRef.current;
    const chevR = chevRightRef.current;
    if (!dot || !follow || !ring || !label || !chevL || !chevR) return;

    const html = document.documentElement;
    html.classList.add("has-custom-cursor");

    gsap.set([dot, follow], { xPercent: -50, yPercent: -50, force3D: true });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3" });
    const ringX = gsap.quickTo(follow, "x", { duration: 0.55, ease: "power3" });
    const ringY = gsap.quickTo(follow, "y", { duration: 0.55, ease: "power3" });

    let visible = false;
    let placed = false;
    let key: CursorKey = "default";
    let pressed = false;

    const show = () => {
      if (visible) return;
      visible = true;
      gsap.to([dot, follow], {
        opacity: 1,
        duration: 0.35,
        ease: "aurum",
        overwrite: "auto",
      });
    };

    const hide = () => {
      if (!visible) return;
      visible = false;
      gsap.to([dot, follow], {
        opacity: 0,
        duration: 0.25,
        ease: "aurumIn",
        overwrite: "auto",
      });
    };

    const paint = (next: CursorKey) => {
      if (next === key) return;
      const prevLabel = STATES[key].label;
      key = next;
      const s = STATES[next];

      gsap.to(ring, {
        scale: s.ring * (pressed ? 0.85 : 1),
        backgroundColor: s.plate,
        borderColor:
          next === "default" || next === "link"
            ? "rgb(var(--nav-fg) / 0.55)"
            : "rgb(var(--nav-fg) / 0.34)",
        duration: 0.62,
        ease: "aurum",
        overwrite: "auto",
      });

      gsap.to(dot, {
        scale: s.dot,
        opacity: s.dot === 0 ? 0 : 1,
        duration: 0.5,
        ease: "aurum",
        overwrite: "auto",
      });

      gsap.to([chevL, chevR], {
        opacity: s.chevrons,
        x: (i: number) => (i === 0 ? -1 : 1) * (s.chevrons ? 64 : 42),
        duration: 0.55,
        ease: "aurum",
        overwrite: "auto",
      });

      if (s.label === prevLabel) return;

      gsap.killTweensOf(label);

      if (!s.label) {
        gsap.to(label, {
          clipPath: CLIPPED,
          opacity: 0,
          scale: 0.86,
          duration: 0.3,
          ease: "aurumIn",
          onComplete: () => {
            label.textContent = "";
          },
        });
        return;
      }

      label.textContent = s.label;
      gsap.fromTo(
        label,
        { clipPath: CLIPPED, opacity: 0, scale: 0.82, yPercent: 34 },
        {
          clipPath: OPEN,
          opacity: 1,
          scale: 1,
          yPercent: 0,
          duration: 0.55,
          ease: "aurum",
          delay: 0.08,
        },
      );
    };

    const onMove = (e: PointerEvent) => {
      if (!placed) {
        placed = true;
        gsap.set([dot, follow], { x: e.clientX, y: e.clientY });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      show();
    };

    const onOver = (e: Event) => {
      const t = e.target;
      paint(resolveKey(t instanceof Element ? t : null));
    };

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget;
      if (related === null) {
        hide();
        paint("default");
        return;
      }
      paint(resolveKey(related instanceof Element ? related : null));
    };

    const onDown = () => {
      pressed = true;
      gsap.to(ring, {
        scale: STATES[key].ring * 0.85,
        duration: 0.28,
        ease: "aurum",
        overwrite: "auto",
      });
    };

    const onUp = () => {
      pressed = false;
      gsap.to(ring, {
        scale: STATES[key].ring,
        duration: 0.45,
        ease: "aurum",
        overwrite: "auto",
      });
    };

    const onLeaveWindow = () => hide();

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseup", onUp, { passive: true });
    document.addEventListener("mouseleave", onLeaveWindow);
    window.addEventListener("blur", onLeaveWindow);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeaveWindow);
      window.removeEventListener("blur", onLeaveWindow);
      dotX.tween.kill();
      dotY.tween.kill();
      ringX.tween.kill();
      ringY.tween.kill();
      gsap.killTweensOf([dot, follow, ring, label, chevL, chevR]);
      html.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-10000 h-2.5 w-2.5 rounded-full will-change-transform"
        style={{ opacity: 0, backgroundColor: "var(--color-gold)" }}
      />
      {/* 44px point-box. Every child centres with grid, never with a transform,
          so GSAP owns each animated element's transform outright. */}
      <div
        ref={followRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-10000 h-11 w-11 will-change-transform"
        style={{ opacity: 0 }}
      >
        <div
          ref={ringRef}
          className="absolute inset-0 rounded-full border"
          style={{
            borderColor: "rgb(var(--nav-fg) / 0.55)",
            backgroundColor: "rgba(5,6,10,0)",
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <span
            ref={chevLeftRef}
            className="u-eyebrow block"
            style={{ opacity: 0, color: "rgb(var(--nav-fg))" }}
          >
            {"‹"}
          </span>
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span
            ref={chevRightRef}
            className="u-eyebrow block"
            style={{ opacity: 0, color: "rgb(var(--nav-fg))" }}
          >
            {"›"}
          </span>
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span
            ref={labelRef}
            className="u-eyebrow block whitespace-nowrap"
            style={{ color: "rgb(var(--nav-fg))", opacity: 0, clipPath: CLIPPED }}
          />
        </div>
      </div>
    </>
  );
}
