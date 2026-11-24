#!/usr/bin/env bash
# Valida a API do Hermes da homologação por túnel SSH, sem abrir portas.
# Escrito pelo Claude em 24/11/2026.
#
# Uso (no Mac):
#   HERMES_VPS_HOST=<ip> HERMES_VPS_HOSTNAME=<hostname> ops/hermes-vps/validar-tunel.sh
# O endereço da VPS não fica no Git (repositório público).
# Variáveis opcionais: HERMES_VPS_KEY, HERMES_LOCAL_PORT.
#
# A API_SERVER_KEY é lida da VPS para uma variável e nunca é impressa.
set -uo pipefail

HOST="${HERMES_VPS_HOST:?defina HERMES_VPS_HOST com o IP da VPS de homologação}"
KEYFILE="${HERMES_VPS_KEY:-$HOME/.ssh/id_ed25519}"
LPORT="${HERMES_LOCAL_PORT:-18642}"
EXPECT_HOSTNAME="${HERMES_VPS_HOSTNAME:?defina HERMES_VPS_HOSTNAME com o hostname esperado da VPS}"
SSHO=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15
      -o IdentitiesOnly=yes -i "$KEYFILE")
WORK="$(mktemp -d)"
SOCK="$WORK/t.sock"
FAIL=0

cleanup() {
  ssh "${SSHO[@]}" -S "$SOCK" -O exit "root@$HOST" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

check() { # descrição, obtido, esperado
  if [ "$2" = "$3" ]; then printf 'passou   %-52s %s\n' "$1" "$2"
  else printf 'FALHOU   %-52s obtido=%s esperado=%s\n' "$1" "$2" "$3"; FAIL=1; fi
}

REMOTE_NAME="$(ssh "${SSHO[@]}" "root@$HOST" hostname 2>/dev/null)"
check "identidade da VPS" "$REMOTE_NAME" "$EXPECT_HOSTNAME"
[ "$REMOTE_NAME" = "$EXPECT_HOSTNAME" ] || exit 1

if nc -z -w 5 "$HOST" 8642 >/dev/null 2>&1; then EXT=aberta; else EXT=fechada; fi
check "porta 8642 pelo IP público" "$EXT" "fechada"

BIND="$(ssh "${SSHO[@]}" "root@$HOST" "ss -H -tln | awk '\$4 ~ /:8642\$/ {print \$4}'" | tr '\n' ' ' | sed 's/ $//')"
check "endereço de escuta da API" "$BIND" "127.0.0.1:8642"

OWNER="$(ssh "${SSHO[@]}" "root@$HOST" "ps -o user= -p \$(ss -H -tlnp | grep ':8642 ' | sed -E 's/.*pid=([0-9]+).*/\1/' | head -1)" | tr -d ' ')"
check "dono do processo" "$OWNER" "hermes"

ssh "${SSHO[@]}" -f -N -M -S "$SOCK" -o ExitOnForwardFailure=yes \
    -L "127.0.0.1:$LPORT:127.0.0.1:8642" "root@$HOST" || { echo "FALHOU   abrir túnel"; exit 1; }

KEY="$(ssh "${SSHO[@]}" "root@$HOST" "grep -E '^API_SERVER_KEY=' /home/hermes/.hermes/.env | cut -d= -f2-")"
[ -n "$KEY" ] || { echo "FALHOU   ler a chave da API na VPS"; exit 1; }

B="http://127.0.0.1:$LPORT"
code() { curl -s -o "$WORK/resp.json" -w '%{http_code}' --max-time 20 "$@"; }

check "GET /health sem credencial"            "$(code "$B/health")" 200
check "GET /v1/models sem credencial"         "$(code "$B/v1/models")" 401
check "GET /v1/models com chave errada"       "$(code -H 'Authorization: Bearer chave-errada-de-teste' "$B/v1/models")" 401
check "GET /v1/models com a chave"            "$(code -H "Authorization: Bearer $KEY" "$B/v1/models")" 200
check "GET /v1/toolsets sem credencial"       "$(code "$B/v1/toolsets")" 401
check "GET /v1/toolsets com a chave"          "$(code -H "Authorization: Bearer $KEY" "$B/v1/toolsets")" 200
ENABLED="$(python3 -I -c '
import json, sys
data = json.load(open(sys.argv[1])).get("data", [])
print(sum(1 for t in data if t.get("enabled")), "de", len(data))
' "$WORK/resp.json" 2>/dev/null)"
check "toolsets nativos habilitados" "${ENABLED%% *}" 0
printf '         (%s toolsets nativos habilitados)\n' "$ENABLED"
VERSION="$(code "$B/health" >/dev/null; python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1])).get("version"))' "$WORK/resp.json" 2>/dev/null)"
check "versão do Hermes" "$VERSION" "0.23.1"
unset KEY

if [ "$FAIL" = 0 ]; then echo "RESULTADO: passou"; else echo "RESULTADO: falhou"; fi
exit "$FAIL"
