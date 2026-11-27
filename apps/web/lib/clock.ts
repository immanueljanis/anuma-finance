"use client";

import { SYSVAR_CLOCK_PUBKEY, type Connection } from "@solana/web3.js";
import { useEffect, useState, useSyncExternalStore } from "react";

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

/** Offset of `unix_timestamp` inside the Clock sysvar account data. */
const CLOCK_UNIX_TIMESTAMP_OFFSET = 32;

/**
 * Seconds to add to the browser clock to get the cluster clock that programs read (the Clock
 * sysvar). Due times and defaults are decided by that clock, which can run tens of seconds apart
 * from the browser's, so every countdown and the default action must use it. Re-reads every 10 s
 * while `active`.
 */
export function useChainOffset(connection: Connection, active: boolean): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!active) return;
    let live = true;
    const read = () =>
      connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed").then(
        (info) => {
          if (!live || !info) return;
          setOffset(Number(info.data.readBigInt64LE(CLOCK_UNIX_TIMESTAMP_OFFSET)) - Math.floor(Date.now() / 1000));
        },
        () => undefined,
      );
    void read();
    const timer = setInterval(read, 10_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [connection, active]);
  return offset;
}
