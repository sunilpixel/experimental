"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, scoped, MQ } from "@/lib/gsap";
import { CHAPTERS, NAV_LINKS } from "@/lib/chapters";
import { scrollToSection, startScroll, stopScroll } from "@/lib/lenis";

/**
 * Fixed chrome — masthead + full-screen index.
 *
 * Colour is never decided here: every glyph paints from rgb(var(--nav-fg)),
 * which <ChapterProgress/> crossfades as chapters change tone. This file only
 * owns geometry (the condense morph), reveal choreography and the index panel.
 */

const WORDMARK = ["A", "U", "R", "U", "M"];

const MENU_CLOSED = "inset(0% 0% 100% 0%)";
const MENU_OPEN = "inset(0% 0% 0% 0%)";

/** [expanded row height, condensed row height] per breakpoint. */
const HEIGHTS = {
  desktop: [108, 68],
  tablet: [90, 62],
  mobile: [76, 56],
} as const;

export default function Navigation() {
  const rootRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const openedOnce = useRef(false);
  const jumpTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  /* ---------------------------------------------------------------
     Masthead: reveal after the preloader, then morph on scroll.
  --------------------------------------------------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = scoped(root);
    const mm = gsap.matchMedia();

    const letters = q(".wm-letter");
    const labels = q(".nav-link-label");
    const rightBits = q(".nav-right-bit");

    const build = (expanded: number, condensed: number) => {
      gsap.set(root, {
        "--nav-h": `${expanded}px`,
        "--wm-track": "0.34em",
      });

      /* Entrance — the bar assembles itself out of hard edges. */
      const intro = gsap.timeline({ paused: true });
      intro
        .to(root, { opacity: 1, duration: 0.9, ease: "aurum" }, 0)
        .fromTo(
          root,
          { y: -18 },
          { y: 0, duration: 1.3, ease: "aurum", force3D: true },
          0,
        )
        .fromTo(
          letters,
          { yPercent: 115 },
          { yPercent: 0, duration: 1.05, ease: "aurum", stagger: 0.055 },
          0.05,
        )
        .fromTo(
          labels,
          { yPercent: 115 },
          { yPercent: 0, duration: 0.95, ease: "aurum", stagger: 0.07 },
          0.32,
        )
        .fromTo(
          rightBits,
          { yPercent: 115 },
          { yPercent: 0, duration: 0.95, ease: "aurum", stagger: 0.08 },
          0.44,
        )
        .fromTo(
          q(".nav-hair"),
          { scaleX: 0, opacity: 1 },
          { scaleX: 1, duration: 1.4, ease: "curtain" },
          0.2,
        );

      const play = () => intro.play();
      if (document.documentElement.hasAttribute("data-aurum-loaded")) {
        play();
      } else {
        window.addEventListener("aurum:loaded", play, { once: true });
      }

      /* Condense — one timeline, toggled by one trigger on the body. */
      const condense = gsap.timeline({ paused: true });
      condense
        .to(root, {
          "--nav-h": `${condensed}px`,
          "--wm-track": "0.22em",
          duration: 0.85,
          ease: "aurum",
        }, 0)
        .to(q(".nav-plate"), { opacity: 1, duration: 0.7, ease: "aurum" }, 0)
        .to(q(".nav-hair"), { opacity: 1, duration: 0.7, ease: "aurum" }, 0);

      ScrollTrigger.create({
        trigger: document.body,
        start: () => `top top-=${Math.round(window.innerHeight * 0.12)}`,
        end: "max",
        invalidateOnRefresh: true,
        onEnter: () => condense.play(),
        onLeaveBack: () => condense.reverse(),
      });

      /* Link hover: a gold hairline wipes in from the left, out to the right. */
      const links = q(".nav-link") as HTMLElement[];
      const teardown: (() => void)[] = [
        () => window.removeEventListener("aurum:loaded", play),
      ];

      links.forEach((link) => {
        const rule = link.querySelector(".nav-link-rule");
        const lift = link.querySelector(".nav-link-lift");
        if (!rule || !lift) return;

        const enter = () => {
          gsap.to(lift, { y: -3, duration: 0.5, ease: "aurum", overwrite: "auto" });
          gsap.fromTo(
            rule,
            { scaleX: 0, transformOrigin: "0% 50%" },
            { scaleX: 1, duration: 0.55, ease: "aurum", overwrite: "auto" },
          );
        };
        const leave = () => {
          gsap.to(lift, { y: 0, duration: 0.55, ease: "aurum", overwrite: "auto" });
          gsap.to(rule, {
            scaleX: 0,
            transformOrigin: "100% 50%",
            duration: 0.45,
            ease: "aurumIn",
            overwrite: "auto",
          });
        };

        link.addEventListener("pointerenter", enter);
        link.addEventListener("pointerleave", leave);
        link.addEventListener("focus", enter);
        link.addEventListener("blur", leave);
        teardown.push(() => {
          link.removeEventListener("pointerenter", enter);
          link.removeEventListener("pointerleave", leave);
          link.removeEventListener("focus", enter);
          link.removeEventListener("blur", leave);
        });
      });

      return () => teardown.forEach((fn) => fn());
    };

    mm.add(MQ.desktop, () => build(HEIGHTS.desktop[0], HEIGHTS.desktop[1]));
    mm.add(MQ.tablet, () => build(HEIGHTS.tablet[0], HEIGHTS.tablet[1]));
    mm.add(MQ.mobile, () => build(HEIGHTS.mobile[0], HEIGHTS.mobile[1]));

    mm.add(MQ.reduced, () => {
      /* No morph, no reveal — the bar is simply present and complete. */
      gsap.set(root, { "--nav-h": "84px", "--wm-track": "0.3em", opacity: 1, y: 0 });
      gsap.set([...letters, ...labels, ...rightBits], { yPercent: 0, opacity: 1 });
      gsap.set(q(".nav-hair"), { scaleX: 1, opacity: 1 });
      gsap.set(q(".nav-plate"), { opacity: 1 });
    });

    return () => mm.revert();
  }, []);

  /* ---------------------------------------------------------------
     Index panel: clip-reveal + staggered entries.
  --------------------------------------------------------------- */
  useEffect(() => {
    const panel = menuRef.current;
    if (!panel) return;
    if (!open && !openedOnce.current) return;

    const items = gsap.utils.toArray<HTMLElement>(
      panel.querySelectorAll(".menu-item-inner"),
    );
    const glyph = gsap.utils.toArray<HTMLElement>(
      rootRef.current?.querySelectorAll(".nav-glyph-line") ?? [],
    );
    const meta = panel.querySelectorAll(".menu-meta");
    const reduced = window.matchMedia(MQ.reduced).matches;
    const d = reduced ? 0 : 1;

    gsap.killTweensOf([panel, ...items, ...glyph, ...Array.from(meta)]);

    if (open) {
      openedOnce.current = true;
      stopScroll();
      panel.style.pointerEvents = "auto";

      gsap.to(panel, {
        clipPath: MENU_OPEN,
        duration: 1 * d,
        ease: "curtain",
      });
      gsap.fromTo(
        items,
        { yPercent: 118, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.95 * d,
          ease: "aurum",
          stagger: 0.055,
          delay: 0.2 * d,
        },
      );
      gsap.fromTo(
        meta,
        { yPercent: 60, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.8 * d, ease: "aurum", delay: 0.6 * d },
      );
      if (glyph.length === 3) {
        gsap.to(glyph[0], { rotate: 45, y: 7, duration: 0.6 * d, ease: "aurum" });
        gsap.to(glyph[1], { scaleX: 0, opacity: 0, duration: 0.35 * d, ease: "aurumIn" });
        gsap.to(glyph[2], { rotate: -45, y: -7, duration: 0.6 * d, ease: "aurum" });
      }

      const focusTimer = window.setTimeout(
        () => firstItemRef.current?.focus({ preventScroll: true }),
        reduced ? 0 : 620,
      );
      return () => window.clearTimeout(focusTimer);
    }

    startScroll();
    gsap.to(items, {
      yPercent: -70,
      opacity: 0,
      duration: 0.5 * d,
      ease: "aurumIn",
      stagger: 0.028,
    });
    gsap.to(meta, { opacity: 0, duration: 0.3 * d, ease: "aurumIn" });
    gsap.to(panel, {
      clipPath: MENU_CLOSED,
      duration: 0.8 * d,
      ease: "curtain",
      delay: 0.14 * d,
      onComplete: () => {
        panel.style.pointerEvents = "none";
      },
    });
    if (glyph.length === 3) {
      gsap.to(glyph, { rotate: 0, y: 0, scaleX: 1, opacity: 1, duration: 0.55 * d, ease: "aurum" });
    }
    toggleRef.current?.focus({ preventScroll: true });
  }, [open]);

  /* Escape closes the index. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(
    () => () => {
      if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
      startScroll();
    },
    [],
  );

  /** Close first so Lenis is running again, then travel. */
  const go = (target: string) => {
    setOpen(false);
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => scrollToSection(target), 70);
  };

  return (
    <>
      <header
        ref={rootRef}
        className="pointer-events-none fixed inset-x-0 top-0 z-70"
        style={
          {
            opacity: 0,
            "--nav-h": "96px",
            "--wm-track": "0.34em",
          } as React.CSSProperties
        }
      >
        <div
          aria-hidden
          className="nav-plate absolute inset-0"
          style={{
            opacity: 0,
            background: "rgb(5 6 10 / 0.55)",
          }}
        />
        <div
          aria-hidden
          className="nav-hair absolute inset-x-0 bottom-0 h-px origin-left"
          style={{
            opacity: 0.55,
            transform: "scaleX(0)",
            background: "rgb(var(--nav-line) / 0.18)",
          }}
        />

        <nav
          aria-label="Primary"
          className="relative flex items-center justify-between px-6 md:px-10 lg:px-14"
          style={{ height: "var(--nav-h)" }}
        >
          {/* ---- wordmark ---- */}
          <button
            type="button"
            onClick={() => go("#hero")}
            data-cursor="enter"
            className="nav-wordmark pointer-events-auto flex items-center focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-gold"
            style={{ color: "rgb(var(--nav-fg))" }}
          >
            <span className="sr-only">AURUM — return to the opening</span>
            <span
              aria-hidden
              className="u-display flex text-[0.98rem] md:text-[1.08rem]"
              style={{ letterSpacing: "var(--wm-track)" }}
            >
              {WORDMARK.map((c, i) => (
                <span key={i} className="mask-line">
                  <span
                    className="wm-letter block"
                    style={{ transform: "translateY(115%)" }}
                  >
                    {c}
                  </span>
                </span>
              ))}
            </span>
          </button>

          {/* ---- chapter links (>=1024px) ---- */}
          <ul className="pointer-events-auto absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex xl:gap-12">
            {NAV_LINKS.map((link) => (
              <li key={link.target}>
                <a
                  href={link.target}
                  data-cursor="enter"
                  onClick={(e) => {
                    e.preventDefault();
                    go(link.target);
                  }}
                  className="nav-link relative block px-1 pb-2 pt-1 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
                >
                  <span className="nav-link-lift block">
                    <span className="mask-line">
                      <span
                        className="nav-link-label u-eyebrow block"
                        style={{
                          color: "rgb(var(--nav-fg))",
                          transform: "translateY(115%)",
                        }}
                      >
                        {link.label}
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="nav-link-rule absolute inset-x-0 bottom-0 h-px"
                    style={{
                      background: "var(--color-gold)",
                      transform: "scaleX(0)",
                      transformOrigin: "0% 50%",
                    }}
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* ---- right cluster ---- */}
          <div className="pointer-events-auto flex items-center gap-4 md:gap-7">
            <div className="mask-line hidden md:block">
              <a
                href="#contact"
                data-cursor="enter"
                onClick={(e) => {
                  e.preventDefault();
                  go("#contact");
                }}
                className="nav-right-bit nav-cta group/cta relative flex items-center gap-3 overflow-hidden rounded-full border px-5 py-2.5 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
                style={{
                  borderColor: "rgb(var(--nav-line) / 0.26)",
                  transform: "translateY(115%)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:scale-x-100"
                  style={{ background: "rgb(200 167 106 / 0.12)" }}
                />
                <span
                  className="u-eyebrow relative"
                  style={{ color: "rgb(var(--nav-fg))" }}
                >
                  BOOK A PRIVATE TOUR
                </span>
                <span
                  aria-hidden
                  className="relative block text-[0.7rem] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-1"
                  style={{ color: "var(--color-gold)" }}
                >
                  →
                </span>
              </a>
            </div>

            <div className="mask-line">
              <button
                ref={toggleRef}
                type="button"
                aria-expanded={open}
                aria-controls="aurum-menu"
                onClick={() => setOpen((v) => !v)}
                data-cursor="enter"
                className="nav-right-bit nav-glyph flex h-9 w-9 flex-col items-end justify-center gap-[5px] focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
                style={{ transform: "translateY(115%)" }}
              >
                <span className="sr-only">
                  {open ? "Close the index" : "Open the index"}
                </span>
                <span
                  aria-hidden
                  className="nav-glyph-line block h-px w-6"
                  style={{ background: "rgb(var(--nav-fg))" }}
                />
                <span
                  aria-hidden
                  className="nav-glyph-line block h-px w-4"
                  style={{ background: "rgb(var(--nav-fg))" }}
                />
                <span
                  aria-hidden
                  className="nav-glyph-line block h-px w-6"
                  style={{ background: "rgb(var(--nav-fg))" }}
                />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* ---------------- full-screen index ---------------- */}
      <div
        ref={menuRef}
        id="aurum-menu"
        aria-label="Chapter index"
        inert={!open}
        className="fixed inset-0 z-60 bg-ink"
        style={{ clipPath: MENU_CLOSED, pointerEvents: "none" }}
      >
        <div className="absolute inset-0 overflow-y-auto" data-lenis-prevent>
          <div className="mx-auto flex min-h-full w-full max-w-[1700px] flex-col justify-between px-6 pb-12 pt-28 md:px-10 md:pb-16 md:pt-32 lg:px-14">
            <p className="menu-meta u-eyebrow mb-8 text-ash" style={{ opacity: 0 }}>
              INDEX / EIGHT CHAPTERS
            </p>

            <ul className="w-full">
              {CHAPTERS.map((c, i) => (
                <li
                  key={c.id}
                  className="mask-line border-t"
                  style={{ borderColor: "rgb(242 239 232 / 0.08)" }}
                >
                  <button
                    ref={i === 0 ? firstItemRef : undefined}
                    type="button"
                    onClick={() => go(`#${c.id}`)}
                    data-cursor="enter"
                    className="menu-item group/mi block w-full text-left focus-visible:outline-1 focus-visible:outline-offset-[-4px] focus-visible:outline-gold"
                  >
                    <span
                      className="menu-item-inner flex w-full items-baseline gap-5 py-4 md:gap-10 md:py-6"
                      style={{ transform: "translateY(118%)", opacity: 0 }}
                    >
                      <span
                        className="u-eyebrow w-8 shrink-0"
                        style={{ color: "var(--color-gold)" }}
                      >
                        {c.numeral}
                      </span>
                      <span className="u-display text-ivory text-[clamp(1.35rem,4vw,2.9rem)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/mi:translate-x-3">
                        {c.label[0]}
                      </span>
                      <span className="u-eyebrow ml-auto hidden shrink-0 text-ash sm:block">
                        {c.label[1]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div
              className="menu-meta mt-12 flex flex-col gap-6 border-t pt-8 md:flex-row md:items-end md:justify-between"
              style={{ opacity: 0, borderColor: "rgb(242 239 232 / 0.08)" }}
            >
              <div>
                <p className="u-eyebrow text-ash">ENQUIRIES</p>
                <a
                  href="mailto:private@aurum.studio"
                  data-cursor="enter"
                  className="u-display mt-3 block text-[clamp(1.1rem,2.6vw,1.9rem)] text-ivory focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
                  style={{ letterSpacing: "0.06em" }}
                >
                  PRIVATE@AURUM.STUDIO
                </a>
              </div>
              <p className="u-eyebrow max-w-xs text-ash">
                RESIDENCES AND EXPERIENCES IN EXTRAORDINARY PLACES — EST. 2011
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
