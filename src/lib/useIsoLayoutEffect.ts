"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect on the client (so GSAP paints initial states before the
 * browser does), useEffect on the server render pass (so Next stays quiet).
 */
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
