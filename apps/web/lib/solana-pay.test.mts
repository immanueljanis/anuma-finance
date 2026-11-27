import assert from "node:assert/strict";
import { test } from "node:test";
import { Keypair } from "@solana/web3.js";
import { encodeTransferRequest, formatUnits, parseTransferRequest, parseUnits } from "./solana-pay.ts";

const key = () => Keypair.generate().publicKey;

test("decimal amounts convert to base units and back", () => {
  assert.equal(parseUnits("18", 6), 18_000_000n);
  assert.equal(parseUnits("18.5", 6), 18_500_000n);
  assert.equal(parseUnits("0.000001", 6), 1n);
  assert.equal(formatUnits(18_500_000n, 6), "18.5");
  assert.equal(formatUnits(18_000_000n, 6), "18");
  assert.throws(() => parseUnits("1.0000001", 6), /decimal places/);
  assert.throws(() => parseUnits("1e3", 6), /plain decimal/);
});

test("a transfer request survives encode and parse, including spaces in label and message", () => {
  const request = {
    recipient: key(),
    amount: 18_000_000n,
    splToken: key(),
    references: [key(), key()],
    label: "Corner Store",
    message: "Side-event ticket #42",
  };
  const url = encodeTransferRequest(request, 6);
  assert.match(url, /^solana:[1-9A-HJ-NP-Za-km-z]+\?amount=18&spl-token=/);
  assert.ok(!url.includes("+"), "spaces are percent-encoded as the spec requires");
  const parsed = parseTransferRequest(url, 6);
  assert.equal(parsed.recipient.toBase58(), request.recipient.toBase58());
  assert.equal(parsed.amount, request.amount);
  assert.equal(parsed.splToken.toBase58(), request.splToken.toBase58());
  assert.deepEqual(parsed.references.map(String), request.references.map(String));
  assert.equal(parsed.label, request.label);
  assert.equal(parsed.message, request.message);
});

test("parse rejects links Anuma cannot pay", () => {
  assert.throws(() => parseTransferRequest("https://example.com", 6), /starts with solana:/);
  assert.throws(() => parseTransferRequest(`solana:${key()}?amount=1`, 6), /not for a token payment/);
  assert.throws(() => parseTransferRequest(`solana:${key()}?spl-token=${key()}`, 6), /no amount/);
  assert.throws(() => parseTransferRequest(`solana:nope?amount=1&spl-token=${key()}`, 6), /Recipient is not a valid/);
});
