import type { CreditAccount } from "@/lib/anuma/program";
import { formatSeconds, formatUsdc, shortKey } from "@/lib/format";
import { limitLadder, type LineStatus } from "./line-status";

const DOT: Record<LineStatus["key"], string> = {
  ready: "bg-champagne",
  open: "bg-vault-ink",
  overdue: "bg-[oklch(0.82_0.12_80)]",
  "past-grace": "bg-[oklch(0.72_0.16_30)]",
  defaulted: "bg-[oklch(0.72_0.16_30)]",
};

/**
 * The credit line as one object: the only fully colored surface in the app. Everything printed on
 * it is public on Solana; the card never shows who owns it, because the chain does not know.
 */
export function CreditCard({
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
  const dueText =
    credit.debt === 0n
      ? "No open loan"
      : now <= due
        ? `in ${formatSeconds(due - now)}`
        : now <= due + Number(graceSecs)
          ? `grace ends in ${formatSeconds(due + Number(graceSecs) - now)}`
          : `${formatSeconds(now - due)} late`;

  return (
    <article
      aria-label="Your credit line"
      className={`relative isolate overflow-hidden rounded-object border border-vault-line bg-[linear-gradient(135deg,var(--color-vault-2),var(--color-vault)_62%)] p-6 text-vault-ink shadow-[var(--shadow-object)] transition-[filter] duration-300 sm:p-7 ${
        credit.defaulted ? "saturate-[0.35]" : ""
      }`}
    >
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-20 -bottom-28 -z-10 size-80 opacity-[0.14]">
        <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="52" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="flex items-center justify-between gap-4">
        <p className="text-small font-medium text-vault-muted">Anuma credit line</p>
        <span className="inline-flex h-7 items-center gap-2 rounded-full border border-vault-line bg-vault/40 px-3 text-caption font-medium text-vault-ink">
          <span aria-hidden className={`size-1.5 rounded-full ${DOT[status.key]}`} />
          {status.label}
        </span>
      </div>

      <div className="mt-8">
        <p className="text-small text-vault-muted">Credit limit</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-figure font-semibold tracking-tight tabular">{formatUsdc(credit.limit)}</span>
          <span className="text-body text-vault-muted">mUSDC</span>
        </p>
      </div>

      <div className="mt-6">
        <ol aria-label="Limit ladder" className="flex items-center gap-1.5">
          {ladder.map((step, i) => (
            <li key={step.toString()} className="flex flex-1 flex-col gap-1.5">
              <span aria-hidden className={`h-1 rounded-full ${i <= reached ? "bg-champagne" : "bg-vault-line"}`} />
              <span className={`text-caption tabular ${i === reached ? "font-medium text-vault-ink" : "text-vault-muted"}`}>
                {formatUsdc(step).replace(/\.00$/, "")}
                <span className="sr-only">{i <= reached ? " reached" : " not reached"}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-caption text-vault-muted">
          {credit.defaulted
            ? "A defaulted line never grows again."
            : nextLimit
              ? `Repay on time to reach ${formatUsdc(nextLimit)} mUSDC.`
              : "Maximum unsecured limit reached."}
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-vault-line pt-5">
        <div className="min-w-0">
          <dt className="text-caption text-vault-muted">Pseudonym</dt>
          <dd className="mt-1 truncate font-mono text-small" title={credit.pseudonym.toBase58()}>
            {shortKey(credit.pseudonym.toBase58(), 4, 4)}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-vault-muted">Open debt</dt>
          <dd className="mt-1 text-small font-medium tabular">{formatUsdc(credit.debt)}</dd>
        </div>
        <div>
          <dt className="text-caption text-vault-muted">Due</dt>
          <dd className="mt-1 text-small font-medium tabular">{dueText}</dd>
        </div>
      </dl>
    </article>
  );
}
