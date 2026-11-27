import type { ReactNode } from "react";

/** The product pages share one centered column; the landing page at / lays out its own full-bleed sections. */
export default function ProductLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-24 sm:px-6">{children}</div>;
}
