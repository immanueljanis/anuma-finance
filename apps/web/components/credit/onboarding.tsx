"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, Fingerprint, KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { shortKey } from "@/lib/format";
import { Button, Field, Notice, inputClass } from "../ui";
import { useAction } from "./use-action";
import type { CreditState } from "./use-credit";

type StepState = "done" | "current" | "locked";

function Step({ n, state, title, summary, children }: { n: number; state: StepState; title: string; summary: ReactNode; children?: ReactNode }) {
  return (
    <li className="group relative flex gap-4 pb-8 last:pb-0">
      <span aria-hidden className="absolute top-9 bottom-0 left-[1.0625rem] w-px bg-line group-last:hidden" />
      <span
        aria-hidden
        className={`relative z-10 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full border text-small font-semibold tabular transition-colors duration-200 ${
          state === "done"
            ? "border-primary bg-primary text-on-primary"
            : state === "current"
              ? "border-primary bg-bg text-primary"
              : "border-line bg-surface text-muted"
        }`}
      >
        {state === "done" ? <Check className="size-4" /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <h3 className={`text-body font-semibold ${state === "locked" ? "text-muted" : "text-ink"}`}>
          {title}
          <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current step)" : " (not yet available)"}</span>
        </h3>
        <div className={`mt-1 text-small ${state === "locked" ? "text-muted" : "text-ink-2"}`}>{summary}</div>
        {state === "current" && children && <div className="mt-4 animate-fade-up">{children}</div>}
      </div>
    </li>
  );
}

/** The four steps before a credit line exists. Each completed step states what it produced. */
export function Onboarding({ state }: { state: CreditState }) {
  const { setVisible } = useWalletModal();
  const { walletAddress, identity, registered, memberIndex, group, proof, actions } = state;
  const [nik, setNik] = useState("");
  const sign = useAction(actions.createIdentity);
  const verify = useAction(actions.register);
  const open = useAction(actions.openCredit);

  const step = !walletAddress ? 1 : !identity ? 2 : !registered ? 3 : 4;
  const stateOf = (n: number): StepState => (n < step ? "done" : n === step ? "current" : "locked");
  const nikDigits = nik.replace(/\D/g, "");
  const nikValid = nikDigits.length === 16;
  const crowd = group?.commitments.length ?? 0;

  return (
    <section aria-labelledby="setup-title" className="rounded-panel border border-line bg-bg p-6 sm:p-7">
      <h2 id="setup-title" className="text-title font-semibold text-ink">
        Open your private credit line
      </h2>
      <p className="mt-1 max-w-[60ch] text-small text-muted">Four steps, about a minute. Only step 3 asks for personal data, and only the issuer sees it.</p>

      <ol className="mt-7">
        <Step
          n={1}
          state={stateOf(1)}
          title="Connect your main wallet"
          summary={walletAddress ? <>Connected as <span className="font-mono">{shortKey(walletAddress, 4, 4)}</span>.</> : "It proves you are you, once. It never pays or borrows."}
        >
          <Button size="lg" icon={<Wallet aria-hidden className="size-4" />} onClick={() => setVisible(true)}>
            Connect wallet
          </Button>
        </Step>

        <Step
          n={2}
          state={stateOf(2)}
          title="Create your private identity"
          summary={
            identity ? (
              <>Identity ready. Public commitment <span className="font-mono">{shortKey(identity.commitment.toString(), 6, 4)}</span>.</>
            ) : (
              "Sign one message. Your browser turns the signature into a Semaphore identity. Nothing is sent."
            )
          }
        >
          <div className="flex flex-col gap-3">
            <Button size="lg" icon={<Fingerprint aria-hidden className="size-4" />} busy={sign.busy} busyLabel="Waiting for signature" onClick={() => void sign.run()}>
              Sign to create identity
            </Button>
            {sign.error && <Notice tone="danger">{sign.error}</Notice>}
          </div>
        </Step>

        <Step
          n={3}
          state={stateOf(3)}
          title="Verify once with the issuer"
          summary={
            registered ? (
              <>Verified. You are one of {crowd} {crowd === 1 ? "member" : "members"}; on chain you are only commitment #{memberIndex + 1}.</>
            ) : (
              "Demo issuer: any 16-digit NIK passes. One NIK registers one identity, ever."
            )
          }
        >
          <form
            className="flex max-w-md flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (nikValid) void verify.run(nikDigits);
            }}
          >
            <Field
              id="nik"
              label="NIK (national ID number)"
              hint="The chain stores HMAC(issuer key, NIK), never the number."
              error={nik && !nikValid ? `Enter 16 digits (${nikDigits.length} so far)` : undefined}
            >
              <input
                id="nik"
                inputMode="numeric"
                autoComplete="off"
                placeholder="3174 0123 4567 0001"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                aria-invalid={Boolean(nik) && !nikValid}
                aria-describedby={nik && !nikValid ? "nik-error" : "nik-hint"}
                className={`${inputClass} font-mono tabular`}
              />
            </Field>
            <div>
              <Button type="submit" size="lg" icon={<ShieldCheck aria-hidden className="size-4" />} disabled={!nikValid} busy={verify.busy} busyLabel="Verifying and registering">
                Verify NIK
              </Button>
            </div>
            {verify.error && <Notice tone="danger">{verify.error}</Notice>}
          </form>
        </Step>

        <Step
          n={4}
          state={stateOf(4)}
          title="Open your anonymous credit line"
          summary={`Your browser proves you are one of ${crowd} verified ${crowd === 1 ? "person" : "people"}, without saying which, for a brand-new wallet. The relayer pays the fee, so that wallet needs no SOL.`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                icon={<KeyRound aria-hidden className="size-4" />}
                busy={open.busy}
                busyLabel={proof?.phase === "proving" ? "Generating proof" : proof?.phase === "sending" ? "Opening line" : "Preparing"}
                onClick={() => void open.run()}
              >
                Generate proof and open line
              </Button>
              {proof?.provingMs !== undefined && (
                <span className="text-small text-muted tabular" role="status">
                  Proof made in {(proof.provingMs / 1000).toFixed(2)} s
                </span>
              )}
            </div>
            {open.error && <Notice tone="danger">{open.error}</Notice>}
          </div>
        </Step>
      </ol>
    </section>
  );
}
