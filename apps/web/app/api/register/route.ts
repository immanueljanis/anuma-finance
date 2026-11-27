import { Transaction } from "@solana/web3.js";
import { personPda, registerIx } from "@/lib/anuma/program";
import { normalizeIdNumber, personIdFor, rpc, serverKeypair } from "@/lib/anuma/server";
import { fail, jsonBody, messageOf, parsePubkey } from "@/lib/anuma/http";
import { BN254_R, be32 } from "@/lib/zk/encoding";

/**
 * Demo KYC issuer. It accepts any well-formed government ID number; a production issuer would first
 * verify the document with a licensed identity provider. It returns a `register` transaction that
 * the issuer has already signed as fee payer and co-signer. The user's wallet adds its signature
 * and submits it. The chain stores only HMAC(issuer secret, ID number), never the number itself.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  const wallet = parsePubkey(body?.wallet);
  const idNumber = typeof body?.idNumber === "string" ? normalizeIdNumber(body.idNumber) : null;
  const commitmentText = typeof body?.commitment === "string" && /^\d{1,78}$/.test(body.commitment) ? body.commitment : null;
  if (!wallet) return fail(400, "A valid wallet address is required");
  if (!idNumber) return fail(400, "Enter a government ID number of 6 to 20 letters or digits");
  if (!commitmentText) return fail(400, "A Semaphore identity commitment is required");
  const commitment = BigInt(commitmentText);
  if (commitment === 0n || commitment >= BN254_R) return fail(400, "The identity commitment is out of range");

  try {
    const conn = rpc();
    const issuer = serverKeypair();
    const personId = personIdFor(idNumber);
    if (await conn.getAccountInfo(personPda(personId))) {
      return fail(409, "This ID is already registered. One person can hold one Anuma identity.");
    }
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: issuer.publicKey, blockhash, lastValidBlockHeight }).add(
      registerIx({ issuer: issuer.publicKey, kycWallet: wallet, personId, commitment: be32(commitment) }),
    );
    tx.partialSign(issuer);
    return Response.json({ tx: tx.serialize({ requireAllSignatures: false }).toString("base64") });
  } catch (error) {
    return fail(502, messageOf(error));
  }
}
