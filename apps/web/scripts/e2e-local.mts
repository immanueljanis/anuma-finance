import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { Identity } from "@semaphore-protocol/identity";
import { createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  type PublicKey,
  type Signer,
} from "@solana/web3.js";
import * as program from "../lib/anuma/program.ts";
import { encodeTransferRequest, findReference, parseTransferRequest, validateTransfer } from "../lib/solana-pay.ts";
import { be32 } from "../lib/zk/encoding.ts";
import { nullifierOf } from "../lib/zk/identity.ts";
import { proveCredit } from "../lib/zk/prove.ts";

/**
 * End-to-end acceptance run against a local validator that has the built program loaded at
 * PROGRAM_ID. It uses the same client, relayer and root-sync code as the web app, real Semaphore
 * proofs, and the real on-chain groth16 verifier.
 * Usage: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e-local.mts [rpc=http://127.0.0.1:8899]
 */
const RPC = process.argv[2] ?? "http://127.0.0.1:8899";
const admin = Keypair.generate();
process.env.SOLANA_RPC_URL = RPC;
process.env.ANUMA_SERVER_SECRET = JSON.stringify(Array.from(admin.secretKey));
process.env.ANUMA_ISSUER_SECRET = "e2e-issuer-secret-e2e-issuer-secret-0000";
const server = await import("../lib/anuma/server.ts");

const USDC = 1_000_000n;
const START = 25n * USDC;
const MAX = 100n * USDC;
const TERM = 4n;
const GRACE = 2n;
const artifacts = {
  wasm: fileURLToPath(new URL("../public/zk/semaphore-16.wasm", import.meta.url)),
  zkey: fileURLToPath(new URL("../public/zk/semaphore-16.zkey", import.meta.url)),
};

/**
 * Anchor 1.2 `init` on an address that already holds lamports calls the System Program
 * `CreateAccountAllowPrefund` instruction. Validators without that instruction reject it as invalid
 * instruction data; newer ones report the account as already in use. Both mean `init` refused an
 * existing account, so every duplicate check below also asserts that the existing account is unchanged.
 */
const ALREADY_EXISTS = /already in use|invalid instruction data/;

const conn = new Connection(RPC, "confirmed");
const results: string[] = [];
const ok = (label: string) => {
  results.push(label);
  console.log(`  PASS ${label}`);
};

function failureText(error: unknown): string {
  if (error instanceof server.RelayError) return `${error.message} ${JSON.stringify(error.detail)}`;
  const e = error as { message?: string; logs?: string[]; transactionLogs?: string[] };
  return `${e.message ?? String(error)} ${JSON.stringify(e.logs ?? e.transactionLogs ?? [])}`;
}

async function expectFailure(label: string, pattern: RegExp, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    assert.match(failureText(error), pattern, label);
    ok(`${label} (rejected: ${pattern.source})`);
    return;
  }
  assert.fail(`${label}: expected a failure matching ${pattern}`);
}

/** Sends through the same path as POST /api/relay: wire round trip, then relayTransaction. */
async function relay(tx: Transaction, signers: Signer[]) {
  const { blockhash } = await conn.getLatestBlockhash();
  tx.feePayer = admin.publicKey;
  tx.recentBlockhash = blockhash;
  if (signers.length) tx.partialSign(...signers);
  return server.relayTransaction(conn, Transaction.from(tx.serialize({ requireAllSignatures: false })));
}

type Member = { identity: Identity; wallet: Keypair; idNumber: string };

async function openCredit(member: Member, pseudonym: Keypair, proofFor: PublicKey = pseudonym.publicKey) {
  const commitments = await server.fetchCommitments(conn);
  const proof = await proveCredit(member.identity, commitments, proofFor.toBytes(), artifacts);
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    program.openCreditIx({ payer: admin.publicKey, pseudonym: pseudonym.publicKey, ...proof }),
  );
  const sent = await relay(tx, [pseudonym]);
  return { ...sent, nullifier: proof.nullifier, provingMs: proof.provingMs };
}

async function credit(nullifier: Uint8Array) {
  const info = await conn.getAccountInfo(program.creditPda(nullifier));
  assert.ok(info, "credit account exists");
  return program.decodeCredit(info.data);
}

