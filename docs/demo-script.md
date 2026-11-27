# Demo video script (under 3 minutes)

Record the real product on devnet, no slides. Two browser windows side by side: `/app` (left, a wallet extension on devnet) and `/merchant` (right). Keep `/pool` in a third tab.

## 0:00 to 0:20 · The problem

Show the landing page hero.

> On chain, a wallet has no identity, so every DeFi loan needs more collateral than it lends. Linking your identity to a wallet fixes that, and exposes its whole history. Anuma gives verified people credit without showing who they are.

## 0:20 to 1:05 · Verify once, borrow privately

On `/app`:

1. Connect the wallet. *This is my main wallet. It proves I am me, once, and never touches a loan.*
2. Sign to create the identity. *My browser turns this signature into a Semaphore identity. Nothing is sent.*
3. Enter an ID number and verify. *The issuer co-signs a registration. The chain stores only a keyed hash.*
4. Generate the proof and open the line. *My browser proves I am one of the verified people, for a brand-new wallet, in under a second. The program checks the Groth16 proof on chain in about 108 thousand compute units.*

Point at the card: *Holder: verified, unnamed. Limit 25.*

## 1:05 to 1:45 · Pay a real Solana Pay merchant

1. On `/merchant`, pick the side-event ticket and create the invoice.
2. Copy the link, press Paste on `/app`, and pay 18 mUSDC.
3. The store window turns to Paid. *The store has never heard of Anuma. It found the payment by its Solana Pay reference, like any other.*

## 1:45 to 2:15 · Repay and grow

1. Get test mUSDC on the pseudonym and repay. *I repay from the pseudonym, so my main wallet never appears.*
2. The limit grows to 37.50. *Each on-time repayment raises the limit by half, up to 100.*

## 2:15 to 2:45 · One person, one line

1. Press "Try a second line from a new wallet". The program refuses it. *The proof was valid, but it carries the same nullifier. One person, one line, whatever the wallet.*
2. Switch to `/pool`. *Lenders see every line, its limit and repayment history. None of them says who it belongs to.*
3. Optional, if pre-recorded: a line past its grace period, marked as defaulted. *A default stays with the person. A new wallet does not reset it.*

## 2:45 to 3:00 · Close

> Anuma: verified, never named. Built on Solana with Semaphore proofs and groth16-solana, during this hackathon.

## Before recording

- Program deployed and bootstrapped on devnet; the vault holds liquidity; seven demo members registered.
- Wallet extension switched to devnet; no prior Anuma identity on that wallet (or use a fresh one).
- Close other tabs, 100% zoom, light theme, notifications off.
