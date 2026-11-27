"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AtSign, CircleCheck, LoaderCircle, ReceiptText, Server, Ticket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { fetchGroup } from "@/lib/anuma/browser";
import { formatClock, formatUsdc } from "@/lib/format";
import { encodeTransferRequest, findReference, validateTransfer } from "@/lib/solana-pay";
import { Address, Button, CopyButton, Notice, Panel } from "../ui";

const MERCHANT = process.env.NEXT_PUBLIC_MERCHANT_OWNER ?? "";

type Item = { id: string; name: string; detail: string; amount: bigint; icon: LucideIcon };

const ITEMS: Item[] = [
  { id: "domain", name: "anuma.sol domain", detail: "1 year registration", amount: 12_000_000n, icon: AtSign },
  { id: "ticket", name: "Side-event ticket", detail: "Builders night, 50 seats", amount: 18_000_000n, icon: Ticket },
  { id: "rpc", name: "RPC plan", detail: "1 month, 10M requests", amount: 24_000_000n, icon: Server },
];

type Invoice = { item: Item; reference: string; url: string; createdAt: number };
type Watch = { reference: string; state: "waiting" } | { reference: string; state: "paid"; signature: string } | { reference: string; state: "invalid"; error: string };

/**
 * A demo merchant that accepts Solana Pay and knows nothing about Anuma. It issues a standard
 * transfer request and finds the payment by its reference key, exactly as any Solana Pay
 * point of sale would.
 */
