#!/usr/bin/env bash
# Builds and deploys the anuma program to devnet with the fixed program keypair, funds the server
# key (admin, issuer, relayer, mint authority) and refreshes the web app's IDL. Run inside WSL or
# Linux with Anchor CLI 1.1.2 and Solana CLI 3.1.x; the deploy wallet is the Solana CLI default
# keypair. Afterwards run apps/web/scripts/bootstrap.mts once against devnet.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${CARGO_TARGET_DIR:-$HOME/anuma-target}"
PROGRAM_ID="9k1zFVABWqqDQRJbfwQpucxWdbN7gJnTCbFFv5RL3nKd"
SERVER="Cc2wdHJLqnsBMUqtEsoAEbhksAtidWVjkhJbu7tcD7yT"
NEED_LAMPORTS=2700000000
SERVER_MIN_LAMPORTS=400000000

solana config set --url devnet >/dev/null
deployer="$(solana address)"
balance="$(solana balance --lamports | awk '{print $1}')"
if (( balance < NEED_LAMPORTS )); then
  echo "Deploy wallet ${deployer} holds $((balance / 1000000)) milli-SOL; it needs at least 2.7 SOL."
  echo "Fund it at https://faucet.solana.com (Devnet), then run this script again."
  exit 1
fi

keypair="${TARGET}/deploy/anuma-keypair.json"
if [[ ! -f "${keypair}" ]]; then
  echo "Missing ${keypair}. Copy .keys/anuma-program.json there so the program keeps ID ${PROGRAM_ID}."
  exit 1
fi
if [[ "$(solana-keygen pubkey "${keypair}")" != "${PROGRAM_ID}" ]]; then
  echo "${keypair} is not the keypair for ${PROGRAM_ID}."
  exit 1
fi

cd "${ROOT}"
CARGO_TARGET_DIR="${TARGET}" CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-3}" anchor build
solana program deploy --program-id "${keypair}" "${TARGET}/deploy/anuma.so"
cp "${TARGET}/idl/anuma.json" "${ROOT}/apps/web/lib/anuma/idl.json"

server_balance="$(solana balance "${SERVER}" --lamports | awk '{print $1}')"
if (( server_balance < SERVER_MIN_LAMPORTS )); then
  solana transfer "${SERVER}" 0.5 --allow-unfunded-recipient
fi

echo "Deployed ${PROGRAM_ID} to devnet. Server key ${SERVER} balance: $(solana balance "${SERVER}")."
echo "Next: cd apps/web && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bootstrap.mts"
