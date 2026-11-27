"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-unsafe-burner";
import { useMemo, type ReactNode } from "react";
import { PUBLIC_RPC } from "@/lib/anuma/browser";
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Wallet context for the whole app. Wallet Standard wallets (Phantom, Solflare, Backpack) register
 * themselves; the burner wallet is listed for devnet demos and automated browser checks, because
 * it signs without an extension.
 */
export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={PUBLIC_RPC} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
