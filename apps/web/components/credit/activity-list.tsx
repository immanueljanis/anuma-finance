import { formatClock } from "@/lib/format";
import { Address, Panel } from "../ui";
import type { Activity } from "./use-credit";

/** Every transaction this browser sent for the identity, each with an explorer link. */
export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <Panel title="Activity" description="Each step is a real transaction you can inspect.">
      {items.length === 0 ? (
        <p className="text-small text-muted">Transactions appear here with a link to Solana Explorer.</p>
      ) : (
        <ol className="-my-2 divide-y divide-line">
          {items.map((item) => (
            <li key={item.signature} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
              <div className="min-w-0">
                <p className="text-small font-medium text-ink">{item.label}</p>
                <p className="text-caption text-muted tabular">{formatClock(item.at)}</p>
              </div>
              <Address value={item.signature} kind="tx" head={5} tail={4} />
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
