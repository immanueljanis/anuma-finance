import { sha256 } from "@noble/hashes/sha2.js";
import { Identity } from "@semaphore-protocol/identity";
import { Keypair } from "@solana/web3.js";
import { poseidon2 } from "poseidon-lite";
import { SCOPE_BYTES, be32, hashToField } from "./encoding.ts";

/**
 * The fixed message a wallet signs to derive its Anuma identity. Ed25519 signatures are
 * deterministic, so the same wallet always derives the same identity on any device, and the
 * identity secret never leaves the browser.
 */
export const IDENTITY_MESSAGE = new TextEncoder().encode(
  "Anuma Finance identity v1\n\nSign to derive your private credit identity. This does not send a transaction.",
);

/** Builds the Semaphore identity from the wallet signature over `IDENTITY_MESSAGE`. */
export function identityFromSignature(signature: Uint8Array): Identity {
  if (signature.length !== 64) throw new RangeError(`expected a 64-byte Ed25519 signature, got ${signature.length}`);
  return new Identity(signature);
}

/**
 * The Semaphore v4 nullifier of this identity for the Anuma scope: Poseidon(hash(scope), secret).
 * The program seeds the Credit PDA with it, so the browser can find its own line from the identity
 * alone, while nobody without the secret can link the line to the person.
 */
export function nullifierOf(identity: Identity): bigint {
  return poseidon2([hashToField(SCOPE_BYTES), identity.secretScalar]);
}

/**
 * Pseudonym wallet number `index`, derived from the identity secret. Every pseudonym is recoverable
 * from the wallet signature alone, and two pseudonyms of one identity share nothing visible on chain.
 */
export function pseudonymOf(identity: Identity, index: number): Keypair {
  if (!Number.isInteger(index) || index < 0) throw new RangeError(`invalid pseudonym index ${index}`);
  const counter = new Uint8Array(4);
  new DataView(counter.buffer).setUint32(0, index);
  const domain = new TextEncoder().encode("anuma-pseudonym-v1");
  const seed = sha256(new Uint8Array([...domain, ...be32(identity.secretScalar), ...counter]));
  return Keypair.fromSeed(seed);
}
