import { PublicKey } from "@solana/web3.js";
import { ArrowRight, Check, EyeOff, Fingerprint, Globe, KeyRound, Lock, ShieldCheck, Wallet, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard } from "@/components/credit/credit-card";
import { lineStatus } from "@/components/credit/line-status";
import { GuillocheBand, GuillocheRosette } from "@/components/landing/guilloche";

const SAMPLE_LINE = {
  pseudonym: new PublicKey("Gb9SpQz7d3mPaxWv4nXrK1TqYb6cHjLu2EoA8fRsuHg4"),
  nullifier: new Uint8Array(32),
  limit: 37_500_000n,
  debt: 0n,
  dueTs: 0n,
  repaidCount: 1,
  defaulted: false,
  bump: 255,
  size: 100,
};

const REPO = "https://github.com/immanueljanis/anuma-finance";

function Annotation({ icon, children, className }: { icon: ReactNode; children: ReactNode; className: string }) {
  return (
    <p
      className={`absolute z-10 hidden max-w-56 items-start gap-2 rounded-control border border-line bg-bg/95 px-3 py-2 text-caption text-ink-2 shadow-[var(--shadow-raise)] backdrop-blur-sm md:flex ${className}`}
    >
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid w-full max-w-[72rem] items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-8 lg:pt-20 lg:pb-28">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-line bg-primary-soft px-3 py-1 text-caption font-medium text-primary">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            Live on Solana devnet
          </p>
          <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.02] font-medium tracking-[-0.02em] text-ink [font-variation-settings:'opsz'_96]">
            Borrow without showing who you are.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lead text-ink-2">
            Anuma gives verified people an unsecured credit line on Solana. You prove you passed KYC with a zero-knowledge proof, from a fresh
            wallet. Lenders learn that a verified person owns the line. Nobody learns which one.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="inline-flex h-12 items-center gap-2 rounded-control bg-primary px-5 font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover active:bg-primary-active"
            >
              Open the app
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex h-12 items-center rounded-control border border-line-strong px-5 font-medium text-ink transition-colors duration-150 hover:bg-surface"
            >
              How it works
            </Link>
          </div>
          <p className="mt-8 text-small text-muted">
            Semaphore v4 proofs, verified on chain in about 108k compute units. Pays any Solana Pay merchant.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem]">
          <GuillocheRosette
            reveal
            className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[128%] max-w-none -translate-x-1/2 -translate-y-1/2 text-primary opacity-[0.28]"
          />
          <div className="card-settle relative">
            <CreditCard credit={SAMPLE_LINE} status={lineStatus(SAMPLE_LINE, 30n, 0)} startLimit={25_000_000n} maxLimit={100_000_000n} graceSecs={30n} now={0} />
          </div>
          <Annotation icon={<ShieldCheck aria-hidden className="size-3.5" />} className="-top-12 -left-14">
            Zero-knowledge proof checked by the program
          </Annotation>
          <Annotation icon={<EyeOff aria-hidden className="size-3.5" />} className="-right-8 -bottom-8">
            Owner hidden among every verified person
          </Annotation>
        </div>
      </div>
    </section>
  );
}

const COMPARE: { label: string; collateral: string; identity: string; anuma: string }[] = [
  { label: "Capital you lock", collateral: "More than the loan", identity: "None", anuma: "None" },
  { label: "Who sees your history", collateral: "Everyone, by wallet", identity: "The lender, and anyone who links the wallet", anuma: "Nobody: each line uses a fresh wallet" },
  { label: "One person, many accounts", collateral: "Not a concern", identity: "Hard to stop", anuma: "Impossible: one person, one line" },
  { label: "A default follows", collateral: "Nobody", identity: "Your public identity", anuma: "The person, without naming them" },
];

