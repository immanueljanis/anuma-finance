"use client";

import { formatSeconds, formatUsdc } from "@/lib/format";
import { Notice, Skeleton } from "../ui";
import { ActivityList } from "./activity-list";
import { CreditCard, LineSummary } from "./credit-card";
import { LineActions } from "./line-actions";
import { lineStatus } from "./line-status";
import { Onboarding } from "./onboarding";
import { PrivacyBoundary } from "./privacy-boundary";
import { SecondLine } from "./second-line";
import { useCredit } from "./use-credit";

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const whole = (units: string) => formatUsdc(units).replace(/\.00$/, "");

/** The borrower surface: onboarding until a line exists, then the card, its state, actions and proofs. */
export function CreditApp() {
  const state = useCredit();
  const { group, groupError, identity, registered, credit, pseudonym, walletAddress, now, activity } = state;
  const loadingLine = Boolean(identity && registered && credit === undefined);
  const status = credit && group ? lineStatus(credit, BigInt(group.graceSecs), now) : null;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">{credit ? "Your credit" : "Private credit"}</h1>
          <p className="mt-2 max-w-xl text-body text-ink-2">Verified once. Every line opens from a fresh wallet with a zero-knowledge proof.</p>
        </div>
        {group && (
          <ul aria-label="Credit terms" className="flex flex-wrap gap-2 text-caption text-ink-2">
            {[
              `Starts at ${whole(group.startLimit)} mUSDC`,
              `+50% per on-time repayment`,
              `Up to ${whole(group.maxUnsecuredLimit)} mUSDC`,
              `${formatSeconds(Number(group.loanTermSecs))} demo term`,
            ].map((term) => (
              <li key={term} className="rounded-full bg-bg px-3 py-1.5 ring-1 ring-line">
                {term}
              </li>
            ))}
          </ul>
        )}
      </header>

      {groupError && (
        <Notice tone="danger" title="Cannot reach the Anuma program">
          {groupError}
        </Notice>
      )}

      {credit && group && status && (
        <section aria-label="Your line" className="grid items-center gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-14">
          <CreditCard credit={credit} status={status} />
          <LineSummary
            credit={credit}
            status={status}
            startLimit={BigInt(group.startLimit)}
            maxLimit={BigInt(group.maxUnsecuredLimit)}
            graceSecs={BigInt(group.graceSecs)}
            now={now}
          />
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {credit && group && status ? (
            <>
              {pseudonym ? (
                <LineActions state={state} status={status} />
              ) : (
                <Notice tone="warn" title="Pseudonym key not found">
                  This line was opened with a pseudonym this browser cannot derive. Use the wallet that opened it.
                </Notice>
              )}
              <SecondLine state={state} />
            </>
          ) : loadingLine ? (
            <div aria-busy className="grid items-center gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
              <span className="aspect-[1.586] w-full max-w-[28rem] animate-pulse rounded-object bg-surface-2" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-56" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ) : (
            <Onboarding state={state} />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <PrivacyBoundary
            pseudonym={credit?.pseudonym.toBase58()}
            nullifierHex={credit ? toHex(credit.nullifier) : undefined}
            walletAddress={walletAddress}
            memberCount={group?.commitments.length}
          />
          {identity && <ActivityList items={activity} />}
        </aside>
      </div>
    </div>
  );
}
