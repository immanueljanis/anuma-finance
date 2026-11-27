"use client";

import { Identity } from "@semaphore-protocol/identity";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ComputeBudgetProgram, PublicKey, Transaction, type Keypair } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { fetchGroup, isExistingLine, postJson, relay, type GroupInfo } from "@/lib/anuma/browser";
import { borrowIx, creditPda, decodeCredit, markDefaultIx, openCreditIx, repayIx, type CreditAccount } from "@/lib/anuma/program";
import { useChainOffset, useNow } from "@/lib/clock";
import { readLocal, useLocalValue, writeLocal } from "@/lib/local-store";
import { parseTransferRequest, type TransferRequest } from "@/lib/solana-pay";
import { USDC_DECIMALS } from "@/lib/format";
import { be32 } from "@/lib/zk/encoding";
import { IDENTITY_MESSAGE, identityFromSignature, nullifierOf, pseudonymOf } from "@/lib/zk/identity";

export type Activity = { kind: "register" | "open" | "pay" | "repay" | "faucet" | "default"; label: string; signature: string; at: number };

/** Result of the "second line from a new wallet" check, shown as the Sybil-resistance moment. */
export type SecondLineResult = { pseudonym: string; refused: boolean; message: string };

export type ProofProgress = { phase: "syncing" | "proving" | "sending"; provingMs?: number } | null;

const identityKey = (wallet: string) => `anuma:identity:${wallet}`;
const activityKey = (commitment: string) => `anuma:activity:${commitment}`;
const decodeBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function parseIdentity(stored: string | null): Identity | null {
  if (!stored) return null;
  try {
    return Identity.import(stored);
  } catch {
    return null;
  }
}

function parseActivity(stored: string | null): Activity[] {
  try {
    return stored ? (JSON.parse(stored) as Activity[]) : [];
  } catch {
    return [];
  }
}

/**
 * All borrower state and actions. The identity, nullifier and pseudonyms derive from one wallet
 * signature, so the hook recovers an existing line on any device; localStorage only caches the
 * identity and the activity list. Chain reads are stored with the key they were read for, so a
 * wallet switch never shows another identity's line, and no effect resets state synchronously.
 */
