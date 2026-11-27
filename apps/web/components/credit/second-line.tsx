"use client";

import { UserRoundX } from "lucide-react";
import { Address, Button, Notice, Panel } from "../ui";
import { useAction } from "./use-action";
import type { CreditState } from "./use-credit";

/**
 * The Sybil-resistance check, run for real: prove again for a brand-new pseudonym and send
 * open_credit. The proof is valid, but the nullifier already owns a line, so the program refuses.
 */
export function SecondLine({ state }: { state: CreditState }) {
  const { secondLine, proof, actions } = state;
  const attempt = useAction(actions.trySecondLine);
  return (
    <Panel title="One person, one line" description="Wallets are free to create. Your nullifier is not.">
      <div className="flex flex-col gap-4">
        <p className="text-small text-ink-2">
          Try to open a second line from another fresh wallet. Your browser makes a new, valid proof, and the program checks it on chain.
        </p>
        <div>
          <Button
            variant="secondary"
            size="lg"
            icon={<UserRoundX aria-hidden className="size-4" />}
            busy={attempt.busy}
            busyLabel={proof?.phase === "proving" ? "Generating proof" : "Submitting"}
            onClick={() => void attempt.run()}
          >
            Try a second line from a new wallet
          </Button>
        </div>
        {secondLine && (
          <Notice tone={secondLine.refused ? "primary" : "danger"} title={secondLine.refused ? "Second line refused" : "Unexpected result"}>
            <p>{secondLine.message}</p>
            <p className="mt-1 inline-flex flex-wrap items-center gap-1">
              New wallet tried: <Address value={secondLine.pseudonym} head={4} tail={4} />
            </p>
          </Notice>
        )}
        {attempt.error && <Notice tone="danger">{attempt.error}</Notice>}
      </div>
    </Panel>
  );
}