console.log(`RPC ${RPC}, program ${program.PROGRAM_ID.toBase58()}`);
const programInfo = await conn.getAccountInfo(program.PROGRAM_ID);
assert.ok(programInfo?.executable, "program is loaded on the validator");

await conn.confirmTransaction(await conn.requestAirdrop(admin.publicKey, 100 * LAMPORTS_PER_SOL), "confirmed");
const mint = await createMint(conn, admin, admin.publicKey, null, 6);

await sendAndConfirmTransaction(
  conn,
  new Transaction().add(
    program.initializeIx({
      admin: admin.publicKey,
      usdcMint: mint,
      issuer: admin.publicKey,
      startLimit: START,
      maxUnsecuredLimit: MAX,
      loanTermSecs: TERM,
      graceSecs: GRACE,
    }),
  ),
  [admin],
);
const config = await server.fetchConfig(conn);
assert.equal(config?.startLimit, START);
ok("initialize creates config and vault");

const members: Member[] = [1, 2, 3].map((i) => ({
  identity: new Identity(`anuma-e2e-member-${i}`),
  wallet: Keypair.generate(),
  idNumber: `E2E00000${i}`,
}));

const registerTx = (m: Member) =>
  new Transaction().add(
    program.registerIx({
      issuer: admin.publicKey,
      kycWallet: m.wallet.publicKey,
      personId: server.personIdFor(m.idNumber),
      commitment: be32(m.identity.commitment),
    }),
  );

for (const m of members) await sendAndConfirmTransaction(conn, registerTx(m), [admin, m.wallet]);
const onChain = await server.fetchCommitments(conn);
assert.deepEqual(onChain, members.map((m) => m.identity.commitment));
ok("register stores 3 commitments in registration order");

const twin: Member = { identity: new Identity("anuma-e2e-twin"), wallet: Keypair.generate(), idNumber: members[0].idNumber };
await expectFailure("the same ID number cannot register twice", ALREADY_EXISTS, () =>
  sendAndConfirmTransaction(conn, registerTx(twin), [admin, twin.wallet]),
);
assert.deepEqual(await server.fetchCommitments(conn), members.map((m) => m.identity.commitment));
assert.equal((await server.fetchConfig(conn))?.memberCount, 3);
ok("the rejected twin registration changed no member and no count");

const firstSync = await server.syncRoot(conn);
assert.ok(firstSync.signature);
const secondSync = await server.syncRoot(conn);
assert.equal(secondSync.signature, null);
ok("syncRoot posts the root once and is idempotent");

const adminAta = await getOrCreateAssociatedTokenAccount(conn, admin, mint, admin.publicKey);
await mintTo(conn, admin, mint, adminAta.address, admin, 1_000n * USDC);
await sendAndConfirmTransaction(
  conn,
  new Transaction().add(program.depositIx({ lender: admin.publicKey, lenderToken: adminAta.address, amount: 500n * USDC })),
  [admin],
);
assert.equal((await getAccount(conn, program.vaultPda())).amount, 500n * USDC);
ok("deposit moves lender funds into the vault");

const lender = Keypair.generate();
const lenderAta = await getOrCreateAssociatedTokenAccount(conn, admin, mint, lender.publicKey);
await mintTo(conn, admin, mint, lenderAta.address, admin, 50n * USDC);
await relay(new Transaction().add(program.depositIx({ lender: lender.publicKey, lenderToken: lenderAta.address, amount: 50n * USDC })), [lender]);
assert.equal((await getAccount(conn, program.vaultPda())).amount, 550n * USDC);
assert.equal(await conn.getBalance(lender.publicKey), 0);
ok("a lender holding no SOL deposits through the relayer");

const alice = members[1];
const alicePseudonym = Keypair.generate();
const opened = await openCredit(alice, alicePseudonym);
const aliceLine = await credit(opened.nullifier);
assert.equal(aliceLine.limit, START);
assert.ok(aliceLine.pseudonym.equals(alicePseudonym.publicKey));
ok(`open_credit verifies a real proof (proving ${opened.provingMs} ms, ${opened.unitsConsumed} CU)`);
assert.deepEqual(be32(nullifierOf(alice.identity)), opened.nullifier);
ok("nullifierOf(identity) finds the line without a proof");
assert.ok((opened.unitsConsumed ?? Infinity) < 400_000, "open_credit fits in 400k CU");

