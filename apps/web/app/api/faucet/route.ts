import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import { fetchConfig, rpc, serverKeypair } from "@/lib/anuma/server";
import { fail, jsonBody, messageOf, parsePubkey } from "@/lib/anuma/http";

/** Mock USDC per faucet request, in base units (6 decimals). */
const DRIP = 100_000_000n;

/** Minimum time between two drips to the same owner. */
const COOLDOWN_MS = 20_000;

const lastDrip = new Map<string, number>();

/**
 * Devnet faucet for the demo token. It creates the owner's token account when needed and mints 100
 * mock USDC. The server pays, so a fresh pseudonym key can receive funds to repay without SOL.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  const owner = parsePubkey(body?.owner);
  if (!owner) return fail(400, "A valid owner address is required");

  const key = owner.toBase58();
  const now = Date.now();
  if (now - (lastDrip.get(key) ?? 0) < COOLDOWN_MS) return fail(429, "Please wait a few seconds before the next drip");
  lastDrip.set(key, now);

  try {
    const conn = rpc();
    const config = await fetchConfig(conn);
    if (!config) return fail(503, "The Anuma program is not initialized on this cluster yet");
    const server = serverKeypair();
    const ata = getAssociatedTokenAddressSync(config.usdcMint, owner, true);
    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(server.publicKey, ata, owner, config.usdcMint),
      createMintToInstruction(config.usdcMint, ata, server.publicKey, DRIP),
    );
    const signature = await conn.sendTransaction(tx, [server]);
    await conn.confirmTransaction(signature, "confirmed");
    return Response.json({ signature, tokenAccount: ata.toBase58(), amount: DRIP.toString() });
  } catch (error) {
    lastDrip.delete(key);
    return fail(502, messageOf(error));
  }
}
