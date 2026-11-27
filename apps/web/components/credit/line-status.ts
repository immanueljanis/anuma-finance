import type { CreditAccount } from "@/lib/anuma/program";
import type { Tone } from "../ui";

export type LineStatus = { key: "ready" | "open" | "overdue" | "past-grace" | "defaulted"; label: string; tone: Tone };

/** The single status vocabulary for a credit line, shared by the card, the pool table and actions. */
export function lineStatus(credit: Pick<CreditAccount, "debt" | "dueTs" | "defaulted">, graceSecs: bigint, now: number): LineStatus {
  if (credit.defaulted) return { key: "defaulted", label: "Defaulted", tone: "danger" };
  if (credit.debt === 0n) return { key: "ready", label: "Available", tone: "primary" };
  const due = Number(credit.dueTs);
  if (now > due + Number(graceSecs)) return { key: "past-grace", label: "Past grace", tone: "danger" };
  if (now > due) return { key: "overdue", label: "Overdue", tone: "warn" };
  return { key: "open", label: "Loan open", tone: "info" };
}

/** Every limit the line can reach: start, then x1.5 per on-time repayment, capped at the maximum. */
export function limitLadder(start: bigint, max: bigint): bigint[] {
  const steps = [start];
  while (steps[steps.length - 1] < max) steps.push(min((steps[steps.length - 1] * 3n) / 2n, max));
  return steps;
}

const min = (a: bigint, b: bigint) => (a < b ? a : b);
