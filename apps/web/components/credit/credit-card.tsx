import type { CreditAccount } from "@/lib/anuma/program";
import { formatSeconds, formatUsdc } from "@/lib/format";
import { limitLadder, type LineStatus } from "./line-status";

const DOT: Record<LineStatus["key"], string> = {
  ready: "bg-[oklch(0.82_0.1_162)]",
  open: "bg-vault-ink",
  overdue: "bg-[oklch(0.83_0.12_80)]",
  "past-grace": "bg-[oklch(0.72_0.16_30)]",
  defaulted: "bg-[oklch(0.72_0.16_30)]",
};

/**
 * The credit line as a physical card, the app's one dark object. It prints only what is public on
 * Solana: the pseudonym's last characters and the limit. The holder line says what the chain knows.
 */
export function CreditCard({ credit, status }: { credit: CreditAccount; status: LineStatus }) {
  const pseudonym = credit.pseudonym.toBase58();
  return (
    <article
      aria-label="Your Anuma card"
      className={`relative isolate aspect-[1.586] w-full max-w-[28rem] overflow-hidden rounded-object bg-[linear-gradient(140deg,var(--color-vault-2),var(--color-vault)_55%,oklch(0.19_0.02_252))] p-6 text-vault-ink shadow-[var(--shadow-object)] transition-[filter] duration-500 sm:p-7 ${
        credit.defaulted ? "grayscale-[0.85]" : ""
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1/2 -left-1/3 -z-10 h-full w-[160%] -rotate-12 bg-[radial-gradient(closest-side,oklch(1_0_0/0.11),transparent)]"
      />
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <span className="text-lg font-semibold tracking-tight">Anuma</span>
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-white/10 px-3 text-caption font-medium ring-1 ring-white/15">
            <span aria-hidden className={`size-1.5 rounded-full ${DOT[status.key]}`} />
            {status.label}
          </span>
        </div>
        <span
          aria-hidden
          className="h-8 w-11 rounded-md bg-[linear-gradient(135deg,oklch(0.92_0.018_85),oklch(0.76_0.022_85))] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.12)]"
        />
        <div>
          <p className="font-mono text-small tracking-[0.2em] text-vault-ink/90 sm:text-base" title={pseudonym}>
            •••• •••• •••• {pseudonym.slice(-4)}
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-caption text-vault-muted">Holder</p>
              <p className="text-small font-medium">Verified, unnamed</p>
            </div>
            <div className="text-right">
              <p className="text-caption text-vault-muted">Limit</p>
              <p className="text-small font-medium tabular">{formatUsdc(credit.limit)} mUSDC</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * The state of the line beside the card: one headline figure that changes with the situation
 * (available, to repay, in default), the details below it, and the limit ladder.
 */
export function LineSummary({
  credit,
  status,
  startLimit,
  maxLimit,
  graceSecs,
  now,
}: {
  credit: CreditAccount;
  status: LineStatus;
  startLimit: bigint;
  maxLimit: bigint;
  graceSecs: bigint;
  now: number;
}) {
  const ladder = limitLadder(startLimit, maxLimit);
  const reached = ladder.findLastIndex((step) => step <= credit.limit);
  const nextLimit = ladder[reached + 1];
  const due = Number(credit.dueTs);
  const grace = Number(graceSecs);

  const headline =
    status.key === "defaulted"
      ? { label: "In default", value: credit.debt }
      : credit.debt > 0n
        ? { label: "To repay", value: credit.debt }
        : { label: "Available to spend", value: credit.limit };

  const dueText =
    credit.debt === 0n
      ? "No open loan"
      : now <= due
        ? `In ${formatSeconds(due - now)}`
        : now <= due + grace
          ? `Grace ends in ${formatSeconds(due + grace - now)}`
          : `${formatSeconds(now - due)} late`;

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <div>
        <p className="text-small text-muted">{headline.label}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-semibold tracking-tight text-ink tabular">{formatUsdc(headline.value)}</span>
          <span className="text-body text-muted">mUSDC</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
        {[
          ["Open debt", `${formatUsdc(credit.debt)} mUSDC`],
          ["Due", dueText],
          ["On-time repayments", String(credit.repaidCount)],
          ["Next limit", credit.defaulted ? "None" : nextLimit ? `${formatUsdc(nextLimit)} mUSDC` : "Maximum reached"],
        ].map(([term, value]) => (
          <div key={term}>
            <dt className="text-caption text-muted">{term}</dt>
            <dd className="mt-0.5 text-small font-medium text-ink tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <ol aria-label="Limit ladder" className="flex gap-1.5">
          {ladder.map((step, i) => (
            <li key={step.toString()} className="flex flex-1 flex-col gap-1.5">
              <span aria-hidden className={`h-1 rounded-full ${i <= reached ? "bg-ink" : "bg-line"}`} />
              <span className={`text-caption tabular ${i === reached ? "font-medium text-ink" : "text-muted"}`}>
                {formatUsdc(step).replace(/\.00$/, "")}
                <span className="sr-only">{i <= reached ? " reached" : " not reached"}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-caption text-muted">Each on-time repayment raises the limit by half, up to {formatUsdc(maxLimit).replace(/\.00$/, "")} mUSDC.</p>
      </div>
    </div>
  );
}
