import { ArrowRight, Check, Fingerprint, Globe, KeyRound, Lock, ShieldCheck, Wallet, X } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingMotion } from "@/components/landing/landing-motion";
import { Words } from "@/components/landing/words";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const REPO = "https://github.com/immanueljanis/anuma-finance";

/** Section heading in the hero's voice: a dark claim followed by a gray second sentence, revealed word by word. */
function Heading({ light, dark, center = false }: { light: string; dark: string; center?: boolean }) {
  return (
    <h2
      data-reveal="words"
      className={`max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-gray-950 md:text-5xl md:leading-[1.08] ${center ? "mx-auto text-center" : ""}`}
    >
      <Words text={light} /> <span className="text-gray-400">
        <Words text={dark} />
      </span>
    </h2>
  );
}

function Section({ id, tone, children }: { id?: string; tone: "gray" | "white"; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-4 overflow-x-clip ${tone === "gray" ? "bg-gray-50" : "bg-white"}`}>
      <div className="mx-auto w-full max-w-7xl px-8 py-24 md:py-32">{children}</div>
    </section>
  );
}

const STEPS = [
  { icon: Wallet, title: "Connect your wallet", body: "Your main wallet proves you are you, once. It never pays or borrows." },
  { icon: Fingerprint, title: "Create a private identity", body: "Sign one message. Your browser turns it into a Semaphore identity. Nothing is sent." },
  { icon: ShieldCheck, title: "Verify once", body: "The issuer checks your government ID once. The chain stores a keyed hash of it, never the number." },
  { icon: KeyRound, title: "Open a line from a fresh wallet", body: "Your browser proves you are verified, in under a second. A relayer pays the fee." },
];

function HowItWorks() {
  return (
    <Section id="how" tone="gray">
      <Heading light="Verify once." dark="Borrow privately." />
      <p data-reveal="up" className="mt-6 max-w-2xl text-lg text-gray-600">
        Four steps, about a minute. Only step three asks for personal data, and only the issuer sees it.
      </p>
      <ol data-reveal="stagger" className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} data-tilt className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-gray-950 text-sm font-semibold text-white">{i + 1}</span>
                <Icon aria-hidden className="size-5 text-gray-500" />
              </div>
              <h3 className="mt-6 font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>
            </li>
          );
        })}
      </ol>
      <p data-reveal="up" className="mt-12 max-w-3xl text-gray-600">
        Then pay any Solana Pay merchant from your line, and repay from the same wallet. Each on-time repayment raises your limit by half:{" "}
        <span className="font-medium whitespace-nowrap text-gray-900">25 → 37.50 → 56.25 → 84.38 → 100 mUSDC.</span>
      </p>
    </Section>
  );
}

const PUBLIC_ROWS = [
  ["Pseudonym wallet", "A fresh key made for one line. No SOL, no history."],
  ["Limit, debt and due time", "So lenders can price the pool and anyone can flag a default."],
  ["Nullifier", "A one-way tag of the person, the same for every wallet they try."],
];

const PRIVATE_ROWS = [
  ["Your main wallet", "Signs the one-time verification. Never appears in a credit transaction."],
  ["Your ID number", "Seen by the issuer once. The chain stores a hash only the issuer key can produce."],
  ["Which member you are", "The zero-knowledge proof hides you among every verified person."],
];

function Privacy() {
  const columns = [
    { title: "Public on Solana", icon: Globe, rows: PUBLIC_ROWS, dark: false, reveal: "left" },
    { title: "Known only to you", icon: Lock, rows: PRIVATE_ROWS, dark: true, reveal: "right" },
  ];
  return (
    <Section id="privacy" tone="white">
      <Heading light="The chain sees a verified person." dark="Never which one." />
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <div
              key={column.title}
              data-reveal={column.reveal}
              data-tilt
              className={`rounded-3xl p-8 ${column.dark ? "bg-gray-950 text-white" : "bg-gray-50 ring-1 ring-gray-200"}`}
            >
              <h3 className={`flex items-center gap-2 font-semibold ${column.dark ? "text-white" : "text-gray-900"}`}>
                <Icon aria-hidden className="size-5" />
                {column.title}
              </h3>
              <dl className="mt-6 flex flex-col gap-5">
                {column.rows.map(([label, note]) => (
                  <div key={label}>
                    <dt className="font-medium">{label}</dt>
                    <dd className={`mt-1 text-sm leading-relaxed ${column.dark ? "text-gray-300" : "text-gray-600"}`}>{note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const COMPARE = [
  { label: "Capital you lock", collateral: "More than the loan", identity: "None", anuma: "None" },
  { label: "Who sees your history", collateral: "Everyone, by wallet", identity: "The lender, and anyone who links the wallet", anuma: "Nobody: each line uses a fresh wallet" },
  { label: "One person, many accounts", collateral: "Not a concern", identity: "Hard to stop", anuma: "Impossible: one person, one line" },
  { label: "A default follows", collateral: "Nobody", identity: "Your public identity", anuma: "The person, without naming them" },
];

function Why() {
  return (
    <Section id="why" tone="gray">
      <Heading light="On chain, credit costs capital or privacy." dark="Anuma costs neither." />
      <div data-reveal="up" className="mt-16 overflow-x-auto rounded-3xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[44rem] text-left">
          <thead>
            <tr className="text-sm text-gray-500">
              <th scope="col" className="w-1/4 px-6 py-5 font-medium">
                <span className="sr-only">Property</span>
              </th>
              <th scope="col" className="px-6 py-5 font-medium">Collateral lending</th>
              <th scope="col" className="px-6 py-5 font-medium">Identity-linked credit</th>
              <th scope="col" className="bg-gray-950 px-6 py-5 font-semibold text-white">Anuma</th>
            </tr>
          </thead>
          <tbody data-reveal="stagger">
            {COMPARE.map((row) => (
              <tr key={row.label} className="border-t border-gray-200">
                <th scope="row" className="px-6 py-5 align-top text-sm font-semibold text-gray-900">
                  {row.label}
                </th>
                <td className="px-6 py-5 align-top text-sm text-gray-600">{row.collateral}</td>
                <td className="px-6 py-5 align-top text-sm text-gray-600">{row.identity}</td>
                <td className="bg-gray-100 px-6 py-5 align-top text-sm font-medium text-gray-900">{row.anuma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function OneLine() {
  const rows = [
    { wallet: "Gb9S…uHg4", note: "First line", ok: true },
    { wallet: "9rso…SB98", note: "Brand-new wallet, same person", ok: false },
  ];
  return (
    <Section tone="white">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <Heading light="One person, one line." dark="Whatever the wallet." />
          <p data-reveal="up" className="mt-6 text-lg text-gray-600">
            Every proof carries a nullifier computed from your identity secret. It reveals nothing about you, and it is the same for every wallet you
            use. The program seeds each credit line with it, so a second line, or a fresh start after a default, is refused on chain.
          </p>
        </div>
        <figure data-reveal="right" data-tilt aria-label="Two wallets, one nullifier" className="rounded-3xl bg-gray-50 p-8 ring-1 ring-gray-200">
          <div data-reveal="stagger">
            {rows.map((row, i) => (
              <div key={row.wallet} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-4 ${i ? "mt-6 border-t border-gray-200 pt-6" : ""}`}>
                <div>
                  <p className="text-xs text-gray-500">{row.note}</p>
                  <p className="mt-1 font-mono text-sm text-gray-900">{row.wallet}</p>
                </div>
                <ArrowRight aria-hidden className="size-4 text-gray-400" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Nullifier</p>
                    <p className="mt-1 font-mono text-sm text-gray-900">0600c3…dfb6</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      row.ok ? "bg-gray-950 text-white" : "bg-gray-300 text-gray-800"
                    }`}
                  >
                    {row.ok ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                    {row.ok ? "Opened" : "Refused"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <figcaption className="mt-6 text-xs text-gray-500">Same identity, same nullifier: the program refuses the second account.</figcaption>
        </figure>
      </div>
    </Section>
  );
}

function SolanaPay() {
  return (
    <Section id="pay" tone="gray">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <figure data-reveal="stagger" aria-label="A Solana Pay invoice paid from an Anuma line" className="order-last lg:order-first">
          <div className="rounded-3xl bg-white p-6 font-mono text-xs leading-relaxed break-all text-gray-600 ring-1 ring-gray-200">
            solana:84t9…FBVX?amount=18&amp;spl-token=GCau…NhoL&amp;reference=C22Q…vUm&amp;label=Corner%20Store
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <div>
              <p className="text-sm text-gray-500">Corner Store · Side-event ticket</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                Paid 18.00 <span className="text-base font-normal text-gray-500">mUSDC</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-950 px-3 py-1 text-xs font-medium text-white">
              <Check aria-hidden className="size-3.5" />
              Found by reference
            </span>
          </div>
        </figure>
        <div>
          <Heading light="Pay any Solana Pay merchant." dark="Starting today." />
          <p data-reveal="up" className="mt-6 text-lg text-gray-600">
            Paste a standard Solana Pay link. The vault pays the merchant, the invoice reference rides along, and the shop confirms the payment the
            way it confirms any other. No integration, and the shop never learns who bought.
          </p>
        </div>
      </div>
    </Section>
  );
}

const FACTS: { term: string; figure: number; decimals?: number; unit: string; detail: string }[] = [
  { term: "On-chain check", figure: 107675, unit: "compute units", detail: "groth16-solana verifies each new line through the alt_bn128 syscalls." },
  { term: "Proving", figure: 0.7, decimals: 1, unit: "seconds", detail: "Measured in Chrome. The identity secret never leaves the browser." },
  { term: "Proof system", figure: 16, unit: "tree levels", detail: "Semaphore v4: Groth16 over BN254 on a Merkle tree of verified identities." },
  { term: "Root history", figure: 8, unit: "roots kept", detail: "A proof stays valid while up to seven new people register." },
];

function UnderTheHood() {
  return (
    <Section tone="white">
      <Heading light="Under the hood." dark="Measured, not promised." />
      <dl data-reveal="stagger" className="mt-16 grid gap-6 sm:grid-cols-2">
        {FACTS.map((fact) => (
          <div key={fact.term} data-tilt className="rounded-3xl bg-gray-50 p-6 ring-1 ring-gray-200">
            <dt className="text-sm font-semibold text-gray-500">{fact.term}</dt>
            <dd className="mt-3">
              <span className="text-4xl font-semibold tracking-tight text-gray-950 tabular-nums">
                <span data-count={fact.figure} data-dec={fact.decimals ?? 0}>
                  {fact.figure.toLocaleString("en-US", { minimumFractionDigits: fact.decimals ?? 0 })}
                </span>
              </span>
              <span className="ml-2 text-gray-500">{fact.unit}</span>
              <span className="mt-3 block text-sm leading-relaxed text-gray-600">{fact.detail}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function Closing() {
  return (
    <section className="overflow-x-clip bg-gray-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-8 py-24 text-center md:py-32">
        <h2 data-reveal="words" className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-white md:text-6xl md:leading-[1.05]">
          <Words text="Your reputation." /> <span className="text-gray-400">
            <Words text="Not your identity." />
          </span>
        </h2>
        <p data-reveal="up" className="mt-6 max-w-xl text-lg text-gray-300">
          Open a private credit line on Solana devnet in about a minute. Mock USDC, no real funds.
        </p>
        <div data-reveal="up" className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/app" className="rounded-full bg-white px-4 py-2 font-medium text-gray-950 transition-colors hover:bg-gray-200">
            Open the app
          </Link>
          <Link href="/pool" className="rounded-full bg-gray-300 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-400">
            See the lending pool
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-8 text-sm text-gray-500">
        <p>Anuma. Built during the Dev3pack Global Hackathon, November 2026. Devnet demo with mock USDC.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/merchant" className="transition-colors hover:text-gray-900">
            Demo merchant
          </Link>
          <a href={REPO} target="_blank" rel="noreferrer" className="transition-colors hover:text-gray-900">
            Source code
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-50`}>
      <div id="scroll-progress" aria-hidden className="fixed inset-x-0 top-0 z-30 h-0.5 origin-left scale-x-0 bg-gray-950" />
      <LandingHero />
      <HowItWorks />
      <Privacy />
      <Why />
      <OneLine />
      <SolanaPay />
      <UnderTheHood />
      <Closing />
      <Footer />
      <LandingMotion />
    </div>
  );
}
