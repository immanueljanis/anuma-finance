import { Globe, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { shortKey } from "@/lib/format";
import { Address } from "../ui";

type Row = { label: string; value?: ReactNode; note: string };

function Column({ icon, title, rows, tone }: { icon: ReactNode; title: string; rows: Row[]; tone: "public" | "private" }) {
  return (
    <div className={`rounded-control p-4 ${tone === "public" ? "bg-surface" : "border border-primary-line bg-primary-soft"}`}>
      <h3 className="flex items-center gap-2 text-small font-semibold text-ink">
        {icon}
        {title}
      </h3>
      <dl className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="flex flex-wrap items-center justify-between gap-x-2 text-small font-medium text-ink">
              {row.label}
              {row.value && <span className="text-small font-normal">{row.value}</span>}
            </dt>
            <dd className="mt-0.5 text-caption text-ink-2">{row.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The privacy boundary, stated with this user's real values: what any Solana observer can read,
 * and what never leaves the user and the issuer.
 */
export function PrivacyBoundary({
  pseudonym,
  nullifierHex,
  walletAddress,
  memberCount,
}: {
  pseudonym?: string;
  nullifierHex?: string;
  walletAddress?: string | null;
  memberCount?: number;
}) {
  const crowd = memberCount ? `${memberCount} verified ${memberCount === 1 ? "person" : "people"}` : "every verified person";
  return (
    <section aria-labelledby="privacy-title" className="rounded-panel border border-line bg-bg p-5">
      <h2 id="privacy-title" className="text-body font-semibold text-ink">
        Who can see what
      </h2>
      <p className="mt-1 text-small text-muted">A lender checks the proof, not your papers.</p>
      <div className="mt-4 grid gap-3">
        <Column
          tone="public"
          icon={<Globe aria-hidden className="size-4 text-ink-2" />}
          title="Public on Solana"
          rows={[
            {
              label: "Pseudonym wallet",
              value: pseudonym ? <Address value={pseudonym} head={4} tail={4} /> : undefined,
              note: "A fresh key made for this line. It holds no SOL and has no history.",
            },
            { label: "Limit, debt and due time", note: "So lenders can price the pool and anyone can flag a default." },
            {
              label: "Nullifier",
              value: nullifierHex ? <span className="font-mono text-caption text-ink-2">{shortKey(nullifierHex, 6, 4)}</span> : undefined,
              note: "A one-way tag of the person. Every wallet you try produces the same tag, so one person gets one line.",
            },
          ]}
        />
        <Column
          tone="private"
          icon={<Lock aria-hidden className="size-4 text-primary" />}
          title="Known only to you"
          rows={[
            {
              label: "Your main wallet",
              value: walletAddress ? <span className="font-mono text-caption text-ink-2">{shortKey(walletAddress, 4, 4)}</span> : undefined,
              note: "Signs the one-time verification only. It never appears in a credit transaction.",
            },
            { label: "Your ID number", note: "Seen by the issuer once. The chain stores a keyed hash that cannot be reversed." },
            { label: "Which member you are", note: `The zero-knowledge proof hides you among ${crowd}.` },
          ]}
        />
      </div>
    </section>
  );
}
