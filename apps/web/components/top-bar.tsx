"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLUSTER } from "@/lib/anuma/browser";
import { Mark } from "./mark";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/app", label: "Credit" },
  { href: "/pool", label: "Pool" },
  { href: "/merchant", label: "Merchant" },
];

const CLUSTER_LABEL = { devnet: "Devnet", localnet: "Localnet", mainnet: "Mainnet", custom: "Custom RPC" };

/** App navigation in the landing page's layout: mark left, a segmented page switch centered, wallet right. */
export function TopBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:h-16 md:grid-cols-[1fr_auto_1fr] md:py-0">
        <Link href="/" className="flex items-center gap-2 justify-self-start rounded-full text-body font-semibold tracking-tight text-ink">
          <Mark />
          Anuma
        </Link>
        <nav aria-label="Main" className="order-last col-span-2 flex justify-center md:order-none md:col-span-1">
          <div className="flex rounded-full bg-surface-2 p-1 ring-1 ring-line">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-1.5 text-small font-medium transition-colors duration-150 ${
                    active ? "bg-bg text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex items-center gap-3 justify-self-end">
          <span className="hidden items-center gap-1.5 text-caption font-medium text-muted sm:inline-flex">
            <span aria-hidden className="size-1.5 rounded-full bg-positive" />
            {CLUSTER_LABEL[CLUSTER]}
          </span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
