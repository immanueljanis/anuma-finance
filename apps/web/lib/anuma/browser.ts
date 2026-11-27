import { PublicKey, Transaction, type Connection, type Signer } from "@solana/web3.js";

/** Public RPC for the browser. A keyed provider URL never goes here (see server.ts). */
export const PUBLIC_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

export type ClusterName = "devnet" | "localnet" | "mainnet" | "custom";

export const CLUSTER: ClusterName = PUBLIC_RPC.includes("devnet")
  ? "devnet"
  : /127\.0\.0\.1|localhost/.test(PUBLIC_RPC)
    ? "localnet"
    : PUBLIC_RPC.includes("mainnet")
      ? "mainnet"
      : "custom";

function explorerSuffix(): string {
  if (CLUSTER === "devnet") return "?cluster=devnet";
  if (CLUSTER === "localnet") return `?cluster=custom&customUrl=${encodeURIComponent("http://localhost:8899")}`;
  return "";
}

export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}${explorerSuffix()}`;
export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}${explorerSuffix()}`;

/** Protocol state from GET /api/group. Amounts are base-unit strings. */
export type GroupInfo = {
  programId: string;
  relayer: string;
  usdcMint: string;
  vault: string;
  startLimit: string;
  maxUnsecuredLimit: string;
  loanTermSecs: string;
  graceSecs: string;
  memberCount: number;
  latestRoot: string | null;
  commitments: string[];
};

/** An API failure with the server's message and optional simulation logs. */
export class ApiError extends Error {
  readonly status: number;
  readonly logs: string[];
  constructor(status: number, message: string, logs: string[] = []) {
    super(message);
    this.status = status;
    this.logs = logs;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string; logs?: string[] } & T;
  if (!response.ok) throw new ApiError(response.status, body.error ?? `Request failed (${response.status})`, body.logs ?? []);
  return body;
}

export async function getJson<T>(url: string): Promise<T> {
  return readJson<T>(await fetch(url, { cache: "no-store" }));
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  return readJson<T>(
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }),
  );
}

export const fetchGroup = () => getJson<GroupInfo>("/api/group");

/**
 * Sends a transaction through POST /api/relay: the relayer is the fee payer, `signers` (for
 * example the pseudonym key) sign first, and the server adds its signature after its checks.
 */
export async function relay(conn: Connection, relayer: string, tx: Transaction, signers: Signer[]) {
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.feePayer = new PublicKey(relayer);
  tx.recentBlockhash = blockhash;
  if (signers.length) tx.partialSign(...signers);
  const wire = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
  return postJson<{ signature: string; unitsConsumed?: number }>("/api/relay", { tx: wire });
}

/**
 * Relays a transaction that a browser wallet must sign (a lender deposit): the wallet signs as a
 * non-fee-payer, then the relayer pays the fee. The wallet needs mock USDC but no SOL.
 */
export async function relayWithWallet(
  conn: Connection,
  relayer: string,
  tx: Transaction,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
) {
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.feePayer = new PublicKey(relayer);
  tx.recentBlockhash = blockhash;
  const signed = await signTransaction(tx);
  const wire = signed.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
  return postJson<{ signature: string }>("/api/relay", { tx: wire });
}

/** Program error names from the Anchor logs, mapped to sentences a user can act on. */
const EXPLAINED: [RegExp, string][] = [
  [/InvalidProof/, "The zero-knowledge proof did not verify for this wallet. Generate it again."],
  [/UnknownRoot/, "The member list changed while you were proving. Try again; the new root is already posted."],
  [/OverLimit/, "This amount is above your credit limit."],
  [/DebtOutstanding/, "Repay the open loan before paying another invoice."],
  [/Defaulted/, "This credit line is in default. It cannot borrow again."],
  [/NotOverdue/, "This loan is not past its due time plus grace yet."],
  [/NoDebt/, "There is no open loan to repay."],
  [/OverRepay/, "The amount is more than the open debt."],
  [/insufficient funds/i, "The wallet does not hold enough mock USDC for this."],
];

export function explainError(error: unknown): string {
  const text = error instanceof ApiError ? `${error.message} ${error.logs.join(" ")}` : error instanceof Error ? error.message : String(error);
  if (/User rejected|rejected the request/i.test(text)) return "You declined the request in your wallet.";
  for (const [pattern, sentence] of EXPLAINED) if (pattern.test(text)) return sentence;
  return error instanceof Error ? error.message : text;
}

/** True when a relay failure means the Credit PDA for this nullifier already exists. */
export function isExistingLine(error: unknown): boolean {
  const text = error instanceof ApiError ? `${error.message} ${error.logs.join(" ")}` : String(error);
  return /already in use|invalid instruction data/.test(text);
}
