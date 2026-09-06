import type { Metadata, Viewport } from "next";
import { Playfair_Display, Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

import SmoothScroll from "@/components/SmoothScroll";
import Navigation from "@/components/Navigation";
import ChapterProgress from "@/components/ChapterProgress";
import CustomCursor from "@/components/CustomCursor";
import GrainOverlay from "@/components/GrainOverlay";
import Preloader from "@/components/Preloader";

/* High-contrast Didone — the AURUM voice. Playfair carries real weight where
   Cinzel stayed spindly at display sizes, and its thick/thin contrast is what
   reads as luxury rather than merely "a serif". */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

/* Editorial serif for quotes and high-contrast italics. */
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/* Geometric sans for eyebrows, navigation and body copy. */
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURUM — Luxury Lives Differently",
  description:
    "AURUM designs residences and experiences in extraordinary places. Spaces, people, experiences — a higher tomorrow.",
  openGraph: {
    title: "AURUM — Luxury Lives Differently",
    description:
      "Residences and experiences in extraordinary places. A new dimension of luxury.",
    type: "website",
  },
  other: { "color-scheme": "dark" },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${cormorant.variable} ${jost.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="relative bg-ink text-ivory">
        <SmoothScroll />
        <Preloader />
        <CustomCursor />
        <Navigation />
        <ChapterProgress />
        <main id="aurum-main" className="relative w-full">
          {children}
        </main>
        <GrainOverlay />
      </body>
    </html>
  );
}
