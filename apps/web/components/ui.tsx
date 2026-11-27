"use client";

import { Check, CircleX, Copy, ExternalLink, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { explorerAddress, explorerTx } from "@/lib/anuma/browser";
import { shortKey } from "@/lib/format";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-line-strong disabled:text-bg",
  secondary: "bg-bg text-ink ring-1 ring-line-strong hover:bg-surface-2 active:bg-line disabled:text-muted disabled:hover:bg-bg",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-line disabled:text-muted",
  danger: "bg-danger-soft text-danger ring-1 ring-danger-line hover:ring-danger active:bg-bg disabled:opacity-60",
};

/**
 * The one button of the app, a pill like the landing page's. `busy` keeps the width, swaps the icon
 * for a spinner and shows `busyLabel`, so the user always reads what is happening.
 */
export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  busyLabel,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  busyLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed",
        size === "sm" && "h-8 px-3.5 text-caption whitespace-nowrap",
        size === "md" && "h-10 px-4.5 text-small",
        size === "lg" && "min-h-11 px-5.5 py-2 text-small",
        VARIANTS[variant],
        className,
      )}
    >
      {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin-slow" /> : icon}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </button>
  );
}

export type Tone = "neutral" | "primary" | "positive" | "warn" | "danger" | "info";

const PILL_TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-primary text-on-primary",
  positive: "bg-positive-soft text-positive",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

/** A status label. The dot repeats the tone; the text carries the meaning. */
export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium whitespace-nowrap", PILL_TONES[tone])}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

const NOTICE_TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-positive-soft text-positive",
  positive: "bg-positive-soft text-positive",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

const NOTICE_ICON = { info: Info, warn: TriangleAlert, danger: CircleX, primary: Check, positive: Check, neutral: Info };

/** An inline message inside the flow, never a modal. */
export function Notice({ tone = "info", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-2xl px-4 py-3.5 text-small", NOTICE_TONES[tone])}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-ink-2">
        {title && <p className="font-medium text-ink">{title}</p>}
        <div className="[overflow-wrap:anywhere]">{children}</div>
      </div>
    </div>
  );
}

/** Copies `value` and confirms in place for two seconds. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
    </button>
  );
}

/** A public key in mono with copy and explorer actions. */
export function Address({ value, kind = "address", head = 6, tail = 4 }: { value: string; kind?: "address" | "tx"; head?: number; tail?: number }) {
  const href = kind === "tx" ? explorerTx(value) : explorerAddress(value);
  return (
    <span className="inline-flex min-w-0 items-center gap-0.5">
      <span className="font-mono text-small whitespace-nowrap tabular text-ink" title={value}>
        {shortKey(value, head, tail)}
      </span>
      <CopyButton value={value} label={`Copy ${kind === "tx" ? "signature" : "address"}`} />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
        aria-label={`Open ${kind === "tx" ? "transaction" : "address"} in Solana Explorer`}
        title="Open in Solana Explorer"
      >
        <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </span>
  );
}

/** A white region of the page with an optional heading row. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-panel bg-bg shadow-[var(--shadow-raise)] ring-1 ring-line", className)}>
      {title && (
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            <h2 className="text-body font-semibold tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={title ? "px-6 pt-5 pb-6" : "p-6"}>{children}</div>
    </section>
  );
}

/** Label, control and hint or error, wired for screen readers. */
export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-caption text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-control bg-bg px-3.5 text-body text-ink ring-1 ring-line-strong placeholder:text-muted transition-shadow duration-150 hover:ring-ink-2/40 focus:ring-2 focus:ring-primary focus:outline-none aria-[invalid=true]:ring-danger disabled:bg-surface disabled:text-muted";

/** A short skeleton bar for loading values. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("inline-block animate-pulse rounded bg-surface-2", className)} />;
}
