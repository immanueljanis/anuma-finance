import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SCOPE_BYTES, be32, hashToField, toCreditProofArgs, type SnarkjsProof } from "./encoding.ts";

/**
 * spike-proof.json is a real Semaphore v4 depth-16 proof whose byte encoding passed groth16-solana
 * 0.2 verification in Rust (valid proof accepted, flipped nullifier and wrong message rejected).
 * These tests pin the browser encoding to those verified bytes.
 */
const fixture = JSON.parse(readFileSync(new URL("./fixtures/spike-proof.json", import.meta.url), "utf8")) as {
  root: string;
  nullifier: string;
  message_bytes: string;
  scope_bytes: string;
  snarkjs_proof: SnarkjsProof;
  public_signals: [string, string, string, string];
  proof_a: string;
  proof_b: string;
  proof_c: string;
  public_inputs: [string, string, string, string];
};

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

test("proof bytes match the Rust-verified encoding", () => {
  const args = toCreditProofArgs(fixture.snarkjs_proof, fixture.root, fixture.nullifier);
  assert.equal(hex(args.proofA), fixture.proof_a);
  assert.equal(hex(args.proofB), fixture.proof_b);
  assert.equal(hex(args.proofC), fixture.proof_c);
  assert.equal(hex(args.root), fixture.public_inputs[0]);
  assert.equal(hex(args.nullifier), fixture.public_inputs[1]);
});

test("message and scope hashes match the Rust-verified public inputs", () => {
  const message = Uint8Array.from(Buffer.from(fixture.message_bytes, "hex"));
  assert.equal(hex(be32(hashToField(message))), fixture.public_inputs[2]);
  assert.equal(hex(SCOPE_BYTES), fixture.scope_bytes);
  assert.equal(hex(be32(hashToField(SCOPE_BYTES))), fixture.public_inputs[3]);
});

test("be32 rejects values wider than 32 bytes", () => {
  assert.throws(() => be32(1n << 256n), RangeError);
});
