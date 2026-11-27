import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopBar } from "@/components/top-bar";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anuma: private credit on Solana",
  description:
    "Verify once, then borrow from a fresh wallet with a zero-knowledge proof. Lenders know a verified person owns the line, never which person.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <TopBar />
          <main className="mx-auto w-full max-w-[72rem] flex-1 px-4 pt-8 pb-20 sm:px-6 lg:px-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
