import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Identity } from "@semaphore-protocol/identity";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { fromBe32 } from "../zk/encoding.ts";
import { borrowIx, markDefaultIx, openCreditIx, repayIx } from "./program.ts";
import { checkRelayable, groupRoot, normalizeNik, personIdFor } from "./server.ts";

const server = Keypair.generate().publicKey;
const pseudonym = Keypair.generate().publicKey;
const credit = Keypair.generate().publicKey;
const bytes = (n: number) => new Uint8Array(n).fill(1);

function txOf(...ixs: Transaction["instructions"]) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = server;
  return tx;
}

const openCredit = (payer: PublicKey) =>
  openCreditIx({ payer, pseudonym, proofA: bytes(64), proofB: bytes(128), proofC: bytes(64), root: bytes(32), nullifier: bytes(32) });

test("relayer accepts open_credit paid by the relayer, with a compute budget", () => {
  const tx = txOf(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), openCredit(server));
  assert.equal(checkRelayable(tx, server), null);
});

test("relayer accepts borrow, repay and mark_default that do not involve its key", () => {
  const token = Keypair.generate().publicKey;
  assert.equal(checkRelayable(txOf(borrowIx({ pseudonym, credit, merchantToken: token, amount: 1n })), server), null);
  assert.equal(checkRelayable(txOf(repayIx({ payer: pseudonym, credit, payerToken: token, amount: 1n })), server), null);
  assert.equal(checkRelayable(txOf(markDefaultIx({ credit })), server), null);
});

test("relayer rejects a repay that would spend the relayer's own tokens", () => {
  const tx = txOf(repayIx({ payer: server, credit, payerToken: Keypair.generate().publicKey, amount: 1n }));
  assert.match(checkRelayable(tx, server) ?? "", /relayer key/);
});

test("relayer rejects other programs, a foreign fee payer and non-relayable instructions", () => {
  const transfer = SystemProgram.transfer({ fromPubkey: server, toPubkey: pseudonym, lamports: 1 });
  assert.match(checkRelayable(txOf(transfer), server) ?? "", /not allowed/);

  const foreign = txOf(openCredit(server));
  foreign.feePayer = pseudonym;
  assert.match(checkRelayable(foreign, server) ?? "", /fee payer/);
});

test("server root equals the root of the Rust-verified spike proof", () => {
  const fixture = JSON.parse(readFileSync(new URL("../zk/fixtures/spike-proof.json", import.meta.url), "utf8")) as { root: string };
  const commitments = [1, 2, 3].map((i) => new Identity(`anuma-spike-member-${i}`).commitment);
  assert.equal(fromBe32(groupRoot(commitments)).toString(), fixture.root);
});

test("NIK must be 16 digits and maps to a stable 32-byte person id", () => {
  process.env.ANUMA_ISSUER_SECRET = "test-secret-test-secret-test-secret-00";
  assert.equal(normalizeNik("3174 0123 4567 0001"), "3174012345670001");
  assert.equal(normalizeNik("12345"), null);
  const a = personIdFor("3174012345670001");
  assert.equal(a.length, 32);
  assert.deepEqual(personIdFor("3174012345670001"), a);
  assert.notDeepEqual(personIdFor("3174012345670002"), a);
});