function Compare() {
  return (
    <section className="mx-auto w-full max-w-[72rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="max-w-[40rem]">
        <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_72]">
          On chain today, credit costs you capital or privacy.
        </h2>
        <p className="mt-4 text-lead text-ink-2">
          A wallet has no identity, so DeFi lends only against collateral. Linking your identity to a wallet fixes that, and exposes its whole
          history.
        </p>
      </div>
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <thead>
            <tr className="text-small text-muted">
              <th scope="col" className="w-[22%] pb-4 font-medium">
                <span className="sr-only">Property</span>
              </th>
              <th scope="col" className="pb-4 font-medium">Collateral lending</th>
              <th scope="col" className="pb-4 font-medium">Identity-linked credit</th>
              <th scope="col" className="rounded-t-panel bg-primary px-5 pt-4 pb-4 font-semibold text-on-primary">Anuma</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row, i) => (
              <tr key={row.label} className="border-t border-line">
                <th scope="row" className="py-5 pr-6 align-top text-small font-semibold text-ink">
                  {row.label}
                </th>
                <td className="py-5 pr-6 align-top text-small text-ink-2">{row.collateral}</td>
                <td className="py-5 pr-6 align-top text-small text-ink-2">{row.identity}</td>
                <td className={`bg-primary-soft px-5 py-5 align-top text-small font-medium text-ink ${i === COMPARE.length - 1 ? "rounded-b-panel" : ""}`}>
                  {row.anuma}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Wallet, title: "Connect your wallet", body: "Your main wallet proves you are you, once. It never pays or borrows." },
  { icon: Fingerprint, title: "Create a private identity", body: "Sign one message. Your browser turns the signature into a Semaphore identity. Nothing is sent." },
  { icon: ShieldCheck, title: "Verify once", body: "The issuer checks your NIK and adds your identity to the verified group. The chain stores a keyed hash, never the number." },
  { icon: KeyRound, title: "Open a line from a fresh wallet", body: "Your browser proves you belong to the group, in under a second. A relayer pays the fee, so the new wallet needs no SOL." },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <h2 className="max-w-[36rem] font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_72]">
          Four steps, about a minute.
        </h2>
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-small font-semibold tabular text-on-primary">{i + 1}</span>
                  <span aria-hidden className="hidden h-px flex-1 bg-line-strong lg:block" />
                  <Icon aria-hidden className="size-5 text-primary" />
                </div>
                <h3 className="mt-5 text-body font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-small text-ink-2">{step.body}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-14 max-w-[44rem] text-body text-ink-2">
          Then pay any Solana Pay merchant from your line and repay from the same pseudonym. Each on-time repayment raises the limit by half:{" "}
          <span className="font-medium whitespace-nowrap tabular text-ink">25 → 37.50 → 56.25 → 84.38 → 100 mUSDC.</span>
        </p>
      </div>
    </section>
  );
}

const PUBLIC_ROWS = [
  ["Pseudonym wallet", "A fresh key made for one line. No SOL, no history."],
  ["Limit, debt and due time", "So lenders can price the pool and anyone can flag a default."],
  ["Nullifier", "A one-way tag of the person, the same for every wallet they try."],
];

const PRIVATE_ROWS = [
  ["Your main wallet", "Signs the one-time verification. Never appears in a credit transaction."],
  ["Your NIK", "Seen by the issuer once. The chain stores a hash only the issuer key can produce."],
  ["Which member you are", "The proof hides you among every verified person."],
];

