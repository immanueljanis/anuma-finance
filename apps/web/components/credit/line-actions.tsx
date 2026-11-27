"use client";

import { ArrowUpRight, ClipboardPaste, Coins, Gavel, ReceiptText, RotateCcw, Store, X } from "lucide-react";
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
  const [pasteError, setPasteError] = useState<string | null>(null);
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

  const paste = async () => {
    setPasteError(null);
    try {
      setLink((await navigator.clipboard.readText()).trim());
      pay.setError(null);
    } catch {
      setPasteError("Your browser blocked clipboard access. Paste the link into the field instead.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="invoice" className="text-small font-medium text-ink">
            Solana Pay link
          </label>
          {link ? (
            <button
              type="button"
              onClick={() => setLink("")}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-caption font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X aria-hidden className="size-3.5" />
              Clear
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void paste()}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-caption font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ClipboardPaste aria-hidden className="size-3.5" />
              Paste
            </button>
          )}
        </div>
        <textarea
          id="invoice"
          rows={2}
          spellCheck={false}
          placeholder="solana:…?amount=18&spl-token=…&reference=…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            pay.setError(null);
          }}
          aria-invalid={Boolean(parsed.error)}
          aria-describedby="invoice-hint"
          className={`${inputClass} h-auto resize-none py-3 font-mono text-caption [word-break:break-all]`}
        />
        <p id="invoice-hint" className={`text-caption ${parsed.error || pasteError ? "text-danger" : "text-muted"}`}>
          {parsed.error ?? pasteError ?? (
            <>
              Any Solana Pay invoice in mock USDC works.{" "}
              <Link href="/merchant" target="_blank" className="inline-flex items-center gap-0.5 font-medium text-ink underline-offset-2 hover:underline">
                Get one from the demo store
                <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            </>
          )}
        </p>
      </div>

      {parsed.request && (
        <div className="animate-fade-up rounded-2xl bg-surface p-5 ring-1 ring-line">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-ink-2 ring-1 ring-line">
                <Store aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{parsed.request.label ?? "Merchant"}</p>
                <p className="truncate text-small text-muted">{parsed.request.message ?? `To ${shortKey(parsed.request.recipient.toBase58())}`}</p>
              </div>
            </div>
            <p className="text-right">
              <span className="text-2xl font-semibold tracking-tight text-ink tabular">{formatUsdc(parsed.request.amount)}</span>
              <span className="ml-1 text-small text-muted">mUSDC</span>
            </p>
          </div>
          {overLimit && <p className="mt-3 text-small text-danger">This is above your {formatUsdc(credit!.limit)} mUSDC limit.</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
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
          {parsed.request ? `Pay ${formatUsdc(parsed.request.amount)} mUSDC` : "Pay with credit"}
        </Button>
        <span className="text-caption text-muted">Repay within the loan term to raise your limit.</span>
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
  const graceEnd = Number(credit.dueTs) + Number(group.graceSecs);
  const enough = pseudonymBalance !== null && pseudonymBalance >= credit.debt;

  return (
    <div className="flex flex-col gap-5">
      {status.key === "overdue" && (
        <Notice tone="warn" title="Overdue">
          Repay within {formatSeconds(graceEnd - now)} to keep the line. A late repayment clears the debt but does not raise the limit.
        </Notice>
      )}
      {status.key === "past-grace" && (
        <Notice tone="danger" title="Grace period over">
          Anyone can now mark this line as defaulted. A default stays with the person, not just this wallet.
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div>
          <p className="text-caption text-muted">Pseudonym balance</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-ink tabular">
            {pseudonymBalance === null ? "…" : formatUsdc(pseudonymBalance)} <span className="text-small font-normal text-muted">mUSDC</span>
          </p>
        </div>
        {!enough && (
          <Button variant="secondary" icon={<Coins aria-hidden className="size-4" />} busy={fund.busy} busyLabel="Minting test funds" onClick={() => void fund.run()}>
            Get 100 test mUSDC
          </Button>
        )}
      </div>

      <p className="text-small text-ink-2">
        Repay from the pseudonym. Paying from your main wallet would put both keys in one transaction and link them for good.
      </p>

      <div className="flex flex-wrap gap-3">
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
          wallet cannot open a clean line either.
        </p>
      </Panel>
    );
  }
  return status.key === "ready" ? (
    <Panel title="Pay with credit" description="Buy now from any Solana Pay merchant, repay within the term.">
      <PayInvoice state={state} />
    </Panel>
  ) : (
    <Panel title="Repay your loan" description={state.credit ? `Due at ${new Date((Number(state.credit.dueTs) - state.clockOffset) * 1000).toLocaleTimeString("en-GB")}` : undefined}>
      <Repay state={state} status={status} />
    </Panel>
  );
}
