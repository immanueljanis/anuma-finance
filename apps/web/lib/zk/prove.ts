import { Group } from "@semaphore-protocol/group";
import type { Identity } from "@semaphore-protocol/identity";
import { generateProof, unpackGroth16Proof } from "@semaphore-protocol/proof";
import { MERKLE_DEPTH, SCOPE_BYTES, toCreditProofArgs, type CreditProofArgs } from "./encoding.ts";

/** A credit proof plus the measured proving time, for the UI. */
export type CreditProof = CreditProofArgs & { provingMs: number };

/**
 * Proves membership in the registered group for `pseudonym` without saying which member. The
 * commitments must be in on-chain registration order, so the root equals a root the admin posted.
 * Circuit files are served from `/zk` so the demo does not depend on a third-party CDN. This module
 * loads snarkjs, so the UI imports it lazily when the user starts proving.
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
