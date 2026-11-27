"use client";

import { ArrowUpRight, Coins, Gavel, ReceiptText, RotateCcw, Store } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { TransferRequest } from "@/lib/solana-pay";
import { formatSeconds, formatUsdc, shortKey } from "@/lib/format";
import { Button, Notice, Panel, inputClass } from "../ui";
import type { LineStatus } from "./line-status";
import { useAction } from "./use-action";
import type { CreditState } from "./use-credit";

function PayInvoice({ state }: { state: CreditState }) {
  const { credit, actions } = state;
  const [link, setLink] = useState("");
  const pay = useAction(actions.payInvoice);

  const parsed = useMemo((): { request?: TransferRequest; error?: string } => {
    if (!link.trim()) return {};
    try {
      return { request: actions.parseInvoice(link) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [link, actions]);

  const overLimit = Boolean(parsed.request && credit && parsed.request.amount > credit.limit);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invoice" className="text-small font-medium text-ink">
          Solana Pay link
        </label>
        <textarea
          id="invoice"
          rows={3}
          spellCheck={false}
          placeholder="solana:…?amount=18&spl-token=…&reference=…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            pay.setError(null);
          }}
          aria-invalid={Boolean(parsed.error)}
          aria-describedby="invoice-hint"
          className={`${inputClass} h-auto resize-none py-2.5 font-mono text-caption [word-break:break-all]`}
        />
        <p id="invoice-hint" className="text-caption text-muted">
          {parsed.error ?? (
            <>
              Paste any Solana Pay invoice in mock USDC. No invoice yet?{" "}
              <Link href="/merchant" target="_blank" className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline">
                Open the demo merchant
                <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            </>
          )}
        </p>
      </div>

      {parsed.request && (
        <div className="animate-fade-up rounded-control border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-bg text-ink-2">
                <Store aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{parsed.request.label ?? "Merchant"}</p>
                <p className="truncate text-small text-muted">{parsed.request.message ?? `To ${shortKey(parsed.request.recipient.toBase58())}`}</p>
              </div>
            </div>
            <p className="text-right">
              <span className="text-lead font-semibold tabular text-ink">{formatUsdc(parsed.request.amount)}</span>
              <span className="ml-1 text-small text-muted">mUSDC</span>
            </p>
          </div>
          {overLimit && (
            <p className="mt-3 text-small text-danger">This is above your {formatUsdc(credit!.limit)} mUSDC limit.</p>
          )}
        </div>
      )}

      <div>
        <Button
          size="lg"
          icon={<ReceiptText aria-hidden className="size-4" />}
          disabled={!parsed.request || overLimit}
          busy={pay.busy}
          busyLabel="Paying from your line"
          onClick={async () => {
            if (parsed.request && (await pay.run(parsed.request))) setLink("");
          }}
        >
          {parsed.request ? `Pay ${formatUsdc(parsed.request.amount)} mUSDC with credit` : "Pay with credit"}
        </Button>
      </div>
      {pay.error && <Notice tone="danger">{pay.error}</Notice>}
    </div>
  );
}

function Repay({ state, status }: { state: CreditState; status: LineStatus }) {
  const { credit, pseudonymBalance, group, now, actions } = state;
  const fund = useAction(actions.fundPseudonym);
  const repay = useAction(actions.repay);
  const markDefault = useAction(actions.markDefault);
  if (!credit || !group) return null;
  const due = Number(credit.dueTs);
  const graceEnd = due + Number(group.graceSecs);
  const enough = pseudonymBalance !== null && pseudonymBalance >= credit.debt;

  return (
    <div className="flex flex-col gap-4">
      {status.key === "overdue" && (
        <Notice tone="warn" title="Overdue">
          Repay within {formatSeconds(graceEnd - now)} to keep the line. A late repayment clears the debt but does not raise the limit.
        </Notice>
      )}
      {status.key === "past-grace" && (
        <Notice tone="danger" title="Grace period over">
          Anyone can now mark this line as defaulted. A default is permanent for the person, not just this wallet.
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-control bg-surface p-4">
        <div>
          <dt className="text-caption text-muted">Open debt</dt>
          <dd className="mt-0.5 text-lead font-semibold tabular text-ink">{formatUsdc(credit.debt)}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">Pseudonym balance</dt>
          <dd className="mt-0.5 text-lead font-semibold tabular text-ink">{pseudonymBalance === null ? "…" : formatUsdc(pseudonymBalance)}</dd>
        </div>
      </dl>

      <p className="text-small text-ink-2">
        Repay from the pseudonym wallet. Paying from your main wallet would put both keys in one transaction and link them for good.
      </p>

      <div className="flex flex-wrap gap-3">
        {!enough && (
          <Button variant="secondary" size="lg" icon={<Coins aria-hidden className="size-4" />} busy={fund.busy} busyLabel="Minting test funds" onClick={() => void fund.run()}>
            Get 100 test mUSDC
          </Button>
        )}
        <Button size="lg" icon={<RotateCcw aria-hidden className="size-4" />} disabled={!enough} busy={repay.busy} busyLabel="Repaying" onClick={() => void repay.run()}>
          Repay {formatUsdc(credit.debt)} mUSDC
        </Button>
        {status.key === "past-grace" && (
          <Button variant="danger" size="lg" icon={<Gavel aria-hidden className="size-4" />} busy={markDefault.busy} busyLabel="Marking default" onClick={() => void markDefault.run()}>
            Mark as defaulted
          </Button>
        )}
      </div>
      {[fund.error, repay.error, markDefault.error].filter(Boolean).map((message) => (
        <Notice key={message} tone="danger">
          {message}
        </Notice>
      ))}
    </div>
  );
}

/** The next action for this line: pay an invoice, repay the open loan, or nothing after a default. */
export function LineActions({ state, status }: { state: CreditState; status: LineStatus }) {
  if (status.key === "defaulted") {
    return (
      <Panel title="Line closed by default">
        <p className="text-small text-ink-2">
          This line was not repaid within the term and grace period. It cannot borrow again, and because the default is tied to your nullifier, a new
          wallet cannot open a clean line either. Try it below.
        </p>
      </Panel>
    );
  }
  return status.key === "ready" ? (
    <Panel title="Pay with credit" description="Buy now, repay within the loan term.">
      <PayInvoice state={state} />
    </Panel>
  ) : (
    <Panel title="Repay your loan" description={`Due ${state.credit ? new Date(Number(state.credit.dueTs) * 1000).toLocaleTimeString("en-GB") : ""}`}>
      <Repay state={state} status={status} />
    </Panel>
  );
}
