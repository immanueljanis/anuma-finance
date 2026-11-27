import type { Metadata } from "next";
import { MerchantApp } from "@/components/merchant/merchant-app";

export const metadata: Metadata = { title: "Warung Anuma · demo merchant" };

export default function MerchantPage() {
  return <MerchantApp />;
}
