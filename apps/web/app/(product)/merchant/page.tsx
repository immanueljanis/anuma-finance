import type { Metadata } from "next";
import { MerchantApp } from "@/components/merchant/merchant-app";

export const metadata: Metadata = { title: "Corner Store · demo merchant" };

export default function MerchantPage() {
  return <MerchantApp />;
}
