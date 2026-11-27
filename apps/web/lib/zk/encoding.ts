import { keccak_256 } from "@noble/hashes/sha3.js";

/** BN254 base field modulus p. G1 and G2 point coordinates live in this field. */
export const BN254_P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

/** BN254 scalar field modulus r. Every public input must be below it. */
export const BN254_R = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Semaphore Merkle tree depth. The on-chain verifying key is for this depth only. */
export const MERKLE_DEPTH = 16;

/** Semaphore scope of every Anuma credit line. Must match `SCOPE_BYTES` in programs/anuma. */
export const SCOPE_BYTES: Uint8Array = rightPad32("anuma-credit-v1");

/** ASCII text right-padded with zero bytes to 32 bytes. */
export function rightPad32(text: string): Uint8Array {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(text));
  return out;
}

/** A non-negative integer as 32 bytes big-endian. */
export function be32(value: bigint | string | number): Uint8Array {
  let v = BigInt(value);
  if (v < 0n || v >= 1n << 256n) throw new RangeError(`value does not fit in 32 bytes: ${value}`);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** 32 bytes big-endian as an integer. */
export function fromBe32(bytes: Uint8Array): bigint {
  return bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
}

/**
 * Semaphore v4 `hash()`: keccak256 of the 32 input bytes, shifted right by 8 bits. The program
 * computes the same value from the pseudonym key, so the proof binds to that key.
 */
export function hashToField(bytes32: Uint8Array): bigint {
  if (bytes32.length !== 32) throw new RangeError(`expected 32 bytes, got ${bytes32.length}`);
  return fromBe32(keccak_256(bytes32)) >> 8n;
}

type G1 = readonly string[];
type G2 = readonly (readonly string[])[];

/** Raw snarkjs Groth16 proof, as returned by `unpackGroth16Proof`. */
export type SnarkjsProof = { pi_a: G1; pi_b: G2; pi_c: G1 };

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** snarkjs G1 [x, y] as x || y. */
export function g1([x, y]: G1): Uint8Array {
  return concat(be32(x), be32(y));
}

/**
 * snarkjs G1 [x, y] negated, as x || (p - y). groth16-solana checks
 * e(A, B) * e(prep, gamma) * e(C, delta) * e(alpha, beta) == 1, so proof A must arrive negated.
 */
export function g1Neg([x, y]: G1): Uint8Array {
  return concat(be32(x), be32((BN254_P - BigInt(y)) % BN254_P));
}

/** snarkjs G2 [[x0, x1], [y0, y1]] in EIP-197 limb order, x1 || x0 || y1 || y0. */
export function g2([[x0, x1], [y0, y1]]: G2): Uint8Array {
  return concat(be32(x1), be32(x0), be32(y1), be32(y0));
}

/** The instruction arguments of `open_credit`, in groth16-solana 0.2 byte layout. */
export type CreditProofArgs = {
  proofA: Uint8Array;
  proofB: Uint8Array;
  proofC: Uint8Array;
  root: Uint8Array;
  nullifier: Uint8Array;
};

/** Converts a raw snarkjs proof and its Semaphore root and nullifier to `open_credit` arguments. */
export function toCreditProofArgs(proof: SnarkjsProof, root: bigint | string, nullifier: bigint | string): CreditProofArgs {
  return {
    proofA: g1Neg(proof.pi_a),
    proofB: g2(proof.pi_b),
    proofC: g1(proof.pi_c),
    root: be32(root),
    nullifier: be32(nullifier),
  };
}
