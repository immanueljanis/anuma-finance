"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LogOut, Wallet } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { shortKey } from "@/lib/format";
import { Button, CopyButton } from "./ui";

/**
 * Connect button in the app's own style. Connected, it shows the wallet address with a small menu
 * built on the native popover API, so it is keyboard and Escape friendly without a portal.
 */
export function WalletButton() {
  const { publicKey, wallet, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const popover = useRef<HTMLDivElement>(null);

  if (!publicKey) {
    return (
      <Button size="md" icon={<Wallet aria-hidden className="size-4" />} busy={connecting} busyLabel="Connecting" onClick={() => setVisible(true)}>
        Connect wallet
      </Button>
    );
  }

  const address = publicKey.toBase58();
  return (
    <>
      <button
        type="button"
        popoverTarget="wallet-menu"
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control whitespace-nowrap border border-line-strong bg-bg px-3 text-small font-medium text-ink transition-colors duration-150 [anchor-name:--wallet] hover:bg-surface"
      >
        {wallet?.adapter.icon && <Image src={wallet.adapter.icon} alt="" width={16} height={16} unoptimized className="size-4" />}
        <span className="font-mono tabular">{shortKey(address, 4, 4)}</span>
      </button>
      <div
        id="wallet-menu"
        ref={popover}
        popover="auto"
        className="wallet-menu w-72 rounded-panel border border-line bg-bg p-2 text-small shadow-[var(--shadow-raise)]"
      >
        <div className="px-3 py-2">
          <p className="text-caption text-muted">{wallet?.adapter.name ?? "Wallet"}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-small text-ink" title={address}>
              {shortKey(address, 8, 8)}
            </span>
            <CopyButton value={address} label="Copy wallet address" />
          </div>
          <p className="mt-2 text-caption text-muted">
            This wallet verifies you once. It never signs a credit transaction, so no loan links back to it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            popover.current?.hidePopover();
            void disconnect();
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-left font-medium text-ink-2 transition-colors duration-150 hover:bg-surface hover:text-ink"
        >
          <LogOut aria-hidden className="size-4" />
          Disconnect
        </button>
      </div>
    </>
  );
}
