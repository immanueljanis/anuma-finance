import { BadgeCheck, CreditCard, Gavel, KeyRound, ReceiptText, RotateCcw, type LucideIcon } from "lucide-react";
import { formatClock } from "@/lib/format";
import { Address, Panel } from "../ui";
import type { Activity } from "./use-credit";

const ICON: Record<Activity["kind"], LucideIcon> = {
  register: BadgeCheck,
  open: KeyRound,
  pay: ReceiptText,
  repay: RotateCcw,
  faucet: CreditCard,
  default: Gavel,
};

/** Every transaction this browser sent for the identity, newest first, each with an explorer link. */
export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <Panel title="Activity">
      {items.length === 0 ? (
        <p className="text-small text-muted">Each step you take appears here as a transaction you can inspect.</p>
      ) : (
        <ol className="-my-1 flex flex-col">
          {items.map((item) => {
            const Icon = ICON[item.kind];
            return (
              <li key={item.signature} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-small font-medium text-ink">{item.label}</p>
                  <div className="flex flex-wrap items-center justify-between gap-x-3">
                    <span className="text-caption text-muted tabular">{formatClock(item.at)}</span>
                    <Address value={item.signature} kind="tx" head={4} tail={4} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
