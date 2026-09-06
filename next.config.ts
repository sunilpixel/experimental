import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // The manifest ships AVIF-friendly cinematic frames; let Next pick the best.
    formats: ["image/avif", "image/webp"],
    // Full-bleed art direction means we genuinely need the large end of the scale.
    deviceSizes: [640, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [96, 128, 256, 384, 512, 768],
    // Next 16 allowlists quality values and defaults to [75] only — ImageFrame
    // asks for 90 on these full-bleed frames, which would otherwise 400.
    qualities: [75, 90],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    optimizePackageImports: ["gsap"],
  },
};

export default nextConfig;
