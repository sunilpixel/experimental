"use client";

import { scrollToSection } from "@/lib/lenis";

/* ------------------------------------------------------------------
   AURUM — end-credit footer.

   Layout is one line at desktop and three rows at mobile. The middle
   pair (links + socials) share a mobile row through a `md:contents`
   wrapper: the wrapper is layout-only and is never animated, because
   `display: contents` boxes cannot take opacity or transform. The
   animated `.final-footer-row` class therefore always sits on a real
   box — the nav, the social rail, and the two outer groups.
------------------------------------------------------------------ */

type Social = {
  label: string;
  href: string;
  /** Hand-drawn 24x24 glyph — no icon library on this site. */
  path: React.ReactNode;
};

const SOCIALS: Social[] = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: (
      <>
        <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.1" cy="6.9" r="0.95" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    path: (
      <>
        <path d="M4.2 9.5v10.3" />
        <circle cx="4.2" cy="4.6" r="1.05" fill="currentColor" stroke="none" />
        <path d="M10.1 19.8V9.5" />
        <path d="M10.1 13.4c0-2.3 1.6-4.1 3.9-4.1 2.4 0 4 1.7 4 4.6v5.9" />
      </>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    path: (
      <>
        <rect x="2.4" y="5.6" width="19.2" height="12.8" rx="4.2" />
        <path d="M10.3 9.7 16 12.5l-5.7 2.8V9.7Z" />
      </>
    ),
  },
];

const LINKS = [
  { label: "PRIVACY", href: "#privacy" },
  { label: "TERMS", href: "#terms" },
  { label: "CAREERS", href: "#careers" },
  { label: "PRESS", href: "#press" },
];

export default function Footer() {
  return (
    <footer className="final-footer relative flex min-h-[86vh] w-full flex-col justify-between bg-ink px-[6vw] pb-[clamp(2.4rem,5vh,3.6rem)] pt-[clamp(3rem,8vh,5rem)]">
      {/* ---------- the last statement ---------- */}
      <div className="final-footer-row flex flex-1 flex-col justify-center" style={{ opacity: 0 }}>
        <span
          className="u-display block text-ivory"
          style={{
            fontSize: "clamp(2.6rem, 11vw, 11rem)",
            lineHeight: 0.92,
            letterSpacing: "0.06em",
            marginRight: "-0.06em",
          }}
        >
          AURUM
        </span>
        <span className="u-eyebrow mt-[clamp(1.2rem,3vh,2rem)] block text-bone/50">
          EXTRAORDINARY LIVES HERE
        </span>
      </div>

      <div
        className="final-footer-rule hairline mt-[clamp(2rem,5vh,3.4rem)] w-full"
        style={{ transform: "scaleX(0)", transformOrigin: "50% 50%" }}
      />

      <div className="flex flex-col gap-[clamp(2.2rem,4vh,3rem)] pt-[clamp(2.4rem,5vh,3.4rem)] md:flex-row md:items-center md:justify-between md:gap-10">
        {/* ---------- wordmark ---------- */}
        <div className="final-footer-row" style={{ opacity: 0 }}>
          <span
            className="u-display block text-gold-bright"
            style={{
              fontSize: "clamp(1.5rem, 2.4vw, 2.4rem)",
              letterSpacing: "0.34em",
              marginRight: "-0.34em",
            }}
          >
            AURUM
          </span>
        </div>

        {/* ---------- links + socials (one row at mobile) ---------- */}
        <div className="flex items-center justify-between gap-8 md:contents">
          <nav
            className="final-footer-row flex flex-wrap items-center gap-x-[clamp(1.4rem,2.4vw,2.6rem)] gap-y-3"
            aria-label="Legal"
            style={{ opacity: 0 }}
          >
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                data-cursor="enter"
                className="group relative u-eyebrow text-bone/65 transition-colors duration-500 ease-[var(--ease-luxe)] hover:text-ivory"
                style={{ marginRight: "-0.42em" }}
              >
                {l.label}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-[0.55em] left-0 block h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-[600ms] ease-[var(--ease-luxe)] group-hover:scale-x-100"
                />
              </a>
            ))}
          </nav>

          <div
            className="final-footer-row flex items-center gap-[clamp(1rem,1.6vw,1.5rem)]"
            style={{ opacity: 0 }}
          >
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={s.label}
                data-cursor="enter"
                className="block text-bone/55 transition-colors duration-500 ease-[var(--ease-luxe)] hover:text-gold"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {s.path}
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* ---------- copyright + back to top ---------- */}
        <div
          className="final-footer-row flex items-center justify-between gap-[clamp(1.6rem,3vw,2.6rem)]"
          style={{ opacity: 0 }}
        >
          <span
            className="u-eyebrow whitespace-nowrap text-ash"
            style={{ marginRight: "-0.42em" }}
          >
            © 2026 AURUM. ALL RIGHTS RESERVED.
          </span>

          <button
            type="button"
            onClick={() => scrollToSection("#hero")}
            data-cursor="enter"
            aria-label="Back to top"
            className="group flex shrink-0 items-center gap-3"
          >
            <span
              className="u-eyebrow hidden whitespace-nowrap text-bone/65 transition-colors duration-500 ease-[var(--ease-luxe)] group-hover:text-ivory sm:block"
              style={{ marginRight: "-0.42em" }}
            >
              BACK TO TOP
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-bone/25 transition-colors duration-[600ms] ease-[var(--ease-luxe)] group-hover:border-gold">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-3.5 w-3.5 text-bone/70 transition-all duration-[600ms] ease-[var(--ease-luxe)] group-hover:-translate-y-[2px] group-hover:text-gold"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19.2V5.2" />
                <path d="M5.6 11.6 12 5.2l6.4 6.4" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
