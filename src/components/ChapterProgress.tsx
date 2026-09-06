"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, scoped, MQ, setNavTone, setChapter } from "@/lib/gsap";
import { CHAPTERS, type Tone } from "@/lib/chapters";
import { scrollToSection } from "@/lib/lenis";

/**
 * The vertical spine — and the single chapter/tone authority for the whole site.
 *
 * Every section declares data-chapter + data-tone on its root. This is the ONE
 * place that observes them: it sets the active chapter and crossfades the two
 * global colour channels (--nav-fg / --nav-line) on <html> so the masthead, the
 * cursor and any hairline invert together, smoothly, instead of class-snapping.
 * No other component may create a second observer.
 */

const IVORY: readonly [number, number, number] = [242, 239, 232];
const INK: readonly [number, number, number] = [5, 6, 10];

/** How far the label hides behind the rail when its chapter is not active. */
const LABEL_HIDDEN = 104;

export default function ChapterProgress() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = scoped(root);
    const mm = gsap.matchMedia();

    const rows = q(".cp-row") as HTMLElement[];
    const rail = q(".cp-rail")[0] as HTMLElement | undefined;
    const bar = q(".cp-progress")[0] as HTMLElement | undefined;

    /* ---- global tone channel -------------------------------------- */
    const toneProxy = { t: 0 }; // 0 = ivory chrome (dark ground), 1 = ink chrome
    const paintTone = () => {
      const t = toneProxy.t;
      const ch = (i: 0 | 1 | 2) =>
        Math.round(IVORY[i] + (INK[i] - IVORY[i]) * t);
      const triplet = `${ch(0)} ${ch(1)} ${ch(2)}`;
      const de = document.documentElement;
      de.style.setProperty("--nav-fg", triplet);
      de.style.setProperty("--nav-line", triplet);
    };

    let currentTone: Tone | null = null;
    const applyTone = (tone: Tone, instant: boolean) => {
      if (tone === currentTone) return;
      currentTone = tone;
      document.documentElement.dataset.tone = tone;
      setNavTone(tone);
      const target = tone === "light" ? 1 : 0;
      if (instant) {
        gsap.killTweensOf(toneProxy);
        toneProxy.t = target;
        paintTone();
        return;
      }
      gsap.to(toneProxy, {
        t: target,
        duration: 0.5,
        ease: "power2.inOut",
        overwrite: true,
        onUpdate: paintTone,
      });
    };

    /* ---- the numeral exchange -------------------------------------- */
    let active = -1;

    const swap = (
      index: number,
      isActive: boolean,
      dir: number,
      instant: boolean,
    ) => {
      const row = rows[index];
      if (!row) return;
      const numA = row.querySelector(".cp-num-a");
      const numB = row.querySelector(".cp-num-b");
      const fill = row.querySelector(".cp-dot-fill");
      const label = row.querySelector(".cp-label-in");
      if (!numA || !numB || !fill || !label) return;

      /* The conveyor always travels with the scroll: outgoing glyph leaves the
         way you are going, incoming glyph arrives from the other side. */
      const exit = dir >= 0 ? -118 : 118;
      const entry = dir >= 0 ? 118 : -118;
      const d = instant ? 0 : 0.62;
      const outgoing = isActive ? numA : numB;
      const incoming = isActive ? numB : numA;

      gsap.to(outgoing, {
        yPercent: exit,
        duration: d,
        ease: "aurumIn",
        overwrite: "auto",
      });
      gsap.fromTo(
        incoming,
        { yPercent: entry },
        { yPercent: 0, duration: d, ease: "aurum", overwrite: "auto" },
      );
      gsap.to(fill, {
        scale: isActive ? 1 : 0,
        duration: isActive ? d * 0.95 : d * 0.6,
        ease: isActive ? "aurum" : "aurumIn",
        overwrite: "auto",
      });
      gsap.to(label, {
        xPercent: isActive ? 0 : LABEL_HIDDEN,
        opacity: isActive ? 1 : 0,
        duration: isActive ? d * 1.15 : d * 0.55,
        ease: isActive ? "aurum" : "aurumIn",
        overwrite: "auto",
      });
    };

    const setActive = (index: number, instant: boolean) => {
      if (index === active) return;
      // A section outside CHAPTERS (the unnumbered final reveal) resolves to
      // -1. Retire the current row rather than leaving the previous chapter's
      // numeral lit through the whole end-credit sequence.
      if (index < 0) {
        if (active >= 0) swap(active, false, 1, instant);
        active = -1;
        return;
      }
      const dir = active === -1 || index > active ? 1 : -1;
      if (active >= 0) swap(active, false, dir, instant);
      swap(index, true, dir, instant);
      active = index;
      setChapter(index);
    };

    /* ---- one branch per motion preference; both cover every width --- */
    const wire = (instant: boolean) => {
      active = -1;
      currentTone = null;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-chapter]"),
      );

      nodes.forEach((node) => {
        const id = node.dataset.chapter ?? "";
        const index = CHAPTERS.findIndex((c) => c.id === id);
        const tone: Tone = node.dataset.tone === "light" ? "light" : "dark";
        const claim = () => {
          setActive(index, instant);
          applyTone(tone, instant);
        };
        ScrollTrigger.create({
          trigger: node,
          start: "top 55%",
          end: "bottom 55%",
          invalidateOnRefresh: true,
          onEnter: claim,
          onEnterBack: claim,
        });
      });

      /* Opening state before any trigger has claimed the viewport. */
      applyTone(CHAPTERS[0].tone, true);
      setActive(0, true);

      if (bar) {
        gsap.fromTo(
          bar,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "50% 0%",
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "max",
              scrub: instant ? true : 1,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      if (rail) {
        /* Stand down while the end-credit logo owns the last screen. */
        ScrollTrigger.create({
          trigger: document.body,
          start: () =>
            document.documentElement.scrollHeight - window.innerHeight * 1.6,
          end: "max",
          invalidateOnRefresh: true,
          onEnter: () =>
            gsap.to(rail, {
              autoAlpha: 0,
              x: 26,
              duration: instant ? 0 : 0.7,
              ease: "aurumIn",
              overwrite: "auto",
            }),
          onLeaveBack: () =>
            gsap.to(rail, {
              autoAlpha: 1,
              x: 0,
              duration: instant ? 0 : 0.7,
              ease: "aurum",
              overwrite: "auto",
            }),
        });
      }
    };

    mm.add(MQ.motion, () => {
      wire(false);
      const reveal = () => {
        gsap.to(root, { opacity: 1, duration: 1, ease: "aurum", delay: 0.15 });
        gsap.from(rows, {
          x: 26,
          opacity: 0,
          duration: 0.9,
          ease: "aurum",
          stagger: 0.06,
          delay: 0.2,
        });
      };
      if (document.documentElement.hasAttribute("data-aurum-loaded")) {
        reveal();
      } else {
        window.addEventListener("aurum:loaded", reveal, { once: true });
      }
      return () => window.removeEventListener("aurum:loaded", reveal);
    });

    mm.add(MQ.reduced, () => {
      wire(true);
      gsap.set(root, { opacity: 1 });
    });

    return () => {
      mm.revert();
      gsap.killTweensOf(toneProxy);
      const de = document.documentElement;
      de.style.removeProperty("--nav-fg");
      de.style.removeProperty("--nav-line");
      de.removeAttribute("data-tone");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 md:block lg:right-8"
      style={{ opacity: 0 }}
    >
      <nav aria-label="Chapters" className="cp-rail relative">
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 w-px"
          style={{ right: "4.5px", background: "rgb(var(--nav-line) / 0.18)" }}
        />
        <span
          aria-hidden
          className="cp-progress pointer-events-none absolute top-0 bottom-0 w-px origin-top"
          style={{
            right: "4.5px",
            background: "var(--color-gold)",
            transform: "scaleY(0)",
          }}
        />

        <ul className="relative flex flex-col items-end gap-6 lg:gap-7">
          {CHAPTERS.map((c) => (
            <li key={c.id} className="cp-row relative">
              {/* Label lives outside the hit area so the rail never eats clicks. */}
              <span
                aria-hidden
                className="cp-label pointer-events-none absolute top-1/2 right-full mr-5 block w-56 -translate-y-1/2 overflow-hidden text-right"
              >
                <span
                  className="cp-label-in block"
                  style={{ transform: `translateX(${LABEL_HIDDEN}%)`, opacity: 0 }}
                >
                  <span
                    className="u-eyebrow block whitespace-nowrap"
                    style={{ color: "rgb(var(--nav-fg))" }}
                  >
                    {c.label[0]}
                  </span>
                  <span
                    className="u-eyebrow block whitespace-nowrap"
                    style={{ color: "var(--color-gold)" }}
                  >
                    {c.label[1]}
                  </span>
                </span>
              </span>

              <button
                type="button"
                onClick={() => scrollToSection(`#${c.id}`)}
                data-cursor="enter"
                className="cp-btn flex items-center gap-3 py-1 pl-8 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                <span className="sr-only">
                  {c.numeral} — {c.label[0]} {c.label[1]}
                </span>
                <span
                  aria-hidden
                  className="cp-num relative block h-3.5 w-6 overflow-hidden text-right"
                >
                  <span
                    className="cp-num-a u-eyebrow absolute inset-0 block"
                    style={{
                      color: "rgb(var(--nav-fg) / 0.42)",
                      letterSpacing: "0.16em",
                      lineHeight: "14px",
                    }}
                  >
                    {c.numeral}
                  </span>
                  <span
                    className="cp-num-b u-eyebrow absolute inset-0 block"
                    style={{
                      color: "var(--color-gold-bright)",
                      letterSpacing: "0.16em",
                      lineHeight: "14px",
                      transform: "translateY(118%)",
                    }}
                  >
                    {c.numeral}
                  </span>
                </span>

                <span
                  aria-hidden
                  className="cp-dot relative block h-2.25 w-2.25 rounded-full"
                  style={{ background: "rgb(var(--nav-line) / 0.26)" }}
                >
                  <span
                    className="cp-dot-fill absolute inset-0 block rounded-full"
                    style={{
                      background: "var(--color-gold)",
                      transform: "scale(0)",
                    }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