function Boundary() {
  return (
    <section className="relative overflow-hidden bg-vault text-vault-ink">
      <GuillocheBand className="absolute inset-x-0 top-0 h-24 w-full text-champagne opacity-35" />
      <GuillocheRosette className="absolute -right-48 -bottom-48 size-[44rem] text-champagne opacity-[0.1]" />
      <div className="relative mx-auto w-full max-w-[72rem] px-4 pt-32 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <h2 className="max-w-[40rem] font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.06] font-medium tracking-[-0.015em] [font-variation-settings:'opsz'_72]">
          What the chain sees, and what it never will.
        </h2>
        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {[
            { title: "Public on Solana", icon: Globe, rows: PUBLIC_ROWS },
            { title: "Known only to you", icon: Lock, rows: PRIVATE_ROWS },
          ].map((column) => {
            const Icon = column.icon;
            return (
              <div key={column.title}>
                <h3 className="flex items-center gap-2 text-body font-semibold text-champagne">
                  <Icon aria-hidden className="size-4" />
                  {column.title}
                </h3>
                <dl className="mt-5 divide-y divide-vault-line border-y border-vault-line">
                  {column.rows.map(([label, note]) => (
                    <div key={label} className="grid gap-1 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                      <dt className="font-medium">{label}</dt>
                      <dd className="text-small leading-relaxed text-vault-muted">{note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OnePersonOneLine() {
  return (
    <section className="mx-auto grid w-full max-w-[72rem] items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
      <div>
        <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_72]">
          One person, one line, whatever the wallet.
        </h2>
        <p className="mt-5 text-lead text-ink-2">
          Every proof carries a nullifier computed from your identity secret and the Anuma scope. It reveals nothing about you, and it is the same
          for every wallet you use. The program seeds each credit line with it, so a second line, or a fresh start after a default, is refused on
          chain.
        </p>
      </div>
      <figure aria-label="Two wallets, one nullifier" className="rounded-object border border-line bg-bg p-6 shadow-[var(--shadow-raise)] sm:p-8">
        {[
          { wallet: "Gb9S…uHg4", note: "First line", ok: true },
          { wallet: "9rso…SB98", note: "Brand-new wallet, same person", ok: false },
        ].map((row, i) => (
          <div key={row.wallet} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 ${i ? "mt-6 border-t border-line pt-6" : ""}`}>
            <div>
              <p className="text-caption text-muted">{row.note}</p>
              <p className="mt-1 font-mono text-small text-ink">{row.wallet}</p>
            </div>
            <ArrowRight aria-hidden className="size-4 text-muted" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-caption text-muted">Nullifier</p>
                <p className="mt-1 font-mono text-small text-ink">0600c3…dfb6</p>
              </div>
              <span
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium ${
                  row.ok ? "border-primary-line bg-primary-soft text-primary" : "border-danger-line bg-danger-soft text-danger"
                }`}
              >
                {row.ok ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                {row.ok ? "Opened" : "Refused"}
              </span>
            </div>
          </div>
        ))}
        <figcaption className="mt-6 text-caption text-muted">Same identity, same nullifier: the program refuses the second account.</figcaption>
      </figure>
    </section>
  );
}

function SolanaPay() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-[72rem] items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <figure aria-label="A Solana Pay invoice paid from an Anuma line" className="order-last lg:order-first">
          <div className="rounded-panel border border-line bg-bg p-5 font-mono text-caption leading-relaxed break-all text-ink-2">
            solana:84t9…FBVX?amount=18&amp;spl-token=GCau…NhoL&amp;reference=C22Q…vUm&amp;label=Warung%20Anuma
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-panel border border-primary-line bg-bg p-5">
            <div>
              <p className="text-small text-muted">Warung Anuma · Side-event ticket</p>
              <p className="mt-1 text-title font-semibold tabular text-ink">
                Paid 18.00 <span className="text-body font-normal text-muted">mUSDC</span>
              </p>
            </div>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary-line bg-primary-soft px-2.5 text-caption font-medium text-primary">
              <Check aria-hidden className="size-3.5" />
              Found by reference
            </span>
          </div>
        </figure>
        <div>
          <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_72]">
            Pays any Solana Pay merchant, today.
          </h2>
          <p className="mt-5 text-lead text-ink-2">
            Paste a standard Solana Pay link. The vault pays the merchant, the invoice reference rides along, and the shop confirms the payment the
            way it confirms any other. No integration, and the shop never learns who bought.
          </p>
        </div>
      </div>
    </section>
  );
}

const FACTS = [
  ["Proof system", "Semaphore v4: Groth16 over BN254, a 16-level Merkle tree of verified identities."],
  ["On-chain check", "groth16-solana through the alt_bn128 syscalls: 107,675 compute units per new line."],
  ["Proving", "Under a second in the browser. The identity secret never leaves it."],
  ["Fees", "Paid by a relayer, so a pseudonym never holds SOL that could link it to you."],
];

function UnderTheHood() {
  return (
    <section className="mx-auto w-full max-w-[72rem] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <h2 className="text-title font-semibold text-ink">Under the hood</h2>
      <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {FACTS.map(([term, detail]) => (
          <div key={term} className="border-t border-line pt-5">
            <dt className="text-small font-semibold text-ink">{term}</dt>
            <dd className="mt-1.5 text-small text-ink-2">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <GuillocheRosette className="absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 text-primary opacity-[0.08]" />
      <div className="relative mx-auto flex w-full max-w-[72rem] flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
        <h2 className="max-w-[36rem] font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.06] font-medium tracking-[-0.015em] text-ink [font-variation-settings:'opsz'_72]">
          Open a private credit line on devnet.
        </h2>
        <p className="mt-4 max-w-[32rem] text-lead text-ink-2">About a minute from wallet to your first payment. Mock USDC, no real funds.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex h-12 items-center gap-2 rounded-control bg-primary px-5 font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover active:bg-primary-active"
          >
            Open the app
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link
            href="/pool"
            className="inline-flex h-12 items-center rounded-control border border-line-strong bg-bg px-5 font-medium text-ink transition-colors duration-150 hover:bg-surface"
          >
            See the lending pool
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[72rem] flex-wrap items-center justify-between gap-4 px-4 py-8 text-small text-muted sm:px-6 lg:px-8">
        <p>Anuma. Built during the Dev3pack Global Hackathon, November 2026. Devnet demo with mock USDC.</p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/merchant" className="hover:text-ink">
            Demo merchant
          </Link>
          <a href={REPO} className="hover:text-ink" target="_blank" rel="noreferrer">
            Source code
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <>
      <Hero />
      <Compare />
      <HowItWorks />
      <Boundary />
      <OnePersonOneLine />
      <SolanaPay />
      <UnderTheHood />
      <Closing />
      <Footer />
    </>
  );
}
