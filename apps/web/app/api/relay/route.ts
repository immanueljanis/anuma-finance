import { Transaction } from "@solana/web3.js";
import { RelayError, relayTransaction, rpc } from "@/lib/anuma/server";
import { fail, jsonBody, messageOf } from "@/lib/anuma/http";

/**
 * Fee relayer. Pseudonym keys hold no SOL, so the relayer pays every fee and the rent of new credit
 * lines. Every user shares this one fee payer, so fee funding links no pseudonym to a wallet.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  if (typeof body?.tx !== "string") return fail(400, "A base64 transaction is required");

  let tx: Transaction;
  try {
    tx = Transaction.from(Buffer.from(body.tx, "base64"));
  } catch {
    return fail(400, "The transaction cannot be decoded");
  }

  try {
    return Response.json(await relayTransaction(rpc(), tx));
  } catch (error) {
    if (error instanceof RelayError) return fail(error.status, error.message, error.detail);
    return fail(502, messageOf(error));
  }
}
