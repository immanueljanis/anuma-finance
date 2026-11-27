import { sha256 } from "@noble/hashes/sha2.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, TransactionInstruction, type AccountMeta } from "@solana/web3.js";

/**
 * Hand-written client for the `anuma` Anchor program. Every instruction argument has a fixed size,
 * so Borsh encoding is plain concatenation and needs no IDL runtime. `program.test.mts` checks the
 * discriminators and account sizes against the IDL that `anchor build` writes.
 */

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_ANUMA_PROGRAM_ID ?? "9k1zFVABWqqDQRJbfwQpucxWdbN7gJnTCbFFv5RL3nKd");

export const ROOT_HISTORY = 8;

const utf8 = (s: string) => new TextEncoder().encode(s);

/** Anchor discriminator: the first 8 bytes of sha256("<namespace>:<name>"). */
export function discriminator(namespace: "global" | "account" | "event", name: string): Uint8Array {
  return sha256(utf8(`${namespace}:${name}`)).slice(0, 8);
}

function concat(...parts: Uint8Array[]): Buffer {
  return Buffer.concat(parts.map((p) => Buffer.from(p)));
}

function u64(value: bigint | number): Uint8Array {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

function i64(value: bigint | number): Uint8Array {
  const out = Buffer.alloc(8);
  out.writeBigInt64LE(BigInt(value));
  return out;
}

function fixed(bytes: Uint8Array, length: number, name: string): Uint8Array {
  if (bytes.length !== length) throw new RangeError(`${name}: expected ${length} bytes, got ${bytes.length}`);
  return bytes;
}

const w = (pubkey: PublicKey, isSigner = false): AccountMeta => ({ pubkey, isSigner, isWritable: true });
const r = (pubkey: PublicKey, isSigner = false): AccountMeta => ({ pubkey, isSigner, isWritable: false });

function ix(name: string, keys: AccountMeta[], ...args: Uint8Array[]): TransactionInstruction {
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data: concat(discriminator("global", name), ...args) });
}

export const configPda = () => PublicKey.findProgramAddressSync([utf8("config")], PROGRAM_ID)[0];
export const vaultPda = () => PublicKey.findProgramAddressSync([utf8("vault")], PROGRAM_ID)[0];
export const personPda = (personId: Uint8Array) =>
  PublicKey.findProgramAddressSync([utf8("person"), fixed(personId, 32, "personId")], PROGRAM_ID)[0];
export const creditPda = (nullifier: Uint8Array) =>
  PublicKey.findProgramAddressSync([utf8("credit"), fixed(nullifier, 32, "nullifier")], PROGRAM_ID)[0];

export type InitializeParams = {
  admin: PublicKey;
  usdcMint: PublicKey;
  issuer: PublicKey;
  startLimit: bigint;
  maxUnsecuredLimit: bigint;
  loanTermSecs: bigint;
  graceSecs: bigint;
};

export function initializeIx(p: InitializeParams): TransactionInstruction {
  return ix(
    "initialize",
    [w(p.admin, true), w(configPda()), r(p.usdcMint), w(vaultPda()), r(TOKEN_PROGRAM_ID), r(SystemProgram.programId)],
    p.issuer.toBytes(),
    u64(p.startLimit),
    u64(p.maxUnsecuredLimit),
    i64(p.loanTermSecs),
    i64(p.graceSecs),
  );
}

export function registerIx(p: { issuer: PublicKey; kycWallet: PublicKey; personId: Uint8Array; commitment: Uint8Array }) {
  return ix(
    "register",
    [w(p.issuer, true), r(p.kycWallet, true), w(configPda()), w(personPda(p.personId)), r(SystemProgram.programId)],
    fixed(p.personId, 32, "personId"),
    fixed(p.commitment, 32, "commitment"),
  );
}

export function setRootIx(p: { admin: PublicKey; root: Uint8Array }) {
  return ix("set_root", [r(p.admin, true), w(configPda())], fixed(p.root, 32, "root"));
}

export type OpenCreditParams = {
  payer: PublicKey;
  pseudonym: PublicKey;
  proofA: Uint8Array;
  proofB: Uint8Array;
  proofC: Uint8Array;
  root: Uint8Array;
  nullifier: Uint8Array;
};

export function openCreditIx(p: OpenCreditParams) {
  return ix(
    "open_credit",
    [w(p.payer, true), r(p.pseudonym, true), r(configPda()), w(creditPda(p.nullifier)), r(SystemProgram.programId)],
    fixed(p.proofA, 64, "proofA"),
    fixed(p.proofB, 128, "proofB"),
    fixed(p.proofC, 64, "proofC"),
    fixed(p.root, 32, "root"),
    fixed(p.nullifier, 32, "nullifier"),
  );
}