export function MerchantApp() {
  const { connection } = useConnection();
  const [mint, setMint] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [selected, setSelected] = useState(ITEMS[1].id);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null);
  const [watch, setWatch] = useState<Watch | null>(null);
  const [sales, setSales] = useState<{ item: Item; signature: string; at: number }[]>([]);

  useEffect(() => {
    let live = true;
    fetchGroup().then(
      (group) => live && setMint(group.usdcMint),
      (error) => live && setMintError(error instanceof Error ? error.message : String(error)),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!invoice) return;
    let live = true;
    QRCode.toString(invoice.url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#16211b", light: "#ffffff" } }).then(
      (svg) => live && setQr({ url: invoice.url, svg }),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [invoice]);

  useEffect(() => {
    if (!invoice || !mint) return;
    const reference = new PublicKey(invoice.reference);
    let live = true;
    let done = false;
    const check = async () => {
      if (done) return;
      const signature = await findReference(connection, reference).catch(() => null);
      if (!signature || !live || done) return;
      done = true;
      try {
        await validateTransfer(connection, signature, { recipient: new PublicKey(MERCHANT), splToken: new PublicKey(mint), amount: invoice.item.amount });
        if (!live) return;
        setWatch({ reference: invoice.reference, state: "paid", signature });
        setSales((list) => [{ item: invoice.item, signature, at: Math.floor(Date.now() / 1000) }, ...list]);
      } catch (error) {
        if (live) setWatch({ reference: invoice.reference, state: "invalid", error: error instanceof Error ? error.message : String(error) });
      }
    };
    const timer = setInterval(() => void check(), 2000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [connection, invoice, mint]);

  const status = invoice && watch?.reference === invoice.reference ? watch : invoice ? ({ reference: invoice.reference, state: "waiting" } as const) : null;

  const createInvoice = () => {
    if (!mint) return;
    const item = ITEMS.find((i) => i.id === selected) ?? ITEMS[0];
    const reference = Keypair.generate().publicKey;
    const url = encodeTransferRequest(
      { recipient: new PublicKey(MERCHANT), amount: item.amount, splToken: new PublicKey(mint), references: [reference], label: "Corner Store", message: item.name },
      6,
    );
    setWatch(null);
    setInvoice({ item, reference: reference.toBase58(), url, createdAt: Math.floor(Date.now() / 1000) });
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-[46rem]">
        <p className="text-small font-medium text-muted">Demo merchant</p>
        <h1 className="mt-1 text-heading font-semibold tracking-tight text-ink">Corner Store</h1>
        <p className="mt-2 text-lead text-ink-2">
          A shop that accepts Solana Pay and has never heard of Anuma. It issues a standard invoice and checks the payment by its reference key.
        </p>
      </header>

      {mintError && (
        <Notice tone="danger" title="Cannot load the token mint">
          {mintError}
        </Notice>
      )}
      {!MERCHANT && <Notice tone="warn">NEXT_PUBLIC_MERCHANT_OWNER is not set, so this shop has no address to receive payments.</Notice>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <Panel title="Choose an item" description="Prices in mock USDC.">
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Item</legend>
            {ITEMS.map((item) => {
              const Icon = item.icon;
              const checked = item.id === selected;
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-control border p-4 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                    checked ? "border-primary bg-primary-soft" : "border-line hover:bg-surface"
                  }`}
                >
                  <input type="radio" name="item" value={item.id} checked={checked} onChange={() => setSelected(item.id)} className="sr-only" />
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-control ${checked ? "bg-primary text-on-primary" : "bg-surface-2 text-ink-2"}`}>
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{item.name}</span>
                    <span className="block text-small text-muted">{item.detail}</span>
                  </span>
                  <span className="text-right">
                    <span className="font-semibold tabular text-ink">{formatUsdc(item.amount)}</span>
                    <span className="ml-1 text-small text-muted">mUSDC</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="mt-5">
            <Button size="lg" icon={<ReceiptText aria-hidden className="size-4" />} disabled={!mint || !MERCHANT} onClick={createInvoice}>
              Create Solana Pay invoice
            </Button>
          </div>
        </Panel>

        <section aria-labelledby="invoice-title" aria-live="polite" className="rounded-panel border border-line bg-bg p-5">
          <h2 id="invoice-title" className="text-body font-semibold text-ink">
            Invoice
          </h2>
          {!invoice || !status ? (
            <p className="mt-2 text-small text-muted">Pick an item and create an invoice. Its QR code and payment link appear here.</p>
          ) : status.state === "paid" ? (
            <div className="mt-4 flex animate-fade-up flex-col items-start gap-3">
              <CircleCheck aria-hidden className="size-10 text-primary" />
              <p className="text-title font-semibold text-ink">
                Paid {formatUsdc(invoice.item.amount)} <span className="text-body font-normal text-muted">mUSDC</span>
              </p>
              <p className="text-small text-ink-2">
                {invoice.item.name}. The payment arrived from the Anuma vault. The shop never learns who the buyer is.
              </p>
              <Address value={status.signature} kind="tx" head={6} tail={6} />
              <Button variant="secondary" onClick={() => setInvoice(null)}>
                New invoice
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-ink">{invoice.item.name}</p>
                <p>
                  <span className="text-title font-semibold tabular text-ink">{formatUsdc(invoice.item.amount)}</span>
                  <span className="ml-1 text-small text-muted">mUSDC</span>
                </p>
              </div>
              <div className="mx-auto w-full max-w-60 rounded-control border border-line bg-bg p-4">
                {qr?.url === invoice.url ? (
                  <div role="img" aria-label="Solana Pay QR code" className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr.svg }} />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded bg-surface-2" />
                )}
              </div>
              <div className="flex items-center gap-2 rounded-control bg-surface px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-caption text-ink-2" title={invoice.url}>
                  {invoice.url}
                </span>
                <CopyButton value={invoice.url} label="Copy payment link" />
              </div>
              {status.state === "invalid" ? (
                <Notice tone="danger" title="Payment did not match the invoice">
                  {status.error}
                </Notice>
              ) : (
                <p className="flex items-start gap-2 text-small text-ink-2">
                  <LoaderCircle aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin-slow text-muted" />
                  <span>
                    Waiting for payment. Paste the link on the{" "}
                    <Link href="/app" target="_blank" className="font-medium text-primary underline-offset-2 hover:underline">
                      Credit page
                    </Link>
                    .
                  </span>
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {sales.length > 0 && (
        <Panel title="Sales this session">
          <ol className="-my-2 divide-y divide-line">
            {sales.map((sale) => (
              <li key={sale.signature} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-small text-ink">
                  {sale.item.name} <span className="text-muted tabular">· {formatClock(sale.at)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-small font-medium tabular text-ink">{formatUsdc(sale.item.amount)} mUSDC</span>
                  <Address value={sale.signature} kind="tx" head={4} tail={4} />
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
