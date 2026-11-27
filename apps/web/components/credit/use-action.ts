"use client";

import { useCallback, useState } from "react";
import { explainError } from "@/lib/anuma/browser";

/** Busy and error state for one user action; errors become sentences from `explainError`. */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (...args: A) => {
      setBusy(true);
      setError(null);
      try {
        await fn(...args);
        return true;
      } catch (e) {
        setError(explainError(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fn],
  );
  return { busy, error, run, setError };
}
