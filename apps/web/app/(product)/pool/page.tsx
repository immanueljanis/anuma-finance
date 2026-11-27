import type { Metadata } from "next";
import { PoolApp } from "@/components/pool/pool-app";

export const metadata: Metadata = { title: "Lending pool · Anuma" };

export default function PoolPage() {
  return <PoolApp />;
}
