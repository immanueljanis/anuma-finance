import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { TopBar } from "@/components/top-bar";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const title = "Anuma Finance: private credit on Solana";
const description =
  "Verify once, then borrow from a fresh wallet with a zero-knowledge proof. Lenders know a verified person owns the line, never which person.";

export const metadata: Metadata = {
  metadataBase: new URL("https://anuma-finance.vercel.app"),
  title,
  description,
  applicationName: "Anuma Finance",
  keywords: ["Anuma Finance", "Anuma", "Solana", "zero-knowledge", "Semaphore", "private credit", "BNPL", "Solana Pay"],
  openGraph: { type: "website", siteName: "Anuma Finance", title, description },
  twitter: { card: "summary", title, description },
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
