import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Identity } from "@semaphore-protocol/identity";
import { identityFromSignature, nullifierOf, pseudonymOf } from "./identity.ts";

test("nullifierOf equals the nullifier inside a Rust-verified proof", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/spike-proof.json", import.meta.url), "utf8")) as { nullifier: string };
  assert.equal(nullifierOf(new Identity("anuma-spike-member-2")).toString(), fixture.nullifier);
});

test("the same signature always derives the same identity", () => {
  const signature = new Uint8Array(64).fill(7);
  assert.equal(identityFromSignature(signature).commitment, identityFromSignature(signature.slice()).commitment);
  assert.throws(() => identityFromSignature(new Uint8Array(32)), RangeError);
});

test("pseudonyms are deterministic per index and differ across indexes and identities", () => {
  const alice = new Identity("alice");
  const bob = new Identity("bob");
  assert.equal(pseudonymOf(alice, 0).publicKey.toBase58(), pseudonymOf(alice, 0).publicKey.toBase58());
  assert.notEqual(pseudonymOf(alice, 0).publicKey.toBase58(), pseudonymOf(alice, 1).publicKey.toBase58());
  assert.notEqual(pseudonymOf(alice, 0).publicKey.toBase58(), pseudonymOf(bob, 0).publicKey.toBase58());
  assert.throws(() => pseudonymOf(alice, -1), RangeError);
});
