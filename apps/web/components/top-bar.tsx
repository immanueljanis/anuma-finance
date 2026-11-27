"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLUSTER } from "@/lib/anuma/browser";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/", label: "Credit" },
  { href: "/pool", label: "Pool" },
  { href: "/merchant", label: "Merchant" },
];

/** The Anuma mark: a private point inside a public ring, the membership-proof idea in one glyph. */
export function Logo() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className="size-7">
      <rect width="28" height="28" rx="8" className="fill-primary" />
      <circle cx="14" cy="14" r="7.25" fill="none" strokeWidth="1.75" className="stroke-on-primary" />
      <circle cx="16.75" cy="11.25" r="2.25" className="fill-champagne" />
    </svg>
  );
}

const CLUSTER_LABEL = { devnet: "Devnet", localnet: "Localnet", mainnet: "Mainnet", custom: "Custom RPC" };

export function TopBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[72rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <Logo />
          <span className="text-lead font-semibold tracking-tight text-ink">Anuma</span>
        </Link>
        <nav aria-label="Main" className="order-last -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-1 sm:order-none sm:mx-0 sm:w-auto">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-small font-medium transition-colors duration-150 ${
                  active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-caption font-medium text-ink-2 sm:inline-flex">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {CLUSTER_LABEL[CLUSTER]}
          </span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