export function depositIx(p: { lender: PublicKey; lenderToken: PublicKey; amount: bigint }) {
  return ix(
    "deposit",
    [r(p.lender, true), r(configPda()), w(vaultPda()), w(p.lenderToken), r(TOKEN_PROGRAM_ID)],
    u64(p.amount),
  );
}

/**
 * Pays a merchant token account from the vault. `references` are Solana Pay reference keys, added
 * as read-only remaining accounts that the program ignores; the merchant finds the payment by them.
 */
export function borrowIx(p: { pseudonym: PublicKey; credit: PublicKey; merchantToken: PublicKey; amount: bigint; references?: PublicKey[] }) {
  return ix(
    "borrow",
    [
      r(p.pseudonym, true),
      r(configPda()),
      w(p.credit),
      w(vaultPda()),
      w(p.merchantToken),
      r(TOKEN_PROGRAM_ID),
      ...(p.references ?? []).map((reference) => r(reference)),
    ],
    u64(p.amount),
  );
}

export function repayIx(p: { payer: PublicKey; credit: PublicKey; payerToken: PublicKey; amount: bigint }) {
  return ix(
    "repay",
    [r(p.payer, true), r(configPda()), w(p.credit), w(vaultPda()), w(p.payerToken), r(TOKEN_PROGRAM_ID)],
    u64(p.amount),
  );
}

export function markDefaultIx(p: { credit: PublicKey }) {
  return ix("mark_default", [r(configPda()), w(p.credit)]);
}

/** Byte reader over an account body after its 8-byte discriminator. */
class Reader {
  private offset = 8;
  private readonly data: Buffer;
  constructor(data: Buffer) {
    this.data = data;
  }
  bytes(n: number) {
    const out = Uint8Array.from(this.data.subarray(this.offset, this.offset + n));
    this.offset += n;
    return out;
  }
  pubkey() {
    return new PublicKey(this.bytes(32));
  }
  u8() {
    return this.data.readUInt8((this.offset += 1) - 1);
  }
  u16() {
    return this.data.readUInt16LE((this.offset += 2) - 2);
  }
  u32() {
    return this.data.readUInt32LE((this.offset += 4) - 4);
  }
  u64() {
    return this.data.readBigUInt64LE((this.offset += 8) - 8);
  }
  i64() {
    return this.data.readBigInt64LE((this.offset += 8) - 8);
  }
  end() {
    return this.offset;
  }
}

function expectAccount(data: Buffer, name: string) {
  if (!data.subarray(0, 8).equals(Buffer.from(discriminator("account", name)))) {
    throw new Error(`account is not a ${name}`);
  }
}

export type ConfigAccount = ReturnType<typeof decodeConfig>;

export function decodeConfig(data: Buffer) {
  expectAccount(data, "Config");
  const rd = new Reader(data);
  return {
    admin: rd.pubkey(),
    issuer: rd.pubkey(),
    usdcMint: rd.pubkey(),
    vault: rd.pubkey(),
    roots: Array.from({ length: ROOT_HISTORY }, () => rd.bytes(32)),
    rootIdx: rd.u8(),
    memberCount: rd.u32(),
    startLimit: rd.u64(),
    maxUnsecuredLimit: rd.u64(),
    loanTermSecs: rd.i64(),
    graceSecs: rd.i64(),
    bump: rd.u8(),
    size: rd.end(),
  };
}

/** The most recently posted root, or null before the first `set_root`. */
export function latestRoot(config: ConfigAccount): Uint8Array | null {
  const root = config.roots[(config.rootIdx + ROOT_HISTORY - 1) % ROOT_HISTORY];
  return root.some((b) => b !== 0) ? root : null;
}

export type PersonAccount = ReturnType<typeof decodePerson>;

export function decodePerson(data: Buffer) {
  expectAccount(data, "Person");
  const rd = new Reader(data);
  return { kycWallet: rd.pubkey(), commitment: rd.bytes(32), index: rd.u32(), bump: rd.u8(), size: rd.end() };
}

export type CreditAccount = ReturnType<typeof decodeCredit>;

export function decodeCredit(data: Buffer) {
  expectAccount(data, "Credit");
  const rd = new Reader(data);
  return {
    pseudonym: rd.pubkey(),
    nullifier: rd.bytes(32),
    limit: rd.u64(),
    debt: rd.u64(),
    dueTs: rd.i64(),
    repaidCount: rd.u16(),
    defaulted: rd.u8() === 1,
    bump: rd.u8(),
    size: rd.end(),
  };
}

/** Account sizes including the discriminator, as `8 + INIT_SPACE` in the program. */
export const ACCOUNT_SIZE = { Config: 430, Person: 77, Credit: 100 } as const;
