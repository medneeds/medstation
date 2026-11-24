# Hermes na VPS de homologação

> Escrito pelo Claude em 24/11/2026. Os comandos abaixo são os que foram
> executados na VPS nesse dia, salvo onde está marcado **não executado**.

## Contrato que a MedStation espera

Fonte: `.github/workflows/hermes.yml`, `hermes-bridge/` e
`docs/medstation-ai-core-phase4..8` (PR #20).

| Item | Valor |
|---|---|
| Hermes | `NousResearch/hermes-agent` **v0.23.1**, commit `3b421578588243f920886e6fe79a6faa87ea026e` |
| Python | 3.14 (o instalador traz o seu; não usa o do sistema) |
| Ponte MCP | `hermes-bridge/server.mjs`, stdio, Node ≥ 22, sem dependências |
| Ferramenta exposta | só `medstation_simulate_admission` (`requestId` no formato `synthetic_*`) |
| Destino da ponte | `https://<ref-homologação>.supabase.co/functions/v1/ai-core-hermes-sandbox` |
| Credenciais da ponte | JWT de admin da homologação (curta duração) + chave pública do projeto |

## Estado instalado

| Item | Valor |
|---|---|
| Usuário | `hermes` (uid 999), de sistema, senha bloqueada, shell `nologin`, sem sudo |
| Código do Hermes | `/home/hermes/.hermes/hermes-agent` (checkout no commit fixado) |
| Dados e configuração | `/home/hermes/.hermes/` (`config.yaml` 644, `.env` 600) |
| Ponte da MedStation | `/home/hermes/medstation/hermes-bridge` (PR #20, commit `3494a8c5`) |
| Serviço | `hermes-gateway.service`, unidade **de usuário** do systemd, com *linger* |
| Portas | `127.0.0.1:8642` (API) e uma porta interna efêmera em `127.0.0.1`; nada em `0.0.0.0` |
| Autenticação | `Authorization: Bearer <API_SERVER_KEY>`; a chave foi gerada na VPS e nunca saiu de lá em texto |
| Modelo de IA | nenhum configurado; o Hermes não faz inferência |
| Ferramentas nativas | todas desligadas para a API e para a CLI |

Não foram alterados: firewall, `authorized_keys`, `sshd_config`, autenticação
por senha e pacotes do sistema (a `libatomic1`, único pré-requisito de sistema
do instalador, já estava presente).

## Como foi instalado

Procedimento oficial: "Non-Sudo / System Service User Installs" em
`website/docs/getting-started/installation.md` do Hermes, com as opções
`--commit`, `--non-interactive`, `--skip-browser` e `--skip-computer-use` do
próprio `scripts/install.sh`.

O instalador usado é o **do commit fixado**, não o que o site serve hoje (o do
site já é de uma versão mais nova). O SHA-256 foi conferido antes de rodar.

```bash
# como root
useradd --system --create-home --home-dir /home/hermes \
        --shell /usr/sbin/nologin --user-group hermes
chmod 750 /home/hermes

# como hermes (runuser -u hermes -- env -i HOME=/home/hermes ... bash -c '...')
PIN=3b421578588243f920886e6fe79a6faa87ea026e
mkdir -p ~/bootstrap
curl -fsSL "https://raw.githubusercontent.com/NousResearch/hermes-agent/$PIN/scripts/install.sh" \
     -o ~/bootstrap/install.sh
echo "abf338605dae6dd28d101673ac6aed7995c955745db46d47676bc591a7957209  $HOME/bootstrap/install.sh" \
  | sha256sum -c -
bash ~/bootstrap/install.sh --commit "$PIN" --non-interactive \
     --skip-browser --skip-computer-use
```

Depois, ainda como `hermes`:

```bash
# ponte da MedStation, só a pasta necessária, no commit do PR #20
git clone --depth 1 --filter=blob:none --sparse \
    --branch feat/medstation-ai-core-sync-20261115 \
    https://github.com/medneeds/medstation.git ~/medstation
git -C ~/medstation sparse-checkout set hermes-bridge
test "$(git -C ~/medstation rev-parse HEAD)" = 3494a8c5ab657ba078915f03d435f1d81d507552

# cópias para reversão
cp -p ~/.hermes/config.yaml ~/.hermes/config.yaml.pre-medstation
cp -p ~/.hermes/.env        ~/.hermes/.env.pre-medstation
```

Configuração:

- em `~/.hermes/config.yaml`: o trecho de
  [`config.medstation.yaml`](config.medstation.yaml);
- em `~/.hermes/.env` (modo 600): as variáveis de
  [`env.example`](env.example). A `API_SERVER_KEY` saiu de
  `openssl rand -hex 32`, gravada direto no arquivo.

Serviço (procedimento oficial para máquina sem login interativo, em
`website/docs/user-guide/messaging/index.md`):

```bash
loginctl enable-linger hermes          # como root
hermes gateway install --no-start-now  # como hermes, com XDG_RUNTIME_DIR=/run/user/999
hermes gateway start
```

## Como validar

Do Mac, sem abrir porta nenhuma:

```bash
export HERMES_VPS_HOST=<ip da VPS> HERMES_VPS_HOSTNAME=<hostname da VPS>
ops/hermes-vps/validar-tunel.sh              # API pelo túnel SSH
ops/hermes-vps/validar-ponte-homologacao.sh  # ponte -> função da homologação
```

O endereço da VPS fica fora do Git porque este repositório é público.

O primeiro confere: `/health` responde; rotas `/v1/*` recusam sem chave e com
chave errada; aceitam com a chave; nenhuma ferramenta nativa está habilitada; a
porta 8642 não responde pelo IP público.

O segundo faz login com o admin fictício, entrega o JWT ao processo da ponte
só em memória e roda `hermes-bridge/preflight.mjs --staging`. Ele só passa
depois que as quatro variáveis da função forem definidas na homologação (ver
[`../supabase-homologacao/README.md`](../supabase-homologacao/README.md#função-ai-core-hermes-sandbox)).

Na própria VPS:

```bash
hermes mcp list
hermes mcp test medstation_sandbox   # conecta e descobre 1 ferramenta
```

## Três níveis de teste, que não se confundem

| Nível | O que prova | Estado em 24/11/2026 |
|---|---|---|
| A. API e descoberta | o Hermes responde com autenticação e enxerga a ferramenta da ponte | passou (`validar-tunel.sh`, `hermes mcp test`) |
| B. Ponte → função | a ponte chama a função da homologação e recebe a simulação | **bloqueado**: a função responde 404 pela trava de ambiente |
| C. Com inferência | um modelo, dentro do Hermes, decide chamar a ferramenta e a chamada chega à função | **não executado**: falta credencial de modelo e depende de B |

Só C é "ponta a ponta". A e B, sozinhos ou juntos, não são.

### Pré-requisitos do nível C (nada disto foi feito)

1. **Nível B passando** (as quatro variáveis `AI_CORE_*` na homologação).
2. **Credencial de teste de um provedor de modelo, autorizada pelo Artur e com
   limite de gasto definido no próprio provedor.** Ela vai só para
   `/home/hermes/.hermes/.env` (modo 600), por entrada padrão, sem passar por
   chat, Git ou log. O Hermes hoje não tem provedor nenhum configurado.
3. **Modelo e teto de passos:** `hermes config set model.default <modelo>` e
   um `agent.max_turns` baixo (ex.: 4), para a conversa de teste não se alongar.
4. **JWT do admin fictício disponível para o serviço.** Hoje ele só é entregue
   em memória ao teste do nível B; o processo da ponte que o serviço mantém
   não o recebe. Para o nível C é preciso gravar `MEDSTATION_STAGING_JWT` no
   `.env` (vale 1 hora), reiniciar o serviço e apagar a linha ao fim.
5. **A chamada:** `POST /v1/chat/completions` pelo túnel SSH, pedindo a
   simulação com `requestId` `synthetic_e2e_001`.
6. **Critério para dizer "passou":** a resposta traz o resultado da ferramenta
   com `environment: "synthetic-staging"` e as duas etapas simuladas
   (`clinicus`, `examinus`); o log da função na homologação mostra a invocação
   com 200 no mesmo instante; e um pedido com `requestId` fora do padrão
   `synthetic_*` é recusado.

## Limites desta instalação

- **Sem modelo de IA.** Uma conversa em `/v1/chat/completions` não tem como
  rodar. Para o teste "o Hermes decide chamar a ferramenta", falta uma
  credencial de teste de um provedor, com limite de gasto.
- **A ponte recebe o JWT por variável de ambiente.** O JWT de admin dura 1 hora
  e não é gravado no `.env`; o serviço em execução fica sem ele e a ferramenta
  responde `sandbox_not_configured`. É o comportamento seguro por padrão.
- **`trust: untrusted` + `readOnlyHint`.** A ferramenta se declara somente
  leitura, então o Hermes não pede aprovação para chamá-la.
- **Raiz do repositório no checkout da ponte.** O `sparse-checkout` em modo
  cone traz também os arquivos da raiz do repositório (públicos). Só
  `hermes-bridge/` é usado.
- **Atualização.** `updates.check` ficou no padrão (aviso passivo). Não rodar
  `hermes update`: ele sairia da versão que a MedStation valida no CI.

## Como remover tudo (**não executado**)

```bash
# como root na VPS
UIDH=$(id -u hermes)
runuser -u hermes -- env XDG_RUNTIME_DIR=/run/user/$UIDH \
    systemctl --user disable --now hermes-gateway.service
loginctl disable-linger hermes
loginctl terminate-user hermes 2>/dev/null || true
pkill -u hermes 2>/dev/null || true
userdel --remove hermes          # apaga /home/hermes (Hermes, ponte, .env, logs)
rm -rf /run/user/$UIDH 2>/dev/null || true

# conferência
id hermes                         # deve dizer "no such user"
ss -tlnp | grep -E ':8642|hermes' # não deve listar nada
ls /var/lib/systemd/linger/       # não deve listar hermes
```

Isso devolve a VPS ao estado da inspeção de 24/11/2026: nenhum pacote de
sistema foi instalado, nenhuma unidade foi criada em `/etc/systemd/system` e
nada fora de `/home/hermes` foi escrito, além da entrada do usuário em
`/etc/passwd`, `/etc/group` e `/etc/shadow` e do marcador de *linger*.

Para voltar só a configuração, mantendo o Hermes:

```bash
# como hermes
cp -p ~/.hermes/config.yaml.pre-medstation ~/.hermes/config.yaml
cp -p ~/.hermes/.env.pre-medstation        ~/.hermes/.env
systemctl --user restart hermes-gateway.service
```

Na homologação do Supabase, para apagar as duas contas fictícias:

```sql
delete from auth.users
 where email in ('homolog-admin@example.com', 'homolog-medico@example.com');
```

(perfil, onboarding, acesso e papel saem junto, por chave estrangeira).
