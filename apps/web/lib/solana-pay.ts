import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, type Connection } from "@solana/web3.js";

/**
 * The subset of the Solana Pay transfer-request spec that Anuma needs: SPL-token requests with an
 * amount and references. `solana:<recipient>?amount=<decimal>&spl-token=<mint>&reference=<key>
 * &label=<text>&message=<text>&memo=<text>`. Amounts are decimal token units on the wire and base
 * units (bigint) in code.
 */
export type TransferRequest = {
  recipient: PublicKey;
  amount: bigint;
  splToken: PublicKey;
  references: PublicKey[];
  label?: string;
  message?: string;
  memo?: string;
};

/** Decimal token units ("18.5") to base units, rejecting more decimals than the mint has. */
export function parseUnits(text: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`"${text}" is not a plain decimal amount`);
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) throw new Error(`amount has more than ${decimals} decimal places`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

/** Base units to the shortest decimal string ("18500000", 6 -> "18.5"). */
export function formatUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const fraction = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${value / base}.${fraction}` : `${value / base}`;
}

export function encodeTransferRequest(request: TransferRequest, decimals: number): string {
  const params = new URLSearchParams();
  params.append("amount", formatUnits(request.amount, decimals));
  params.append("spl-token", request.splToken.toBase58());
  for (const reference of request.references) params.append("reference", reference.toBase58());
  if (request.label) params.append("label", request.label);
  if (request.message) params.append("message", request.message);
  if (request.memo) params.append("memo", request.memo);
  return `solana:${request.recipient.toBase58()}?${params.toString().replace(/\+/g, "%20")}`;
}

function publicKey(value: string, field: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${field} is not a valid Solana address`);
  }
}

/** Parses an SPL-token transfer request. Throws a message the UI can show as is. */
export function parseTransferRequest(text: string, decimals: number): TransferRequest {
  const input = text.trim();
  if (!input.startsWith("solana:")) throw new Error("A Solana Pay link starts with solana:");
  const [path, query = ""] = input.slice("solana:".length).split("?", 2);
  const params = new URLSearchParams(query);
  const amount = params.get("amount");
  const splToken = params.get("spl-token");
  if (!amount) throw new Error("This payment link has no amount");
  if (!splToken) throw new Error("This payment link is not for a token payment");
  return {
    recipient: publicKey(decodeURIComponent(path), "Recipient"),
    amount: parseUnits(amount, decimals),
    splToken: publicKey(splToken, "Token mint"),
    references: params.getAll("reference").map((r) => publicKey(r, "Reference")),
    label: params.get("label") ?? undefined,
    message: params.get("message") ?? undefined,
    memo: params.get("memo") ?? undefined,
  };
}

/** The oldest confirmed signature that includes `reference`, or null when none exists yet. */
export async function findReference(conn: Connection, reference: PublicKey): Promise<string | null> {
  const signatures = await conn.getSignaturesForAddress(reference, { limit: 1000 }, "confirmed");
  const found = signatures.filter((s) => !s.err).at(-1);
  return found?.signature ?? null;
}

/**
 * Checks that transaction `signature` raised the recipient's token account for `splToken` by
 * exactly `amount`. Uses token balance deltas, so it accepts a transfer made inside a program (the
 * Anuma vault pays through a CPI), as the Solana Pay spec allows.
 */
export async function validateTransfer(
  conn: Connection,
  signature: string,
  expected: { recipient: PublicKey; splToken: PublicKey; amount: bigint },
): Promise<void> {
  const tx = await conn.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta) throw new Error("Transaction not found");
  if (tx.meta.err) throw new Error("Transaction failed");
  const ata = getAssociatedTokenAddressSync(expected.splToken, expected.recipient, true);
  const keys = tx.transaction.message.getAccountKeys().staticAccountKeys;
  const index = keys.findIndex((k) => k.equals(ata));
  if (index < 0) throw new Error("Recipient token account is not in the transaction");
  const balance = (list: typeof tx.meta.postTokenBalances) =>
    BigInt(list?.find((b) => b.accountIndex === index && b.mint === expected.splToken.toBase58())?.uiTokenAmount.amount ?? "0");
  const received = balance(tx.meta.postTokenBalances) - balance(tx.meta.preTokenBalances);
  if (received !== expected.amount) throw new Error(`Recipient received ${received}, expected ${expected.amount}`);
}
