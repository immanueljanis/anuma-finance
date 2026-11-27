"use client";

import { formatSeconds, formatUsdc } from "@/lib/format";
import { Notice, Skeleton } from "../ui";
import { ActivityList } from "./activity-list";
import { CreditCard } from "./credit-card";
import { LineActions } from "./line-actions";
import { lineStatus } from "./line-status";
import { Onboarding } from "./onboarding";
import { PrivacyBoundary } from "./privacy-boundary";
import { SecondLine } from "./second-line";
import { useCredit } from "./use-credit";

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** The borrower surface: onboarding until a line exists, then the line, its actions and proofs. */
export function CreditApp() {
  const state = useCredit();
  const { group, groupError, identity, registered, credit, pseudonym, walletAddress, now, activity } = state;
  const loadingLine = Boolean(identity && registered && credit === undefined);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-[46rem]">
        <h1 className="text-heading font-semibold tracking-tight text-ink">Borrow without showing who you are</h1>
        <p className="mt-2 text-lead text-ink-2">
          Verify once with a KYC issuer. Every credit line after that opens from a fresh wallet with a zero-knowledge proof: the program knows a
          verified person owns it, never which person.
        </p>
        {group && (
          <p className="mt-3 text-small text-muted tabular">
            Lines start at {formatUsdc(group.startLimit)} mUSDC and grow 50% with each on-time repayment, up to {formatUsdc(group.maxUnsecuredLimit)}.
            Demo loan term {formatSeconds(Number(group.loanTermSecs))}, grace {formatSeconds(Number(group.graceSecs))}.
          </p>
        )}
      </header>

      {groupError && (
        <Notice tone="danger" title="Cannot reach the Anuma program">
          {groupError}
        </Notice>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {credit && group ? (
            <>
              <CreditCard
                credit={credit}
                status={lineStatus(credit, BigInt(group.graceSecs), now)}
                startLimit={BigInt(group.startLimit)}
                maxLimit={BigInt(group.maxUnsecuredLimit)}
                graceSecs={BigInt(group.graceSecs)}
                now={now}
              />
              {pseudonym ? (
                <LineActions state={state} status={lineStatus(credit, BigInt(group.graceSecs), now)} />
              ) : (
                <Notice tone="warn" title="Pseudonym key not found">
                  This line was opened with a pseudonym this browser cannot derive. Use the wallet that opened it.
                </Notice>
              )}
              <SecondLine state={state} />
            </>
          ) : loadingLine ? (
            <div aria-busy className="flex h-72 flex-col justify-between rounded-object bg-surface-2 p-7">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-4 w-full" />
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
