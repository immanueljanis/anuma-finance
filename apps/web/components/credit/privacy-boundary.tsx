import { Globe, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { shortKey } from "@/lib/format";
import { Address, Panel } from "../ui";

function Group({ icon, title, caption, rows }: { icon: ReactNode; title: string; caption: string; rows: [string, ReactNode][] }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-small font-semibold text-ink">
        {icon}
        {title}
      </h3>
      <dl className="mt-3 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-small text-ink-2">{label}</dt>
            <dd className="text-right text-small text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-caption text-muted">{caption}</p>
    </div>
  );
}

const quiet = (text: string) => <span className="text-muted">{text}</span>;

/**
 * The privacy boundary with this user's real values: what any Solana observer can read, and what
 * never leaves the user and the issuer.
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
  return (
    <Panel title="Who sees what" description="Lenders check the proof, not your papers.">
      <div className="flex flex-col gap-6">
        <Group
          icon={<Globe aria-hidden className="size-4 text-muted" />}
          title="Visible on Solana"
          caption="Anyone can read these. None of them points to you."
          rows={[
            ["Pseudonym wallet", pseudonym ? <Address value={pseudonym} head={4} tail={4} /> : quiet("Made when you open")],
            ["Limit, debt, due time", quiet("Public")],
            ["Nullifier", nullifierHex ? <span className="font-mono">{shortKey(nullifierHex, 6, 4)}</span> : quiet("Same for every wallet")],
          ]}
        />
        <Group
          icon={<Lock aria-hidden className="size-4 text-muted" />}
          title="Only you"
          caption={`Never on chain. The proof hides you among ${memberCount ?? "all"} verified ${memberCount === 1 ? "person" : "people"}.`}
          rows={[
            ["Main wallet", walletAddress ? <span className="font-mono">{shortKey(walletAddress, 4, 4)}</span> : quiet("Not connected")],
            ["ID number", quiet("Issuer only, hashed")],
            ["Which member you are", quiet("Hidden")],
          ]}
        />
      </div>
    </Panel>
  );
}
