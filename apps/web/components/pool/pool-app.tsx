"use client";

import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Coins, Gavel, Landmark, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchGroup, getJson, postJson, relay, relayWithWallet } from "@/lib/anuma/browser";
import { depositIx, markDefaultIx } from "@/lib/anuma/program";
import { useNow } from "@/lib/clock";
import { formatSeconds, formatUsdc } from "@/lib/format";
import { parseUnits } from "@/lib/solana-pay";
import { lineStatus, type LineStatus } from "../credit/line-status";
import { useAction } from "../credit/use-action";
import { Address, Button, Field, Notice, Panel, Pill, Skeleton, inputClass } from "../ui";

type PoolLine = { address: string; pseudonym: string; limit: string; debt: string; dueTs: number; repaidCount: number; defaulted: boolean };
type PoolState = { vault: string; vaultBalance: string; usdcMint: string; graceSecs: string; memberCount: number; lines: PoolLine[] };

const SEVERITY: Record<LineStatus["key"], number> = { "past-grace": 0, overdue: 1, open: 2, ready: 3, defaulted: 4 };

function usePool() {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ data: PoolState | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    let live = true;
    const load = () =>
      getJson<PoolState>("/api/pool").then(
        (data) => live && setState({ data, error: null }),
        (error) => live && setState((s) => ({ ...s, error: error instanceof Error ? error.message : String(error) })),
      );
    void load();
    const timer = setInterval(load, 6000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
}

function Stat({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        {value === null ? <Skeleton className="h-6 w-20" /> : <span className="text-title font-semibold tabular text-ink">{value}</span>}
        {unit && value !== null && <span className="text-small text-muted">{unit}</span>}
      </dd>
    </div>
  );
}

function Deposit({ usdcMint, onDone }: { usdcMint: string; onDone: () => void }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [amount, setAmount] = useState("100");
  const [balance, setBalance] = useState<{ key: string; value: bigint } | null>(null);
  const [version, setVersion] = useState(0);
  const owner = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!owner) return;
    const ata = getAssociatedTokenAddressSync(new PublicKey(usdcMint), new PublicKey(owner), true);
    let live = true;
    connection.getTokenAccountBalance(ata, "confirmed").then(
      (r) => live && setBalance({ key: owner, value: BigInt(r.value.amount) }),
      () => live && setBalance({ key: owner, value: 0n }),
    );
    return () => {
      live = false;
    };
  }, [connection, owner, usdcMint, version]);
  const held = owner && balance?.key === owner ? balance.value : null;
  const empty = held === 0n;

  let units: bigint | null = null;
  let amountError: string | undefined;
  try {
    units = parseUnits(amount.trim() || "0", 6);
    if (units <= 0n) amountError = "Enter an amount above zero";
    else if (held !== null && !empty && units > held) amountError = `More than this wallet holds (${formatUsdc(held)} mUSDC)`;
  } catch (error) {
    amountError = error instanceof Error ? error.message : String(error);
  }

  const fund = useAction(async () => {
    if (!owner) return;
    await postJson("/api/faucet", { owner });
    setVersion((v) => v + 1);
  });
  const deposit = useAction(async () => {
    if (!publicKey || !signTransaction || !units) return;
    const group = await fetchGroup();
    const lenderToken = getAssociatedTokenAddressSync(new PublicKey(usdcMint), publicKey, true);
    await relayWithWallet(connection, group.relayer, new Transaction().add(depositIx({ lender: publicKey, lenderToken, amount: units })), signTransaction);
    setVersion((v) => v + 1);
    onDone();
  });

  if (!owner) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-small text-ink-2">Connect a wallet to add liquidity. The relayer pays the fee, so the wallet needs mock USDC but no SOL.</p>
        <Button icon={<Wallet aria-hidden className="size-4" />} onClick={() => setVisible(true)}>
          Connect wallet
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amountError) void deposit.run();
      }}
    >
      <p className="text-small text-ink-2">
        Wallet balance: <span className="font-medium tabular text-ink">{held === null ? "…" : `${formatUsdc(held)} mUSDC`}</span>
      </p>
      <Field
        id="deposit-amount"
        label="Amount (mUSDC)"
        error={amount ? amountError : undefined}
        hint={empty ? "This wallet holds no mock USDC yet. Get 100 test mUSDC first, then deposit." : undefined}
      >
        <input
          id="deposit-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={Boolean(amount && amountError)}
          aria-describedby={amountError ? "deposit-amount-error" : empty ? "deposit-amount-hint" : undefined}
          className={`${inputClass} tabular`}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant={empty ? "secondary" : "primary"}
          icon={<Landmark aria-hidden className="size-4" />}
          disabled={Boolean(amountError) || empty || held === null}
          busy={deposit.busy}
          busyLabel="Depositing"
        >
          Deposit
        </Button>
        <Button variant={empty ? "primary" : "secondary"} icon={<Coins aria-hidden className="size-4" />} busy={fund.busy} busyLabel="Minting" onClick={() => void fund.run()}>
          Get 100 test mUSDC
        </Button>
      </div>
      {[deposit.error, fund.error].filter(Boolean).map((m) => (
        <Notice key={m} tone="danger">
          {m}
        </Notice>
      ))}
    </form>
  );
}