export function useCredit() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signMessage, signTransaction } = wallet;
  const walletAddress = wallet.publicKey?.toBase58() ?? null;

  const storedIdentity = useLocalValue(walletAddress ? identityKey(walletAddress) : null);
  const currentIdentity = useMemo(() => parseIdentity(storedIdentity), [storedIdentity]);

  const commitment = currentIdentity?.commitment.toString() ?? null;
  const nullifierHex = useMemo(() => (currentIdentity ? toHex(be32(nullifierOf(currentIdentity))) : null), [currentIdentity]);
  const activity = parseActivity(useLocalValue(commitment ? activityKey(commitment) : null));

  const [groupVersion, setGroupVersion] = useState(0);
  const [groupState, setGroupState] = useState<{ data: GroupInfo | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    let live = true;
    fetchGroup().then(
      (data) => live && setGroupState({ data, error: null }),
      (error) => live && setGroupState((s) => ({ ...s, error: message(error) })),
    );
    return () => {
      live = false;
    };
  }, [groupVersion]);
  const group = groupState.data;

  const [creditVersion, setCreditVersion] = useState(0);
  const [creditState, setCreditState] = useState<{ key: string; value: CreditAccount | null } | null>(null);
  useEffect(() => {
    if (!nullifierHex) return;
    let live = true;
    connection.getAccountInfo(creditPda(fromHex(nullifierHex)), "confirmed").then(
      (info) => live && setCreditState({ key: nullifierHex, value: info ? decodeCredit(info.data) : null }),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [connection, nullifierHex, creditVersion]);
  const credit: CreditAccount | null | undefined = !nullifierHex ? null : creditState?.key === nullifierHex ? creditState.value : undefined;

  const memberIndex = group && commitment ? group.commitments.indexOf(commitment) : -1;
  const registered = memberIndex >= 0;

  const pseudonymIndex = useMemo(() => {
    if (!currentIdentity || !credit) return -1;
    for (let i = 0; i < 16; i++) if (pseudonymOf(currentIdentity, i).publicKey.equals(credit.pseudonym)) return i;
    return -1;
  }, [currentIdentity, credit]);
  const pseudonym: Keypair | null = useMemo(
    () => (currentIdentity && pseudonymIndex >= 0 ? pseudonymOf(currentIdentity, pseudonymIndex) : null),
    [currentIdentity, pseudonymIndex],
  );

  const balanceKey = group && credit ? `${group.usdcMint}:${credit.pseudonym.toBase58()}` : null;
  const [balanceVersion, setBalanceVersion] = useState(0);
  const [balanceState, setBalanceState] = useState<{ key: string; value: bigint } | null>(null);
  useEffect(() => {
    if (!balanceKey) return;
    const [mint, owner] = balanceKey.split(":");
    const ata = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), true);
    let live = true;
    connection.getTokenAccountBalance(ata, "confirmed").then(
      (result) => live && setBalanceState({ key: balanceKey, value: BigInt(result.value.amount) }),
      () => live && setBalanceState({ key: balanceKey, value: 0n }),
    );
    return () => {
      live = false;
    };
  }, [connection, balanceKey, balanceVersion]);
  const pseudonymBalance = balanceState?.key === balanceKey ? balanceState.value : null;

  const hasDebt = Boolean(credit && credit.debt > 0n);
  const clockOffset = useChainOffset(connection, hasDebt);
  const now = useNow(hasDebt) + clockOffset;

  const [proof, setProof] = useState<ProofProgress>(null);
  const [secondLineState, setSecondLineState] = useState<(SecondLineResult & { key: string }) | null>(null);
  const secondLine = secondLineState && secondLineState.key === nullifierHex ? secondLineState : null;
  const [secondAttempts, setSecondAttempts] = useState(0);

  const record = (entry: Omit<Activity, "at">) => {
    if (!commitment) return;
    const key = activityKey(commitment);
    const next = [{ ...entry, at: Math.floor(Date.now() / 1000) }, ...parseActivity(readLocal(key))].slice(0, 30);
    writeLocal(key, JSON.stringify(next));
  };

  const reloadLine = () => {
    setCreditVersion((v) => v + 1);
    setBalanceVersion((v) => v + 1);
  };

  const refresh = () => {
    setGroupVersion((v) => v + 1);
    reloadLine();
  };

  const createIdentity = async () => {
    if (!walletAddress || !signMessage) throw new Error("This wallet cannot sign messages. Try Phantom, Solflare or Backpack.");
    const signature = await signMessage(IDENTITY_MESSAGE);
    writeLocal(identityKey(walletAddress), identityFromSignature(signature).export());
  };

  const register = async (idNumber: string) => {
    if (!publicKey || !signTransaction || !currentIdentity) throw new Error("Connect a wallet and create your identity first");
    const { tx } = await postJson<{ tx: string }>("/api/register", {
      wallet: publicKey.toBase58(),
      idNumber,
      commitment: currentIdentity.commitment.toString(),
    });
    const signed = await signTransaction(Transaction.from(decodeBase64(tx)));
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");
    await postJson("/api/root/sync");
    record({ kind: "register", label: "Verified once with the issuer", signature });
    setGroupState({ data: await fetchGroup(), error: null });
  };

  /** Proves membership for pseudonym `index` and sends open_credit through the relayer. */
  const proveAndOpen = async (index: number) => {
    if (!currentIdentity) throw new Error("Create your identity first");
    setProof({ phase: "syncing" });
    try {
      await postJson("/api/root/sync");
      const fresh = await fetchGroup();
      setGroupState({ data: fresh, error: null });
      const target = pseudonymOf(currentIdentity, index);
      setProof({ phase: "proving" });
      const { proveCredit } = await import("@/lib/zk/prove");
      const made = await proveCredit(currentIdentity, fresh.commitments.map(BigInt), target.publicKey.toBytes());
      setProof({ phase: "sending", provingMs: made.provingMs });
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
        openCreditIx({ payer: new PublicKey(fresh.relayer), pseudonym: target.publicKey, ...made }),
      );
      const sent = await relay(connection, fresh.relayer, tx, [target]);
      return { ...sent, pseudonym: target.publicKey.toBase58(), provingMs: made.provingMs };
    } finally {
      setProof(null);
    }
  };

  const openCredit = async () => {
    const opened = await proveAndOpen(0);
    record({
      kind: "open",
      label: `Opened an anonymous line after ${(opened.provingMs / 1000).toFixed(1)} s of proving`,
      signature: opened.signature,
    });
    reloadLine();
  };

  const trySecondLine = async () => {
    if (!currentIdentity || !nullifierHex) return;
    const index = Math.max(pseudonymIndex, 0) + 1 + secondAttempts;
    setSecondAttempts((n) => n + 1);
    setSecondLineState(null);
    const target = pseudonymOf(currentIdentity, index).publicKey.toBase58();
    try {
      await proveAndOpen(index);
      setSecondLineState({
        key: nullifierHex,
        pseudonym: target,
        refused: false,
        message: "The program accepted a second line. This should not happen.",
      });
    } catch (error) {
      if (!isExistingLine(error)) throw error;
      setSecondLineState({
        key: nullifierHex,
        pseudonym: target,
        refused: true,
        message:
          "Refused by the program. The proof was valid, but it carries the same nullifier as your first line, and that nullifier already owns a line.",
      });
    }
  };

  const parseInvoice = (link: string): TransferRequest => {
    const request = parseTransferRequest(link, USDC_DECIMALS);
    if (group && request.splToken.toBase58() !== group.usdcMint) throw new Error("This invoice asks for a different token than Anuma's mock USDC");
    if (request.amount <= 0n) throw new Error("This invoice has no amount to pay");
    return request;
  };

  const payInvoice = async (request: TransferRequest) => {
    if (!group || !credit || !pseudonym) throw new Error("Open a credit line first");
    const merchantToken = getAssociatedTokenAddressSync(request.splToken, request.recipient, true);
    if (!(await connection.getAccountInfo(merchantToken))) throw new Error("The merchant has no token account for mock USDC yet");
    const tx = new Transaction().add(
      borrowIx({
        pseudonym: pseudonym.publicKey,
        credit: creditPda(credit.nullifier),
        merchantToken,
        amount: request.amount,
        references: request.references,
      }),
    );
    const { signature } = await relay(connection, group.relayer, tx, [pseudonym]);
    record({ kind: "pay", label: `Paid ${request.label ?? "a merchant"}${request.message ? `: ${request.message}` : ""}`, signature });
    reloadLine();
  };

  const fundPseudonym = async () => {
    if (!credit) return;
    const { signature } = await postJson<{ signature: string }>("/api/faucet", { owner: credit.pseudonym.toBase58() });
    record({ kind: "faucet", label: "Received 100 test mUSDC on the pseudonym", signature });
    setBalanceVersion((v) => v + 1);
  };

  const repay = async () => {
    if (!group || !credit || !pseudonym) throw new Error("Open a credit line first");
    const payerToken = getAssociatedTokenAddressSync(new PublicKey(group.usdcMint), pseudonym.publicKey, true);
    const tx = new Transaction().add(repayIx({ payer: pseudonym.publicKey, credit: creditPda(credit.nullifier), payerToken, amount: credit.debt }));
    const { signature } = await relay(connection, group.relayer, tx, [pseudonym]);
    record({ kind: "repay", label: "Repaid the open loan", signature });
    reloadLine();
  };

  const markDefault = async () => {
    if (!group || !credit) return;
    const tx = new Transaction().add(markDefaultIx({ credit: creditPda(credit.nullifier) }));
    const { signature } = await relay(connection, group.relayer, tx, []);
    record({ kind: "default", label: "Line marked as defaulted", signature });
    reloadLine();
  };

  return {
    wallet,
    walletAddress,
    group,
    groupError: groupState.error,
    identity: currentIdentity,
    registered,
    memberIndex,
    credit,
    pseudonym,
    pseudonymBalance,
    activity,
    proof,
    secondLine,
    now,
    clockOffset,
    actions: { refresh, createIdentity, register, openCredit, trySecondLine, parseInvoice, payInvoice, fundPseudonym, repay, markDefault },
  };
}

export type CreditState = ReturnType<typeof useCredit>;
