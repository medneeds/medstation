#!/usr/bin/env bash
# Verifica, pela API da HOMOLOGAÇÃO, o acesso ao próprio perfil:
#   1. a conta fictícia lê a própria linha;
#   2. a conta fictícia não lê a linha de outro usuário;
#   3. anônimo não lê nenhuma.
# Só leitura (além da sessão criada pelo login). Escrito pelo Claude em 24/11/2026.
#
# Antes do plano 001 o item 1 falha com 42501; depois dele, os três passam.
#
# Uso: ops/supabase-homologacao/verificacao/verificar-perfil-homologacao.sh
# Precisa, fora do Git, em ~/.medstation-homolog (modo 700):
#   staging-anon-key, staging-user-password, staging-admin-password
set -uo pipefail

STAGING_REF="qcvvwbbeuvawgccstyro"
PRODUCTION_REF="rwiovxyftfbkvzbepfqi"
SECRETS="${MEDSTATION_HOMOLOG_DIR:-$HOME/.medstation-homolog}"
U="https://$STAGING_REF.supabase.co"
[ "$STAGING_REF" != "$PRODUCTION_REF" ] || { echo "refs iguais; abortando"; exit 2; }
for f in staging-anon-key staging-user-password staging-admin-password; do
  [ -s "$SECRETS/$f" ] || { echo "bloqueado: falta $SECRETS/$f"; exit 2; }
done
ANON="$(cat "$SECRETS/staging-anon-key")"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
FAIL=0

login() { # e-mail, arquivo de senha, saída
  python3 -I -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": open(sys.argv[2]).read()}))' "$1" "$2" |
    curl -s --max-time 25 -o "$3" -w '%{http_code}' -X POST "$U/auth/v1/token?grant_type=password" \
      -H "apikey: $ANON" -H 'Content-Type: application/json' --data-binary @-
}
field() { python3 -I -c 'import json,sys
d=json.load(open(sys.argv[1]))
for k in sys.argv[2].split("."): d=d[k]
print(d)' "$1" "$2"; }
get() { # token, caminho -> grava corpo, imprime status
  curl -s --max-time 25 -o "$WORK/body.json" -w '%{http_code}' \
    -H "apikey: $ANON" -H "Authorization: Bearer $1" "$U/rest/v1/$2"
}
summary() { python3 -I -c 'import json,sys
d=json.load(open(sys.argv[1]))
if isinstance(d, list): print("linhas=%d ids=%s" % (len(d), ",".join(sorted(r.get("id","?")[:8] for r in d))))
else: print("erro=%s" % d.get("code"))' "$WORK/body.json"; }
check() { # descrição, obtido, esperado
  if [ "$2" = "$3" ]; then printf 'passou   %-58s %s\n' "$1" "$2"
  else printf 'FALHOU   %-58s obtido: %s | esperado: %s\n' "$1" "$2" "$3"; FAIL=1; fi
}

[ "$(login homolog-medico@example.com "$SECRETS/staging-user-password" "$WORK/medico.json")" = 200 ] ||
  { echo "FALHOU   login do médico fictício"; exit 1; }
[ "$(login homolog-admin@example.com "$SECRETS/staging-admin-password" "$WORK/admin.json")" = 200 ] ||
  { echo "FALHOU   login do admin fictício"; exit 1; }
JM="$(field "$WORK/medico.json" access_token)"; IDM="$(field "$WORK/medico.json" user.id)"
IDA="$(field "$WORK/admin.json" user.id)"
echo "passou   login das duas contas fictícias (emissor: $STAGING_REF)"

COLS="id,full_name,gender,avatar_url,crm,crm_state,specialty,address,city,state"
S="$(get "$JM" "profiles?select=$COLS&id=eq.$IDM")"; R="$(summary)"
check "1. conta fictícia lê a própria linha" "HTTP $S $R" "HTTP 200 linhas=1 ids=${IDM:0:8}"
S="$(get "$JM" "profiles?select=id&id=eq.$IDA")"; R="$(summary)"
check "2. conta fictícia não lê a linha de outro usuário" "HTTP $S $R" "HTTP 200 linhas=0 ids="
S="$(get "$JM" "profiles?select=id")"; R="$(summary)"
check "2b. sem filtro, só a própria linha aparece" "HTTP $S $R" "HTTP 200 linhas=1 ids=${IDM:0:8}"
S="$(get "$ANON" "profiles?select=id")"; R="$(summary)"
check "3. anônimo não lê nenhuma linha" "HTTP $S $R" "HTTP 401 erro=42501"
unset JM

if [ "$FAIL" = 0 ]; then echo "RESULTADO: passou"; else echo "RESULTADO: falhou"; fi
exit "$FAIL"
