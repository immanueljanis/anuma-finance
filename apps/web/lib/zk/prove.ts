import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof, unpackGroth16Proof } from "@semaphore-protocol/proof";
import { MERKLE_DEPTH, SCOPE_BYTES, toCreditProofArgs, type CreditProofArgs } from "./encoding.ts";

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

/** A credit proof plus the measured proving time, for the UI. */
export type CreditProof = CreditProofArgs & { provingMs: number };

/**
 * Proves membership in the registered group for `pseudonym` without saying which member. The
 * commitments must be in on-chain registration order, so the root equals a root the admin posted.
 * Circuit files are served from `/zk` so the demo does not depend on a third-party CDN.
 */
export async function proveCredit(
  identity: Identity,
  commitments: bigint[],
  pseudonym: Uint8Array,
  artifacts?: { wasm: string; zkey: string },
): Promise<CreditProof> {
  if (pseudonym.length !== 32) throw new RangeError(`expected a 32-byte public key, got ${pseudonym.length}`);
  if (!commitments.includes(identity.commitment)) throw new Error("This identity is not registered yet");

  const origin = globalThis.location?.origin ?? "";
  const started = performance.now();
  const proof = await generateProof(
    identity,
    new Group(commitments),
    pseudonym,
    SCOPE_BYTES,
    MERKLE_DEPTH,
    artifacts ?? { wasm: `${origin}/zk/semaphore-16.wasm`, zkey: `${origin}/zk/semaphore-16.zkey` },
  );
  const provingMs = Math.round(performance.now() - started);

  return { ...toCreditProofArgs(unpackGroth16Proof(proof.points), proof.merkleTreeRoot, proof.nullifier), provingMs };
}
