import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { TopBar } from "@/components/top-bar";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anuma: private credit on Solana",
  description:
    "Verify once, then borrow from a fresh wallet with a zero-knowledge proof. Lenders know a verified person owns the line, never which person.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <TopBar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
