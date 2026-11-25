#!/usr/bin/env bash
# Compila o app apontando só para a HOMOLOGAÇÃO, serve em 127.0.0.1:4173 e roda
# teste-login-local.mjs num navegador sem interface. Nada é publicado.
# Escrito pelo Claude em 24/11/2026.
#
# Uso (na raiz do repositório, com `bun install` já feito):
#   ops/frontend-homologacao/rodar-teste-login-local.sh
#
# Precisa, fora do Git, em ~/.medstation-homolog (modo 700):
#   staging-anon-key, staging-user-password
# Opcional: PW_DIR=<pasta com node_modules/playwright-core e pw-browsers>,
#           OUT_DIR=<onde gravar capturas e relatorio.json>, SKIP_BUILD=1
set -euo pipefail

STAGING_REF="qcvvwbbeuvawgccstyro"
PRODUCTION_REF="rwiovxyftfbkvzbepfqi"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS="${MEDSTATION_HOMOLOG_DIR:-$HOME/.medstation-homolog}"
PORT=4173
for f in staging-anon-key staging-user-password; do
  [ -s "$SECRETS/$f" ] || { echo "bloqueado: falta $SECRETS/$f"; exit 2; }
done

cd "$ROOT"
# As variáveis do processo têm prioridade sobre o .env versionado (que aponta
# para a produção). As de analytics ficam vazias de propósito.
export VITE_SUPABASE_URL="https://$STAGING_REF.supabase.co"
export VITE_SUPABASE_PROJECT_ID="$STAGING_REF"
export VITE_SUPABASE_PUBLISHABLE_KEY="$(cat "$SECRETS/staging-anon-key")"
export VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY=""
export VITE_LOVABLE_CONNECTOR_POSTHOG_PROJECT_ID=""

if [ -z "${SKIP_BUILD:-}" ]; then
  rm -rf dist
  bun run build >/dev/null
fi
if grep -rlq "$PRODUCTION_REF" dist; then
  echo "abortando: o pacote compilado contém o ref de produção"; exit 1
fi
grep -rlq "$STAGING_REF" dist || { echo "abortando: o pacote não aponta para a homologação"; exit 1; }
echo "pacote: $(git rev-parse --short HEAD), aponta para $STAGING_REF, sem ref de produção"

if [ -n "${PW_DIR:-}" ]; then
  WORK="$PW_DIR"
else
  WORK="$(mktemp -d)"
  (cd "$WORK" && npm init -y >/dev/null 2>&1 &&
    npm install --silent --no-audit --no-fund playwright-core@1 &&
    PLAYWRIGHT_BROWSERS_PATH="$WORK/pw-browsers" npx --no-install playwright-core install chromium-headless-shell >/dev/null)
fi

bunx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >/dev/null 2>&1 &
PREVIEW_PID=$!
cleanup() { kill "$PREVIEW_PID" 2>/dev/null || true; [ -n "${PW_DIR:-}" ] || rm -rf "$WORK"; }
trap cleanup EXIT
for _ in $(seq 1 40); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 0.5
done

PLAYWRIGHT_BROWSERS_PATH="$WORK/pw-browsers" \
PLAYWRIGHT_ENTRY="$WORK/node_modules/playwright-core/index.mjs" \
APP_URL="http://127.0.0.1:$PORT" \
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/medstation-teste-login}" \
  node "$ROOT/ops/frontend-homologacao/teste-login-local.mjs"
