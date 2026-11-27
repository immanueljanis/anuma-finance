"use client";

import { useSyncExternalStore } from "react";

const EVENT = "anuma:local-store";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** Reads a localStorage key; null when storage is blocked or the key is missing. */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a localStorage key and notifies every `useLocalValue` reader in this tab. */
export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * A localStorage value as React state. The server snapshot is null, so the first client render
 * matches the server HTML and the stored value appears right after hydration.
 */
export function useLocalValue(key: string | null): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (key ? readLocal(key) : null),
    () => null,
  );
}
