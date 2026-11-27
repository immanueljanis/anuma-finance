import type { Metadata } from "next";
import { CreditApp } from "@/components/credit/credit-app";

export const metadata: Metadata = { title: "Credit · Anuma" };

export default function CreditPage() {
  return <CreditApp />;
}
