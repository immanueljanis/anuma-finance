"use client";

import { useSyncExternalStore } from "react";

function tick(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

const still = () => () => undefined;
const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * The current unix time in seconds, re-rendering every second while `ticking`. The server snapshot
 * is 0, so prerendering never reads the clock (Next.js Cache Components rejects Date.now there).
 */
export function useNow(ticking: boolean): number {
  return useSyncExternalStore(ticking ? tick : still, nowSeconds, () => 0);
}
