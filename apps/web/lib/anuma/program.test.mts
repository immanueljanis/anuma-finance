import assert from "node:assert/strict";
import { test } from "node:test";
import { Keypair } from "@solana/web3.js";
import {
  ACCOUNT_SIZE,
  creditPda,
  decodeConfig,
  decodeCredit,
  decodePerson,
  discriminator,
  latestRoot,
  openCreditIx,
} from "./program.ts";

const filled = (n: number, byte: number) => new Uint8Array(n).fill(byte);

function account(name: string, ...fields: Uint8Array[]): Buffer {
  return Buffer.concat([Buffer.from(discriminator("account", name)), ...fields.map((f) => Buffer.from(f))]);
}

function le(bytes: number, value: bigint): Uint8Array {
  const out = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) out[i] = Number((value >> BigInt(8 * i)) & 0xffn);
  return out;
}

test("open_credit data is discriminator plus 320 argument bytes, and the credit PDA uses the nullifier", () => {
  const payer = Keypair.generate().publicKey;
  const pseudonym = Keypair.generate().publicKey;
  const nullifier = filled(32, 7);
  const ix = openCreditIx({
    payer,
    pseudonym,
    proofA: filled(64, 1),
    proofB: filled(128, 2),
    proofC: filled(64, 3),
    root: filled(32, 4),
    nullifier,
  });
  assert.equal(ix.data.length, 8 + 64 + 128 + 64 + 32 + 32);
  assert.deepEqual(Uint8Array.from(ix.data.subarray(0, 8)), discriminator("global", "open_credit"));
  assert.equal(ix.keys[3].pubkey.toBase58(), creditPda(nullifier).toBase58());
  assert.deepEqual(
    ix.keys.map((k) => [k.isSigner, k.isWritable]),
    [[true, true], [true, false], [false, false], [false, true], [false, false]],
  );
});

test("Config decodes field by field and latestRoot follows the ring buffer", () => {
  const roots = Array.from({ length: 8 }, (_, i) => (i === 2 ? filled(32, 9) : filled(32, 0)));
  const data = account(
    "Config",
    filled(32, 1),
    filled(32, 2),
    filled(32, 3),
    filled(32, 4),
    ...roots,
    Uint8Array.of(3),
    le(4, 5n),
    le(8, 25_000_000n),
    le(8, 100_000_000n),
    le(8, 120n),
    le(8, 30n),
    Uint8Array.of(254),
  );
  assert.equal(data.length, ACCOUNT_SIZE.Config);
  const config = decodeConfig(data);
  assert.equal(config.size, ACCOUNT_SIZE.Config);
  assert.equal(config.rootIdx, 3);
  assert.equal(config.memberCount, 5);
  assert.equal(config.startLimit, 25_000_000n);
  assert.equal(config.maxUnsecuredLimit, 100_000_000n);
  assert.equal(config.loanTermSecs, 120n);
  assert.equal(config.graceSecs, 30n);
  assert.equal(config.bump, 254);
  assert.deepEqual(latestRoot(config), filled(32, 9));
});

test("Person and Credit decode with the program's field order", () => {
  const person = decodePerson(account("Person", filled(32, 1), filled(32, 2), le(4, 11n), Uint8Array.of(250)));
  assert.equal(person.size, ACCOUNT_SIZE.Person);
  assert.equal(person.index, 11);
  assert.deepEqual(person.commitment, filled(32, 2));

  const credit = decodeCredit(
    account("Credit", filled(32, 1), filled(32, 2), le(8, 37_500_000n), le(8, 0n), le(8, 1_700_000_000n), le(2, 1n), Uint8Array.of(1), Uint8Array.of(253)),
  );
  assert.equal(credit.size, ACCOUNT_SIZE.Credit);
  assert.equal(credit.limit, 37_500_000n);
  assert.equal(credit.dueTs, 1_700_000_000n);
  assert.equal(credit.repaidCount, 1);
  assert.equal(credit.defaulted, true);
});

test("decoders reject an account of another type", () => {
  assert.throws(() => decodeCredit(account("Person", filled(69, 0))), /not a Credit/);
});
