import { connection } from "next/server";
import { PROGRAM_ID, latestRoot } from "@/lib/anuma/program";
import { fetchCommitments, fetchConfig, rpc, serverKeypair } from "@/lib/anuma/server";
import { fail, messageOf } from "@/lib/anuma/http";
import { fromBe32 } from "@/lib/zk/encoding";

/**
 * Public protocol state for the client: the relayer key, the token mint, the credit parameters, and
 * every registered commitment in Merkle order. The browser rebuilds the group from this list to
 * prove membership, so the list must match the on-chain Person accounts exactly.
 */
export async function GET() {
  await connection();
  try {
    const conn = rpc();
    const [config, commitments] = await Promise.all([fetchConfig(conn), fetchCommitments(conn)]);
    if (!config) return fail(503, "The Anuma program is not initialized on this cluster yet");
    const root = latestRoot(config);
    return Response.json({
      programId: PROGRAM_ID.toBase58(),
      relayer: serverKeypair().publicKey.toBase58(),
      usdcMint: config.usdcMint.toBase58(),
      vault: config.vault.toBase58(),
      startLimit: config.startLimit.toString(),
      maxUnsecuredLimit: config.maxUnsecuredLimit.toString(),
      loanTermSecs: config.loanTermSecs.toString(),
      graceSecs: config.graceSecs.toString(),
      memberCount: config.memberCount,
      latestRoot: root ? fromBe32(root).toString() : null,
      commitments: commitments.map(String),
    });
  } catch (error) {
    return fail(502, messageOf(error));
  }
}
