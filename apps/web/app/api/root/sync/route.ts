import { rpc, syncRoot } from "@/lib/anuma/server";
import { fail, messageOf } from "@/lib/anuma/http";

/** Devnet confirmations can take tens of seconds; hosting platforms read this limit from the build output. */
export const maxDuration = 60;

/**
 * Posts the Merkle root of all registered commitments when it changed. Anyone may call it: the
 * server recomputes the root from on-chain Person accounts, so a caller cannot choose the root.
 */
export async function POST() {
  try {
    return Response.json(await syncRoot(rpc()));
  } catch (error) {
    return fail(502, messageOf(error));
  }
}
