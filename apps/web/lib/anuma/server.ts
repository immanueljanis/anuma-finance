import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { Group } from "@semaphore-protocol/group";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import { be32, fromBe32 } from "../zk/encoding.ts";
import {
  ACCOUNT_SIZE,
  PROGRAM_ID,
  configPda,
  decodeConfig,
  decodePerson,
  discriminator,
  latestRoot,
  setRootIx,
  type ConfigAccount,
} from "./program.ts";

/**
 * Server-side helpers. The demo runs one server keypair as admin, KYC issuer, relayer fee payer and
 * mock-USDC mint authority. Never import this file from a client component. `SOLANA_RPC_URL` may
 * carry a provider API key, so it has no NEXT_PUBLIC_ prefix and never reaches the browser.
 */
export const RPC_URL = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");

let cachedKeypair: Keypair | undefined;

/** The server keypair from `ANUMA_SERVER_SECRET`, a solana-keygen JSON byte array. */
export function serverKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  const raw = process.env.ANUMA_SERVER_SECRET;
  if (!raw) throw new Error("ANUMA_SERVER_SECRET is not set");
  cachedKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  return cachedKeypair;
}

export function rpc(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

/**
 * A government ID number (passport, national ID card, driver's licence) as the demo issuer accepts
 * it: 6 to 20 letters or digits once spaces and dashes are removed, compared case-insensitively.
 */
export function normalizeIdNumber(input: string): string | null {
  const id = input.replace(/[\s-]+/g, "").toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(id) ? id : null;
}

/**
 * The on-chain person key: HMAC-SHA256(issuer secret, ID number). The chain sees only this value,
 * so the number stays with the issuer, and the same ID always maps to the same Person PDA, which
 * blocks a second registration.
 */
export function personIdFor(idNumber: string): Uint8Array {
  const secret = process.env.ANUMA_ISSUER_SECRET;
  if (!secret || secret.length < 32) throw new Error("ANUMA_ISSUER_SECRET is not set or shorter than 32 chars");
  return hmac(sha256, new TextEncoder().encode(secret), new TextEncoder().encode(idNumber));
}

export async function fetchConfig(conn: Connection): Promise<ConfigAccount | null> {
  const info = await conn.getAccountInfo(configPda());
  return info ? decodeConfig(info.data) : null;
}

/** All registered commitments in registration order. This order defines the Merkle tree. */
export async function fetchCommitments(conn: Connection): Promise<bigint[]> {
  const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: ACCOUNT_SIZE.Person },
      { memcmp: { offset: 0, bytes: bs58.encode(discriminator("account", "Person")) } },
    ],
  });
  return accounts
    .map(({ account }) => decodePerson(account.data))
    .sort((a, b) => a.index - b.index)
    .map((p) => fromBe32(p.commitment));
}

/** The LeanIMT root that Semaphore computes for these commitments, as 32 bytes big-endian. */
export function groupRoot(commitments: bigint[]): Uint8Array {
  return be32(new Group(commitments).root);
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Posts the root of the current member list when it differs from the latest posted root. Safe to
 * call any number of times: it only ever posts the root that matches on-chain registrations.
 */
export async function syncRoot(conn: Connection): Promise<{ root: string; members: number; signature: string | null }> {
  const [config, commitments] = await Promise.all([fetchConfig(conn), fetchCommitments(conn)]);
  if (!config) throw new Error("Program is not initialized");
  if (commitments.length === 0) return { root: "0", members: 0, signature: null };

  const root = groupRoot(commitments);
  const latest = latestRoot(config);
  if (latest && sameBytes(latest, root)) return { root: fromBe32(root).toString(), members: commitments.length, signature: null };

  const admin = serverKeypair();
  const tx = new Transaction().add(setRootIx({ admin: admin.publicKey, root }));
  const signature = await conn.sendTransaction(tx, [admin]);
  await conn.confirmTransaction(signature, "confirmed");
  return { root: fromBe32(root).toString(), members: commitments.length, signature };
}

const RELAYABLE = new Set(["open_credit", "deposit", "borrow", "repay", "mark_default"].map((n) => Buffer.from(discriminator("global", n)).toString("hex")));
const OPEN_CREDIT = Buffer.from(discriminator("global", "open_credit")).toString("hex");

/**
 * Accepts a transaction for the relayer only when the server key is the fee payer, every
 * instruction is a compute-budget instruction or a relayable Anuma instruction, and the server key
 * signs nothing else except as rent payer of `open_credit`. The server signature covers the whole
 * message, so without the last rule a caller could make the server authorize a token transfer.
 */
export function checkRelayable(tx: Transaction, server: PublicKey): string | null {
  if (!tx.feePayer?.equals(server)) return "fee payer must be the relayer";
  if (tx.instructions.length === 0 || tx.instructions.length > 4) return "unexpected instruction count";
  for (const ix of tx.instructions) {
    if (ix.programId.equals(ComputeBudgetProgram.programId)) continue;
    if (!ix.programId.equals(PROGRAM_ID)) return `program ${ix.programId.toBase58()} is not allowed`;
    const disc = Buffer.from(ix.data.subarray(0, 8)).toString("hex");
    if (!RELAYABLE.has(disc)) return "instruction is not relayable";
    const misuse = ix.keys.some((k, i) => k.pubkey.equals(server) && !(disc === OPEN_CREDIT && i === 0));
    if (misuse) return "relayer key may only pay fees and open_credit rent";
  }
  return null;
}

/** Why the relayer refused a transaction, with the status code the HTTP route returns. */
export class RelayError extends Error {
  readonly status: number;
  readonly detail: Record<string, unknown>;
  constructor(status: number, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Checks, co-signs as fee payer, simulates and sends a user transaction. A failed simulation is
 * never sent, so a bad transaction costs the relayer nothing. Throws `RelayError` on refusal.
 */
export async function relayTransaction(conn: Connection, tx: Transaction): Promise<{ signature: string; unitsConsumed?: number }> {
  const relayer = serverKeypair();
  const rejection = checkRelayable(tx, relayer.publicKey);
  if (rejection) throw new RelayError(400, rejection);

  tx.partialSign(relayer);
  if (!tx.verifySignatures()) throw new RelayError(400, "A required signature is missing or invalid");

  const simulation = await conn.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new RelayError(422, "The transaction failed in simulation", {
      err: simulation.value.err,
      logs: simulation.value.logs ?? [],
      unitsConsumed: simulation.value.unitsConsumed,
    });
  }
  const signature = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  const confirmation = await conn.confirmTransaction(
    { signature, blockhash: tx.recentBlockhash!, lastValidBlockHeight: tx.lastValidBlockHeight ?? (await conn.getBlockHeight()) + 150 },
    "confirmed",
  );
  if (confirmation.value.err) throw new RelayError(422, "The transaction failed on chain", { err: confirmation.value.err, signature });
  return { signature, unitsConsumed: simulation.value.unitsConsumed };
}
