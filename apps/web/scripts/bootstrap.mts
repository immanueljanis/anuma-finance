import { createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

/**
 * One-time cluster setup with the server key from apps/web/.env.local: create the mock USDC mint,
 * initialize the program with the demo credit terms, create the demo merchant's token account, fund
 * the vault, and register seven demo members so the first real user already hides among several
 * people. Each step checks chain state first, so a rerun skips finished steps.
 * Usage: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bootstrap.mts
 */
process.loadEnvFile(new URL("../.env.local", import.meta.url));
const program = await import("../lib/anuma/program.ts");
const server = await import("../lib/anuma/server.ts");

const USDC = 1_000_000n;
const TERMS = { startLimit: 25n * USDC, maxUnsecuredLimit: 100n * USDC, loanTermSecs: 120n, graceSecs: 30n };
const VAULT_TARGET = 5_000n * USDC;
const DEMO_MEMBERS = 7;

const conn = server.rpc();
const admin = server.serverKeypair();
const merchantOwner = new PublicKey(process.env.NEXT_PUBLIC_MERCHANT_OWNER ?? "");
console.log(`RPC ${server.RPC_URL}\nprogram ${program.PROGRAM_ID.toBase58()}\nadmin ${admin.publicKey.toBase58()}`);

const programInfo = await conn.getAccountInfo(program.PROGRAM_ID);
if (!programInfo?.executable) throw new Error("The program is not deployed on this cluster");

let config = await server.fetchConfig(conn);
if (!config) {
  const mint = await createMint(conn, admin, admin.publicKey, null, 6);
  console.log(`created mock USDC mint ${mint.toBase58()}`);
  await sendAndConfirmTransaction(
    conn,
    new Transaction().add(program.initializeIx({ admin: admin.publicKey, usdcMint: mint, issuer: admin.publicKey, ...TERMS })),
    [admin],
  );
  config = await server.fetchConfig(conn);
  console.log("initialized config and vault");
}
if (!config) throw new Error("Config is missing after initialize");

const merchantAta = await getOrCreateAssociatedTokenAccount(conn, admin, config.usdcMint, merchantOwner);
console.log(`merchant token account ${merchantAta.address.toBase58()}`);

const vaultBalance = (await getAccount(conn, config.vault)).amount;
if (vaultBalance < VAULT_TARGET) {
  const top = VAULT_TARGET - vaultBalance;
  const adminAta = await getOrCreateAssociatedTokenAccount(conn, admin, config.usdcMint, admin.publicKey);
  await mintTo(conn, admin, config.usdcMint, adminAta.address, admin, top);
  await sendAndConfirmTransaction(
    conn,
    new Transaction().add(program.depositIx({ lender: admin.publicKey, lenderToken: adminAta.address, amount: top })),
    [admin],
  );
  console.log(`deposited ${top / USDC} mock USDC into the vault`);
}

const { Identity } = await import("@semaphore-protocol/identity");
const { Keypair } = await import("@solana/web3.js");
const { be32 } = await import("../lib/zk/encoding.ts");
let seeded = 0;
for (let i = 1; i <= DEMO_MEMBERS; i++) {
  const personId = server.personIdFor(`DEMO${String(i).padStart(6, "0")}`);
  if (await conn.getAccountInfo(program.personPda(personId))) continue;
  const kycWallet = Keypair.generate();
  const commitment = be32(new Identity(`anuma-demo-member-${i}`).commitment);
  await sendAndConfirmTransaction(
    conn,
    new Transaction().add(program.registerIx({ issuer: admin.publicKey, kycWallet: kycWallet.publicKey, personId, commitment })),
    [admin, kycWallet],
  );
  seeded++;
}
if (seeded) console.log(`registered ${seeded} demo members so a proof hides its owner among several people`);
const synced = await server.syncRoot(conn);
if (synced.signature) console.log(`posted Merkle root for ${synced.members} members`);
config = (await server.fetchConfig(conn)) ?? config;

console.log({
  usdcMint: config.usdcMint.toBase58(),
  vault: config.vault.toBase58(),
  vaultBalance: `${(await getAccount(conn, config.vault)).amount / USDC} mUSDC`,
  startLimit: `${config.startLimit / USDC} mUSDC`,
  maxUnsecuredLimit: `${config.maxUnsecuredLimit / USDC} mUSDC`,
  loanTermSecs: config.loanTermSecs.toString(),
  graceSecs: config.graceSecs.toString(),
  members: config.memberCount,
  adminSol: (await conn.getBalance(admin.publicKey)) / 1e9,
});
