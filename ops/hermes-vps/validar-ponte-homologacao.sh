#!/usr/bin/env bash
# Chamada de ponta a ponta: ponte MCP na VPS -> função ai-core-hermes-sandbox
# no Supabase de homologação, com o admin fictício. Escrito pelo Claude em
# 24/11/2026.
#
# Uso (no Mac):
#   HERMES_VPS_HOST=<ip> HERMES_VPS_HOSTNAME=<hostname> \
#     ops/hermes-vps/validar-ponte-homologacao.sh
# O endereço da VPS não fica no Git (repositório público).
#
# Precisa, fora do Git, na pasta ~/.medstation-homolog (modo 700):
#   staging-anon-key        chave pública do projeto de homologação
#   staging-admin-password  senha da conta fictícia homolog-admin@example.com
#
# O JWT (1 hora) vai para o processo da ponte só em memória: não é impresso
# nem gravado em disco na VPS.
set -uo pipefail

STAGING_REF="qcvvwbbeuvawgccstyro"
PRODUCTION_REF="rwiovxyftfbkvzbepfqi"
HOST="${HERMES_VPS_HOST:?defina HERMES_VPS_HOST com o IP da VPS de homologação}"
EXPECT_HOSTNAME="${HERMES_VPS_HOSTNAME:?defina HERMES_VPS_HOSTNAME com o hostname esperado da VPS}"
KEYFILE="${HERMES_VPS_KEY:-$HOME/.ssh/id_ed25519}"
SECRETS="${MEDSTATION_HOMOLOG_DIR:-$HOME/.medstation-homolog}"
ADMIN_EMAIL="homolog-admin@example.com"
SSHO=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15
      -o IdentitiesOnly=yes -i "$KEYFILE")

[ "$STAGING_REF" != "$PRODUCTION_REF" ] || { echo "refs iguais; abortando"; exit 2; }
for f in staging-anon-key staging-admin-password; do
  [ -s "$SECRETS/$f" ] || { echo "bloqueado: falta $SECRETS/$f"; exit 2; }
done

U="https://$STAGING_REF.supabase.co"
ANON="$(cat "$SECRETS/staging-anon-key")"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

HTTP="$(python3 -I -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": open(sys.argv[2]).read()}))' \
          "$ADMIN_EMAIL" "$SECRETS/staging-admin-password" \
        | curl -s --max-time 25 -o "$WORK/sess.json" -w '%{http_code}' -X POST \
               "$U/auth/v1/token?grant_type=password" \
               -H "apikey: $ANON" -H 'Content-Type: application/json' --data-binary @-)"
echo "login do admin fictício            -> HTTP $HTTP"
[ "$HTTP" = 200 ] || { echo "RESULTADO: falhou (login)"; exit 1; }
JWT="$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["access_token"])' "$WORK/sess.json")"

GATE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
          "$U/functions/v1/ai-core-hermes-sandbox" \
          -H "Authorization: Bearer $JWT" -H "apikey: $ANON" -H 'Content-Type: application/json' \
          -d '{"workflow":"admission-review","requestId":"synthetic_homolog_gate"}')"
echo "função sandbox, chamada direta     -> HTTP $GATE"
if [ "$GATE" = 404 ]; then
  echo "         404 = a função está desligada: faltam as variáveis AI_CORE_* na homologação"
fi

OUT="$( { printf 'JWT=%s\nEXPECT_HOSTNAME=%s\n' "$JWT" "$EXPECT_HOSTNAME"; cat <<'REMOTE'
set -uo pipefail
[ "$(hostname)" = "$EXPECT_HOSTNAME" ] || { echo '{"erro":"host inesperado"}'; exit 1; }
H=/home/hermes/.hermes
NODE="$(ls -d $H/tools/node-*/bin/node | head -1)"
set -a; . <(grep -E '^MEDSTATION_[A-Z_]+=' $H/.env); set +a
export MEDSTATION_STAGING_JWT="$JWT"; unset JWT
runuser -u hermes --preserve-environment -- env HOME=/home/hermes \
  "$NODE" /home/hermes/medstation/hermes-bridge/preflight.mjs --staging
REMOTE
} | ssh "${SSHO[@]}" "root@$HOST" 'bash -s' 2>&1)"
unset JWT

python3 -I -c '
import json, sys
try:
    report = json.loads(sys.argv[1])
except Exception:
    print("saída inesperada da ponte:", sys.argv[1][:200]); sys.exit(1)
ok = True
for c in report.get("checks", []):
    print(("passou   " if c["passed"] else "FALHOU   ") + "ponte: " + c["name"])
    ok = ok and c["passed"]
print("RESULTADO:", "passou" if ok else ("bloqueado (função desligada)" if sys.argv[2] == "404" else "falhou"))
sys.exit(0 if ok else 1)
' "$OUT" "$GATE"
