/** Mock USDC has 6 decimals, like USDC. */
export const USDC_DECIMALS = 6;
const USDC_BASE = 10n ** BigInt(USDC_DECIMALS);

/** Base units as a fixed two-decimal amount: 37500000n -> "37.50". */
export function formatUsdc(value: bigint | string | number): string {
  const v = BigInt(value);
  const negative = v < 0n;
  const abs = negative ? -v : v;
  const cents = (abs * 100n + USDC_BASE / 2n) / USDC_BASE;
  const whole = (cents / 100n).toLocaleString("en-US");
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** A base58 key shortened for display: "9xQeWv…FVin". */
export function shortKey(key: string, head = 6, tail = 4): string {
  return key.length <= head + tail + 1 ? key : `${key.slice(0, head)}…${key.slice(-tail)}`;
}

/** Seconds as a compact countdown: 125 -> "2m 05s", 7 -> "7s". */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

/** A unix time (seconds) as a short local time. */
export function formatClock(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
