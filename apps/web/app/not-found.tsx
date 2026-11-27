import Link from "next/link";
import { Mark } from "@/components/mark";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Mark className="size-10" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">This page does not exist</h1>
      <p className="mt-2 text-body text-ink-2">The link may be old, or the address has a typo.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/app" className="rounded-full bg-primary px-5 py-2.5 text-small font-medium text-on-primary transition-colors hover:bg-primary-hover">
          Open the app
        </Link>
        <Link href="/" className="rounded-full bg-bg px-5 py-2.5 text-small font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-2">
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
