# Resultados da homologação — 24/11/2026

> Escrito pelo Claude. Só dados fictícios. Nenhum e-mail ou WhatsApp real,
> nenhuma cobrança, nenhuma chamada à produção, à Lovable ou ao Stripe.
> Este arquivo junta a primeira rodada (instalação e inspeção), a segunda
> (diagnóstico, planos e testes locais) e a terceira (fase 1 de privilégios
> aplicada, com autorização do Artur).

## Identificação

| | |
|---|---|
| Repositório / PR | `medneeds/medstation`, PR #24 (rascunho), empilhado no PR #20 |
| Branch | `homolog/hermes-vps-20261124` |
| Base (ponta do PR #20) | `3494a8c5ab657ba078915f03d435f1d81d507552` |
| Código do app testado | o da base; este PR só acrescenta arquivos em `ops/` |
| Supabase | somente `qcvvwbbeuvawgccstyro` (homologação) |

## Resultado por fluxo

| Fluxo | Resultado | Em uma linha |
|---|---|---|
| Login — autenticação | **passou** | e-mail e senha funcionam, pela API e pela tela do app rodando localmente |
| Login — ler o próprio perfil | **passou** (rodada 3) | fase 1 aplicada na homologação; a conta lê só a própria linha e anônimo não lê nenhuma |
| Hermes — API e descoberta da ferramenta | **passou** | autenticação, loopback e 1 ferramenta descoberta |
| Hermes — ponte → função da homologação | **bloqueado** | a função está publicada, mas a trava de ambiente responde 404; repetido na rodada 3, igual |
| Hermes — ponta a ponta com inferência | **não executado** | sem credencial de modelo; depende do item anterior |
| Frontend local apontando para a homologação | **passou** | carrega, autentica e não toca a produção |
| Stripe Sandbox — checkout | **bloqueado** | sem credencial de teste, sem funções publicadas e com IDs do modo real fixos no código |
| Stripe — testes locais sem credencial | **passou** (teste local) | regras de cobrança e assinatura do webhook; não é checkout validado |

## 1. Hermes

| Verificação | Resultado | Evidência |
|---|---|---|
| Função publicada na homologação | passou | `ai-core-hermes-sandbox` v1, ativa, `verify_jwt` ligado; mesma lógica do repositório |
| Origem do 404 | trava de ambiente | corpo `{"error":"not_found"}` + `Cache-Control: no-store` + `x-deno-execution-id`; rota ausente responde `{"code":"NOT_FOUND",…}` sem execução |
| Presença das quatro `AI_CORE_*` | **não verificável** | não tenho acesso de leitura aos secrets das Edge Functions; a trava fechada mostra que ao menos uma condição falha |
| Nível A: API pelo túnel SSH | passou | `validar-tunel.sh`: 401 sem chave e com chave errada, 200 com a chave, 0 de 26 toolsets nativos, 8642 fechada pelo IP público |
| Nível A: descoberta MCP | passou | `hermes mcp test medstation_sandbox`: conectado, 1 ferramenta |
| Nível B: ponte → função | bloqueado | `validar-ponte-homologacao.sh`: `staging_workflow_only: false`, função 404 |
| Nível C: com inferência | não executado | nenhum provedor de modelo configurado no Hermes |

A, B e C não se substituem: só C é ponta a ponta. Pré-requisitos de C em
`hermes-vps/README.md`. Caminho e campos das quatro variáveis em
`supabase-homologacao/README.md`.

## 2. Login e permissões

| Verificação | Resultado | Evidência |
|---|---|---|
| Login por senha (duas contas fictícias) | passou | `POST /auth/v1/token` → 200, emissor da homologação; senha errada → 400 |
| Gatilhos de cadastro | passou | 1 linha por conta em `profiles`, `user_onboarding`, `user_access` |
| Ler o próprio perfil | **falhou** | `GET /rest/v1/profiles` → 403, 42501 |
| Anônimo não lê `profiles` | passou | 401, 42501 |
| Causa | privilégio | ACL de `profiles`: `authenticated=Dxtm` (sem leitura); a política por usuário existe |
| Menor correção | escrita, não aplicada | `plano/001_grant_select_profiles.sql`: `grant select on public.profiles to authenticated;` |
| Teste da correção em banco local descartável | passou, 21 de 21 | própria linha sim; linha de outro não; anônimo não; reversão devolve a ACL exata |

### Rodada 3: fase 1 aplicada

Antes de aplicar, conferido na própria conexão:

| Condição | Resultado |
|---|---|
| A conexão SQL é a da homologação | sim — uma sessão criada pelo endereço `qcvvwbbeuvawgccstyro.supabase.co` apareceu nessa conexão; só existem as 2 contas fictícias e os 7 lotes |
| RLS ativa em `public.profiles` | sim |
| Políticas que valem para leitura | 1: "Users can view own profile", só `authenticated`, `auth.uid() = id`; nenhuma política `ALL` |
| `authenticated` ainda sem `SELECT` | sim — nem na tabela, nem em coluna |
| `authenticated`/`anon` com BYPASSRLS ou papel herdado | não |

Aplicado: só `grant select on public.profiles to authenticated;`
(`plano/001_grant_select_profiles.sql`), por execução direta, sem registro em
`schema_migrations`.

| Verificação | Resultado | Evidência |
|---|---|---|
| ACL de `profiles` | como previsto | `authenticated=rDxtm`; `anon` e `service_role` seguem `Dxtm` |
| Escrita em `profiles` para `authenticated` | continua negada | incluir, alterar e excluir: sem privilégio |
| Outras 17 tabelas antigas | inalteradas | as 17 com a ACL de antes |
| Conta fictícia lê a própria linha | passou | HTTP 200, 1 linha, o próprio id |
| Conta fictícia não lê a de outra conta | passou | HTTP 200, 0 linhas; sem filtro, só a própria |
| Anônimo não lê nenhuma | passou | HTTP 401, 42501 |
| Login pela tela local | passou | `GET /rest/v1/profiles` → 200 (3 vezes); 0 requisições à produção |

Nada foi revertido: a checagem de isolamento passou.

Erros que continuam na tela depois do login:

| Chamada | Status | Motivo |
|---|---|---|
| `GET /rest/v1/notifications` | 403 | privilégio — fase 2, não autorizada |
| `POST /functions/v1/check-subscription` | 404 | função não publicada |
| `POST /functions/v1/device-check` | 404 | função não publicada; o app libera o acesso mesmo assim |
| `POST /functions/v1/send-first-welcome` | 404 | função não publicada; nenhum e-mail sai |

## 3. Frontend local

| Verificação | Resultado |
|---|---|
| Pacote sem o ref de produção | passou — 0 arquivos |
| Tela de login e login com a conta fictícia | passou — `POST /auth/v1/token` → 200 na homologação |
| Tela depois do login | passou — abre `/onboarding` |
| Requisições à produção | 0 |
| Chamadas que falham | `profiles` e `notifications` 403 (privilégio); `device-check`, `check-subscription`, `send-first-welcome` 404 (não publicadas) |
| Botão do Google | não testado — depende do intermediário de OAuth da Lovable |

Detalhes, dependências da Lovable e lista do preview em `frontend-homologacao/README.md`.

## 4. Stripe Sandbox

Checkout, retorno, webhook e direito de acesso estão mapeados em
`stripe-sandbox/README.md`, com funções e variáveis mínimas.

| Verificação | Resultado |
|---|---|
| Checkout em sandbox | bloqueado — não tentado |
| Regras de cobrança (Vitest, 9 arquivos) | passou, 90 de 90 — teste local |
| Assinatura do webhook com segredo fictício | passou, 5 de 5 — teste local |

Achado que pesa na decisão: dentro do `stripe-webhook`, o bônus do Arsenal
Med chama um serviço externo real e usa um endereço fixo do Supabase de
produção, sem variável para desligar.

## Comandos reproduzíveis

```bash
# Hermes (pedem HERMES_VPS_HOST e HERMES_VPS_HOSTNAME)
ops/hermes-vps/validar-tunel.sh
ops/hermes-vps/validar-ponte-homologacao.sh

# Permissões
ops/supabase-homologacao/verificacao/rodar-teste-local.sh          # banco local em memória
ops/supabase-homologacao/verificacao/verificar-perfil-homologacao.sh  # API da homologação
python3 ops/supabase-homologacao/inventario-esquema.py . --json

# Frontend
bun install --frozen-lockfile
ops/frontend-homologacao/rodar-teste-login-local.sh

# Stripe (local, sem credencial)
ops/stripe-sandbox/rodar-teste-local-webhook.sh

# Testes do repositório
NODE_OPTIONS=--no-webstorage bunx vitest run        # 673 de 673
node --test hermes-bridge/server.test.mjs hermes-bridge/full-integration.test.mjs hermes-bridge/verify-hermes.test.mjs
node hermes-bridge/preflight.mjs
```

`NODE_OPTIONS=--no-webstorage` só é necessário no Node 26 do Mac: sem ele,
18 testes de 3 arquivos falham porque o Node define um `localStorage` próprio.
O CI do PR #20 não é afetado.

## O que mudou na homologação

| Quando | O quê |
|---|---|
| Rodada 1 | 2 contas fictícias em `auth.users`/`auth.identities`; 1 papel `admin` em `user_roles`; pelos gatilhos, 2 linhas em `profiles`, `user_onboarding`, `user_access` e 2 notificações internas em `admin_notifications` |
| Rodadas 1 a 3 | sessões de login das contas fictícias em `auth.sessions` |
| Rodada 3 | `grant select on public.profiles to authenticated;` — ACL de `profiles` passou de `authenticated=Dxtm` para `authenticated=rDxtm` |

## O que não mudou na homologação

- Migrações: continuam 7, a última `20261124031240`. O único SQL de alteração
  executado foi o `GRANT` da fase 1.
- Esquema: 69 tabelas e 145 políticas em `public`, como antes.
- Privilégios: fora o `SELECT` da fase 1 em `profiles`, nada mudou; as outras
  17 tabelas antigas seguem sem privilégio de dados. A fase 2 não foi executada.
- Edge Functions: só `ai-core-hermes-sandbox` v1; nenhuma publicação.
- Secrets: nenhum criado ou alterado.
- Configuração de autenticação: intocada.
- `page_views`, `active_sessions`, `trusted_devices`: 0 linhas.

## O que não mudou na VPS

Nada foi instalado ou alterado nesta rodada. O serviço roda desde
24/11/2026 21:35:40 UTC, sem reinícios, no commit `3b4215785882`. Os hashes de
`authorized_keys` e `sshd_config` são os da inspeção inicial, o firewall segue
como estava, os pacotes do sistema continuam 571 e o `.env` do Hermes não tem
JWT nem chave de provedor de modelo.

## Reversão

| O quê | Como | Estado |
|---|---|---|
| Fase 1 dos privilégios (**aplicada**) | `plano/001_grant_select_profiles.rollback.sql` — `revoke select on public.profiles from authenticated;` | testada no banco local; não foi preciso usar |
| Fase 2 dos privilégios | `plano/002_…rollback.sql` — mesmas listas da concessão, por papel e tabela; não mexe no que é da fase 1 | testada no banco local |
| Variáveis `AI_CORE_*` | apagar as quatro no painel | não se aplica ainda |
| Contas fictícias | `delete from auth.users where email in (…)` | não executada |
| Hermes na VPS | passos em `hermes-vps/README.md` | não executada |
| Este PR | fechar sem merge; só acrescenta `ops/` | — |

## Produção intocada: evidência

- **Supabase:** todas as chamadas ao conector nesta sessão levaram o
  identificador da homologação (18 de 18); nenhuma levou o de produção.
  Conferido no registro de chamadas da própria sessão.
- **Rede:** nenhum comando teve o endereço da produção como destino.
- **Frontend:** o pacote compilado não contém o ref de produção, e o
  navegador do teste só podia falar com `127.0.0.1` e com a homologação;
  tentativas à produção: 0.
- **Scripts:** os que recebem um projeto abortam se o ref de homologação for
  igual ao de produção; o ref de produção aparece só como trava.
- **Stripe:** nenhuma chamada nesta rodada. Na primeira, uma única chamada
  listou as contas conectadas (só existe a de modo real) e parou aí.
- **Lovable, DNS, hospedagem:** nenhuma chamada, nenhum projeto criado.

O que essa evidência não cobre: não tenho como ler registros de acesso da
produção para provar, do lado de lá, que nada chegou.

## Não verificado

- Tipos, defaults, constraints e expressões de política do banco (só nomes),
  fora de `profiles`.
- Privilégios reais da produção.
- Login pelo Google e fluxos de e-mail (cadastro, redefinição de senha).
- A remoção da instalação na VPS.

## Menor decisão que depende do Artur

Duas ações independentes, cada uma destrava um fluxo:

1. ~~Autorizar a fase 1~~ — feita na rodada 3.
2. **Gravar as quatro `AI_CORE_*`** no painel da homologação. Destrava o
   nível B do Hermes. Não tenho acesso de leitura nem de escrita a esses
   secrets; é o próximo bloqueio.

O que vem depois, em ordem de custo: consulta de privilégios na produção
(para a fase 2); credencial de modelo com limite (nível C); sandbox do Stripe
e as decisões de código do `stripe-sandbox/README.md`; hospedagem do preview.
