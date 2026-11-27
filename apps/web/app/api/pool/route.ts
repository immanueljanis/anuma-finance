import bs58 from "bs58";
import { connection } from "next/server";
import { ACCOUNT_SIZE, PROGRAM_ID, decodeCredit, discriminator } from "@/lib/anuma/program";
import { fetchConfig, rpc } from "@/lib/anuma/server";
import { fail, messageOf } from "@/lib/anuma/http";

/**
 * Public pool state: vault liquidity and every credit line. A line lists only what the chain
 * stores (pseudonym, limit, debt, due time, history), which is exactly what a lender can see.
 */
export async function GET() {
  await connection();
  try {
    const conn = rpc();
    const config = await fetchConfig(conn);
    if (!config) return fail(503, "The Anuma program is not initialized on this cluster yet");
    const [vault, accounts] = await Promise.all([
      conn.getTokenAccountBalance(config.vault, "confirmed"),
      conn.getProgramAccounts(PROGRAM_ID, {
        filters: [{ dataSize: ACCOUNT_SIZE.Credit }, { memcmp: { offset: 0, bytes: bs58.encode(discriminator("account", "Credit")) } }],
      }),
    ]);
    const lines = accounts.map(({ pubkey, account }) => {
      const c = decodeCredit(account.data);
      return {
        address: pubkey.toBase58(),
        pseudonym: c.pseudonym.toBase58(),
        limit: c.limit.toString(),
        debt: c.debt.toString(),
        dueTs: Number(c.dueTs),
        repaidCount: c.repaidCount,
        defaulted: c.defaulted,
      };
    });
    return Response.json({
      vault: config.vault.toBase58(),
      vaultBalance: vault.value.amount,
      usdcMint: config.usdcMint.toBase58(),
      graceSecs: config.graceSecs.toString(),
      memberCount: config.memberCount,
      lines,
    });
  } catch (error) {
    return fail(502, messageOf(error));
  }
}
