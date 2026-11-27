"use client";

import { Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HeroScene } from "./hero-scene";

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Privacy", href: "#privacy" },
  { label: "Why Anuma", href: "#why" },
  { label: "Pool", href: "/pool" },
];

const STATS = [
  { value: "107,675", label: "Compute units per proof" },
  { value: "0.7 s", label: "To prove in your browser" },
  { value: "1", label: "Line per person, ever" },
  { value: "0", label: "Identities on chain" },
];

function Mark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className="size-7">
      <rect width="28" height="28" rx="8" fill="#0b1220" />
      <circle cx="14" cy="14" r="7.25" fill="none" strokeWidth="1.75" stroke="#ffffff" />
      <circle cx="16.75" cy="11.25" r="2.25" fill="#c7d2e0" />
    </svg>
  );
}

/** Anonymous avatars: the verified crowd, drawn without faces on purpose. */
function Crowd() {
  const tones = ["from-gray-300 to-gray-500", "from-slate-400 to-slate-600", "from-gray-400 to-gray-600", "from-slate-300 to-slate-500"];
  return (
    <span className="flex -space-x-2">
      {tones.map((tone) => (
        <span key={tone} className={`flex size-6 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-white ${tone}`}>
          <UserRound aria-hidden className="size-3.5 text-white/90" />
        </span>
      ))}
    </span>
  );
}

/** Full-screen hero over the 3D scene: simple nav, one-line claim, one action, and measured stats. */
export function LandingHero() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative h-screen min-h-[40rem] overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-gray-50 via-[#eef0f3] to-[#dde1e7]" />
      <HeroScene className="absolute inset-0" />

      <div className="relative flex h-full flex-col">
        <nav aria-label="Main" className="relative mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center px-6 py-5 md:grid-cols-[1fr_auto_1fr]">
          <Link href="/" className="flex items-center gap-2 justify-self-start text-base font-semibold text-gray-950">
            <Mark />
            Anuma
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-gray-700 transition-colors hover:text-gray-950">
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 justify-self-end">
            <Link href="/app" className="hidden rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 md:inline-flex">
              Open the app
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="text-gray-950 transition-colors hover:text-gray-700 md:hidden"
            >
              {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>

          {menuOpen && (
            <div id="landing-menu" className="absolute inset-x-6 top-full z-10 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-gray-200 md:hidden">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-gray-900 transition-colors hover:bg-gray-100"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/app" className="mt-1 block rounded-xl bg-gray-950 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-gray-800">
                Open the app
              </Link>
            </div>
          )}
        </nav>

        <div id="hero-copy" className="mx-auto mt-[9vh] flex max-w-4xl flex-col items-center px-6 text-center will-change-transform">
          <p className="flex items-center gap-2.5 rounded-full bg-white/70 py-1 pr-3.5 pl-1 text-xs text-gray-700 shadow-sm ring-1 ring-gray-200/80">
            <Crowd />
            <span className="whitespace-nowrap sm:hidden">Verified, never named.</span>
            <span className="hidden sm:inline">Verified people borrow here. None of them named.</span>
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">Private. Verified. Credit.</h1>
          <p className="mt-4 text-base text-gray-700 md:text-lg">Unsecured credit on Solana, without showing who you are.</p>
          <Link href="/app" className="mt-7 rounded-full bg-gray-950 px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800">
            Open the app
          </Link>
        </div>

        <dl className="absolute inset-x-6 bottom-6 mx-auto hidden max-w-3xl grid-cols-4 rounded-2xl bg-white/80 px-4 py-5 shadow-sm ring-1 ring-gray-200/80 sm:grid">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse items-center text-center">
              <dt className="mt-0.5 text-xs text-gray-600">{stat.label}</dt>
              <dd className="text-2xl font-medium tracking-tight text-gray-950 tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
