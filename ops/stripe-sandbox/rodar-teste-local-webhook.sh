#!/usr/bin/env bash
# Instala o pacote `stripe` numa pasta temporária e roda o teste local da
# assinatura do webhook. Não fala com o Stripe e não usa chave nenhuma.
# Escrito pelo Claude em 24/11/2026.
#
# Uso: ops/stripe-sandbox/rodar-teste-local-webhook.sh
# Opcional: STRIPE_DIR=<pasta com node_modules/stripe já instalado>
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
STRIPE_VERSION="18.5.0" # a mesma de supabase/functions/stripe-webhook/index.ts

if [ -n "${STRIPE_DIR:-}" ]; then
  WORK="$STRIPE_DIR"
else
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  (cd "$WORK" && npm init -y >/dev/null 2>&1 &&
    npm install --silent --no-audit --no-fund "stripe@$STRIPE_VERSION")
fi
ENTRY="$WORK/node_modules/stripe/esm/stripe.esm.node.js"
[ -f "$ENTRY" ] || { echo "pacote stripe não encontrado em $ENTRY"; exit 2; }
STRIPE_ENTRY="$ENTRY" node "$HERE/teste-local-assinatura-webhook.mjs"