function MarkDefault({ line, onDone }: { line: PoolLine; onDone: () => void }) {
  const { connection } = useConnection();
  const action = useAction(async () => {
    const group = await fetchGroup();
    await relay(connection, group.relayer, new Transaction().add(markDefaultIx({ credit: new PublicKey(line.address) })), []);
    onDone();
  });
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="danger" size="sm" icon={<Gavel aria-hidden className="size-3.5" />} busy={action.busy} busyLabel="Marking" onClick={() => void action.run()}>
        Mark default
      </Button>
      {action.error && <span className="max-w-48 text-right text-caption text-danger">{action.error}</span>}
    </div>
  );
}

/** Lender view: liquidity, deposits, and the public ledger of anonymous credit lines. */
export function PoolApp() {
  const { data, error, reload } = usePool();
  const lines = data?.lines ?? [];
  const now = useNow(lines.some((l) => l.debt !== "0" && !l.defaulted));
  const grace = BigInt(data?.graceSecs ?? "0");
  const rows = lines
    .map((line) => ({ line, status: lineStatus({ debt: BigInt(line.debt), dueTs: BigInt(line.dueTs), defaulted: line.defaulted }, grace, now) }))
    .sort((a, b) => SEVERITY[a.status.key] - SEVERITY[b.status.key] || Number(BigInt(b.line.limit) - BigInt(a.line.limit)));
  const outstanding = lines.reduce((sum, l) => sum + BigInt(l.debt), 0n);
  const defaulted = lines.filter((l) => l.defaulted).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-[46rem]">
        <h1 className="text-heading font-semibold tracking-tight text-ink">Lending pool</h1>
        <p className="mt-2 text-lead text-ink-2">
          Every line below belongs to a KYC-verified person, and none of them says which person. Lenders price the pool from repayment behavior, not
          from identities.
        </p>
      </header>

      {error && (
        <Notice tone="danger" title="Cannot load the pool">
          {error}
        </Notice>
      )}

      <dl className="grid grid-cols-2 divide-line rounded-panel border border-line sm:grid-cols-4 sm:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line sm:[&>*:nth-child(-n+2)]:border-b-0">
        <Stat label="Vault liquidity" value={data ? formatUsdc(data.vaultBalance) : null} unit="mUSDC" />
        <Stat label="Outstanding" value={data ? formatUsdc(outstanding) : null} unit="mUSDC" />
        <Stat label="Credit lines" value={data ? String(lines.length) : null} unit={data ? `of ${data.memberCount} verified` : undefined} />
        <Stat label="Defaulted" value={data ? String(defaulted) : null} unit={data ? "lines" : undefined} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <Panel className="min-w-0" title="Credit lines" description="Public on Solana. Sorted by what needs attention first.">
          {!data ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-small text-muted">No credit lines yet. The first one appears here as soon as a verified person opens it on the Credit page.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-small">
                <thead>
                  <tr className="border-b border-line text-caption text-muted">
                    <th scope="col" className="px-5 pb-2.5 font-medium">Pseudonym</th>
                    <th scope="col" className="px-3 pb-2.5 text-right font-medium">Limit</th>
                    <th scope="col" className="px-3 pb-2.5 text-right font-medium">Open debt</th>
                    <th scope="col" className="px-3 pb-2.5 font-medium">Due</th>
                    <th scope="col" className="px-3 pb-2.5 text-right font-medium">On-time repayments</th>
                    <th scope="col" className="px-5 pb-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(({ line, status }) => (
                    <tr key={line.address} className="align-middle">
                      <td className="px-5 py-3">
                        <Address value={line.pseudonym} head={4} tail={4} />
                      </td>
                      <td className="px-3 py-3 text-right tabular text-ink">{formatUsdc(line.limit)}</td>
                      <td className="px-3 py-3 text-right tabular text-ink">{formatUsdc(line.debt)}</td>
                      <td className="px-3 py-3 tabular text-ink-2">
                        {line.debt === "0" ? "–" : now <= line.dueTs ? `in ${formatSeconds(line.dueTs - now)}` : `${formatSeconds(now - line.dueTs)} late`}
                      </td>
                      <td className="px-3 py-3 text-right tabular text-ink-2">{line.repaidCount}</td>
                      <td className="px-5 py-3 text-right">
                        {status.key === "past-grace" ? <MarkDefault line={line} onDone={reload} /> : <Pill tone={status.tone}>{status.label}</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Add liquidity" description="Deposits fund every line in the pool.">
            {data ? <Deposit usdcMint={data.usdcMint} onDone={reload} /> : <Skeleton className="h-24 w-full" />}
          </Panel>
          <Panel title="Why lenders can trust anonymous lines">
            <ul className="flex flex-col gap-3 text-small text-ink-2">
              <li>Each line needs a zero-knowledge proof of a KYC-verified person, checked on chain.</li>
              <li>One person can hold one line, ever. A defaulter cannot come back with a new wallet.</li>
              <li>Limits start small and grow only with on-time repayments, so exposure follows behavior.</li>
              <li>Any default is visible here and can be flagged by anyone after {data ? formatSeconds(Number(data.graceSecs)) : "the"} grace.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
