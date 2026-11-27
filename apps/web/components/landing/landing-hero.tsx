"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HeroScene } from "./hero-scene";


const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Privacy", href: "#privacy" },
  { label: "Why Anuma", href: "#why" },
  { label: "Solana Pay", href: "#pay" },
  { label: "Pool", href: "/pool" },
];

/** Full-screen 3D hero with the landing navigation and its mobile dropdown menu. */
export function LandingHero() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative h-screen overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-gray-50 via-[#eef0f3] to-[#dde1e7]" />
      <HeroScene className="absolute inset-0" />

      <div className="relative flex h-full flex-col">
        <nav aria-label="Main" className="relative mx-auto w-full max-w-7xl px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-semibold text-gray-900">
              Anuma
            </Link>
            <div className="hidden items-center gap-8 md:flex">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className="text-gray-900 transition-colors hover:text-gray-700">
                  {item.label}
                </a>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="text-gray-900 transition-colors hover:text-gray-700 md:hidden"
            >
              {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>

          {menuOpen && (
            <div id="landing-menu" className="absolute inset-x-8 top-full z-10 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur-md md:hidden">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-gray-900 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </nav>

        <div className="flex flex-1 items-center justify-center">
          <div id="hero-copy" className="-mt-80 px-8 text-center will-change-transform">
            <p className="mb-4 text-sm font-semibold tracking-wider text-gray-600 uppercase">Private credit</p>
            <h1 className="mb-6">
              <span className="block text-6xl leading-none font-normal tracking-tighter text-gray-500 md:text-7xl lg:text-8xl">Private.</span>
              <span className="-mt-3 block text-6xl leading-none font-normal tracking-tighter text-[#202A36] md:text-7xl lg:text-8xl">Verified.</span>
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600 md:text-xl">Borrow on Solana without showing who you are.</p>
            <div className="flex items-center justify-center gap-4">
              <a href="#how" className="rounded-full bg-gray-300 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-400">
                Discover
              </a>
              <Link href="/app" className="rounded-full bg-[#202A36] px-4 py-2 font-medium text-white transition-colors hover:bg-[#1a2229]">
                Open the app
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
