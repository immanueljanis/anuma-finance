import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Keypair, type TransactionInstruction } from "@solana/web3.js";
import * as program from "./program.ts";

/**
 * idl.json is copied from `anchor build`. These tests fail when the hand-written client drifts from
 * the program: a renamed instruction, a reordered account, or a changed signer or writable flag.
 */
type IdlAccount = { name: string; writable?: boolean; signer?: boolean };
type Idl = {
  address: string;
  instructions: { name: string; discriminator: number[]; accounts: IdlAccount[] }[];
  accounts: { name: string; discriminator: number[] }[];
};
const idl = JSON.parse(readFileSync(new URL("./idl.json", import.meta.url), "utf8")) as Idl;

const key = () => Keypair.generate().publicKey;
const zeros = (n: number) => new Uint8Array(n);

const built: Record<string, TransactionInstruction> = {
  initialize: program.initializeIx({ admin: key(), usdcMint: key(), issuer: key(), startLimit: 1n, maxUnsecuredLimit: 2n, loanTermSecs: 3n, graceSecs: 4n }),
  register: program.registerIx({ issuer: key(), kycWallet: key(), personId: zeros(32), commitment: zeros(32) }),
  set_root: program.setRootIx({ admin: key(), root: zeros(32) }),
  open_credit: program.openCreditIx({ payer: key(), pseudonym: key(), proofA: zeros(64), proofB: zeros(128), proofC: zeros(64), root: zeros(32), nullifier: zeros(32) }),
  deposit: program.depositIx({ lender: key(), lenderToken: key(), amount: 1n }),
  borrow: program.borrowIx({ pseudonym: key(), credit: key(), merchantToken: key(), amount: 1n }),
  repay: program.repayIx({ payer: key(), credit: key(), payerToken: key(), amount: 1n }),
  mark_default: program.markDefaultIx({ credit: key() }),
};

test("the IDL belongs to the program ID the client uses", () => {
  assert.equal(idl.address, program.PROGRAM_ID.toBase58());
});

test("the client builds every IDL instruction and nothing else", () => {
  assert.deepEqual(Object.keys(built).sort(), idl.instructions.map((i) => i.name).sort());
});

for (const ix of idl.instructions) {
  test(`${ix.name}: discriminator, account order and flags match the IDL`, () => {
    const mine = built[ix.name];
    assert.deepEqual([...mine.data.subarray(0, 8)], ix.discriminator);
    assert.deepEqual(
      mine.keys.map((k) => [k.isSigner, k.isWritable]),
      ix.accounts.map((a) => [Boolean(a.signer), Boolean(a.writable)]),
      `account flags of ${ix.name} in IDL order: ${ix.accounts.map((a) => a.name).join(", ")}`,
    );
  });
}

test("account discriminators match the IDL", () => {
  for (const account of idl.accounts) {
    assert.deepEqual([...program.discriminator("account", account.name)], account.discriminator, account.name);
  }
});
