#!/usr/bin/env bash
# Roda teste-local-grants.mjs num Postgres em memória (PGlite), instalado numa
# pasta temporária. Não usa rede além do registro npm e não toca banco remoto.
# Escrito pelo Claude em 24/11/2026.
#
# Uso: ops/supabase-homologacao/verificacao/rodar-teste-local.sh
# Opcional: PGLITE_DIR=<pasta com node_modules/@electric-sql/pglite já instalado>
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PGLITE_VERSION="0.6.0"

if [ -n "${PGLITE_DIR:-}" ]; then
  WORK="$PGLITE_DIR"
else
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  (cd "$WORK" && npm init -y >/dev/null 2>&1 &&
    npm install --silent --no-audit --no-fund "@electric-sql/pglite@$PGLITE_VERSION")
fi

ENTRY="$WORK/node_modules/@electric-sql/pglite/dist/index.js"
[ -f "$ENTRY" ] || { echo "PGlite não encontrado em $ENTRY"; exit 2; }
PGLITE_ENTRY="$ENTRY" node "$HERE/teste-local-grants.mjs"