await expectFailure("the same person cannot open a second line", ALREADY_EXISTS, () => openCredit(alice, Keypair.generate()));
assert.ok((await credit(opened.nullifier)).pseudonym.equals(alicePseudonym.publicKey));
ok("the rejected second line left the first line's pseudonym unchanged");

const carol = members[2];
await expectFailure("a proof made for another pseudonym is rejected", /InvalidProof/, () =>
  openCredit(carol, Keypair.generate(), Keypair.generate().publicKey),
);

const merchant = Keypair.generate();
const merchantAta = await getOrCreateAssociatedTokenAccount(conn, admin, mint, merchant.publicKey);
const borrow = (amount: bigint, references: PublicKey[] = []) =>
  relay(
    new Transaction().add(
      program.borrowIx({ pseudonym: alicePseudonym.publicKey, credit: program.creditPda(opened.nullifier), merchantToken: merchantAta.address, amount, references }),
    ),
    [alicePseudonym],
  );

await expectFailure("borrow above the limit", /OverLimit/, () => borrow(START + 1n));
const reference = Keypair.generate().publicKey;
const invoice = encodeTransferRequest(
  { recipient: merchant.publicKey, amount: 20n * USDC, splToken: mint, references: [reference], label: "Corner Store", message: "Side-event ticket" },
  6,
);
const request = parseTransferRequest(invoice, 6);
await borrow(request.amount, request.references);
assert.equal((await getAccount(conn, merchantAta.address)).amount, 20n * USDC);
assert.equal((await credit(opened.nullifier)).debt, 20n * USDC);
ok("borrow pays the merchant from the vault");
const paidSignature = await findReference(conn, reference);
assert.ok(paidSignature, "the payment is found by its Solana Pay reference");
await validateTransfer(conn, paidSignature, { recipient: request.recipient, splToken: request.splToken, amount: request.amount });
await expectFailure("validateTransfer rejects a wrong amount", /expected/, () =>
  validateTransfer(conn, paidSignature, { recipient: request.recipient, splToken: request.splToken, amount: request.amount + 1n }),
);
ok("a Solana Pay invoice is paid from the credit line and validated by reference");
await expectFailure("a second loan while one is open", /DebtOutstanding/, () => borrow(1n));

const aliceAta = await getOrCreateAssociatedTokenAccount(conn, admin, mint, alicePseudonym.publicKey);
await mintTo(conn, admin, mint, aliceAta.address, admin, 100n * USDC);
await relay(
  new Transaction().add(
    program.repayIx({ payer: alicePseudonym.publicKey, credit: program.creditPda(opened.nullifier), payerToken: aliceAta.address, amount: 20n * USDC }),
  ),
  [alicePseudonym],
);
const repaid = await credit(opened.nullifier);
assert.equal(repaid.debt, 0n);
assert.equal(repaid.limit, 37_500_000n);
assert.equal(repaid.repaidCount, 1);
ok("on-time repayment raises the limit from 25 to 37.5 USDC");

await borrow(repaid.limit);
const markDefault = () => relay(new Transaction().add(program.markDefaultIx({ credit: program.creditPda(opened.nullifier) })), []);
await expectFailure("mark_default before due plus grace", /NotOverdue/, markDefault);
await sleep(Number(TERM + GRACE) * 1000 + 2000);
for (let attempt = 0; ; attempt++) {
  try {
    await markDefault();
    break;
  } catch (error) {
    if (attempt >= 5 || !/NotOverdue/.test(failureText(error))) throw error;
    await sleep(2000);
  }
}
assert.equal((await credit(opened.nullifier)).defaulted, true);
ok("anyone can mark an overdue line as defaulted");
await expectFailure("a defaulted line cannot borrow", /Defaulted/, () => borrow(1n));
await expectFailure("a defaulted person cannot get a clean line with a new pseudonym", ALREADY_EXISTS, () =>
  openCredit(alice, Keypair.generate()),
);
const afterRetry = await credit(opened.nullifier);
assert.equal(afterRetry.defaulted, true);
assert.ok(afterRetry.pseudonym.equals(alicePseudonym.publicKey));
ok("the defaulted line stays defaulted and bound to the old pseudonym");

const carolOpened = await openCredit(carol, Keypair.generate());
assert.equal((await credit(carolOpened.nullifier)).limit, START);
ok("another verified person still opens a fresh line");

console.log(`\n${results.length} checks passed`);
process.exit(0);
