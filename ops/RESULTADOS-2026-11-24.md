# Resultados da homologação — 24/11/2026

> Escrito pelo Claude. Só dados fictícios. Nenhum e-mail real, nenhuma cobrança
> e nenhuma chamada à produção ou ao Stripe em modo real.

## Resumo

| Teste | Resultado | Em uma linha |
|---|---|---|
| 1. Login de homologação | **passou** na autenticação; **falhou** na leitura de dados | o login funciona, mas o usuário logado não lê o próprio perfil (privilégios) |
| 2. Chamada de ponta a ponta ao Hermes | **bloqueado** no último trecho | Hermes, autenticação e ponte MCP passaram; a função da homologação está desligada |
| 3. Checkout no Stripe Sandbox | **bloqueado** | não há credencial de teste configurada; só existe a conta em modo real |

## 1. Login de homologação

| Verificação | Resultado | Evidência |
|---|---|---|
| Login por senha, médico fictício | passou | `POST /auth/v1/token?grant_type=password` → 200, `role=authenticated`, emissor `qcvvwbbeuvawgccstyro` |
| Login por senha, admin fictício | passou | idem → 200 |
| Senha errada | passou | 400 `invalid_credentials` |
| Gatilhos de cadastro | passou | cada conta ganhou 1 linha em `profiles`, `user_onboarding` e `user_access` (teste de 7 dias, origem `signup`) |
| Isolamento por usuário | passou | o médico vê só a própria linha de `user_access`, nenhum papel e nada em `audit_log` |
| Papel de administrador | passou | `is_staff` → `true` para o admin; `user_roles` mostra `admin` |
| Sem login | passou | só com a chave pública, `profiles` → 42501 |
| Leitura do próprio perfil | **falhou** | `GET /rest/v1/profiles` → `42501 permission denied`; o mesmo em `notes`, `patients`, `conversations`, `cases` |
| Login pela tela do aplicativo | não executado | não há front publicado para a homologação e `device-check`/`device-verify` não existem lá |

Causa da falha e plano: `supabase-homologacao/README.md`, divergência 1.

## 2. Chamada de ponta a ponta ao Hermes

| Trecho | Resultado | Evidência |
|---|---|---|
| Hermes instalado na versão esperada | passou | `hermes --version` → v0.23.1, checkout `3b421578…`; `/health` → `"version": "0.23.1"` |
| Serviço só em loopback, usuário sem privilégios | passou | escuta em `127.0.0.1:8642`, processo do usuário `hermes`; 8642 fechada pelo IP público |
| Autenticação da API, pelo túnel SSH | passou | `/v1/models` e `/v1/toolsets`: 401 sem chave, 401 com chave errada, 200 com a chave |
| Nenhuma ferramenta nativa exposta | passou | `/v1/toolsets`: 0 de 26 toolsets habilitados |
| Hermes ↔ ponte MCP da MedStation | passou | `hermes mcp test medstation_sandbox` → conectado, 1 ferramenta: `medstation_simulate_admission` |
| Ponte sem configuração recusa a rede | passou | `preflight.mjs` (offline) → 3 de 3 |
| Ponte → função `ai-core-hermes-sandbox` | **bloqueado** | a função responde `404 not_found` ao admin fictício; `preflight.mjs --staging` → `staging_workflow_only: false` |
| Hermes decide chamar a ferramenta (inferência) | **bloqueado** | nenhum provedor de modelo configurado; não havia credencial de teste |

O que destrava o penúltimo trecho: as quatro variáveis `AI_CORE_*` na
homologação (tabela em `supabase-homologacao/README.md`). Depois, rodar
`ops/hermes-vps/validar-ponte-homologacao.sh`.

## 3. Checkout no Stripe Sandbox

**Bloqueado, não tentado.**

- A única conta Stripe conectada é `medneeds.com.br` em modo real. Não foi usada.
- A homologação não tem `create-checkout`, `guest-checkout` nem
  `stripe-webhook` publicadas.
- Não há chave de teste (`sk_test_…`) nem segredo de webhook de teste
  configurados em lugar nenhum a que eu tenha acesso.

## Testes locais do repositório (ponta do PR #20)

| Comando | Resultado |
|---|---|
| `bun install --frozen-lockfile` | passou |
| `bunx vitest run` | 673 de 673 com `NODE_OPTIONS=--no-webstorage`; **18 falham** no Node 26 do Mac sem essa opção |
| `node --test hermes-bridge/*.test.mjs` | 13 de 13 |
| `node hermes-bridge/preflight.mjs` | 3 de 3 |
| `bun run build` com as variáveis da homologação | passou; o pacote aponta para `qcvvwbbeuvawgccstyro` e não contém o ref de produção |

As 18 falhas são dos arquivos `consent`, `meta-pixel-pageview` e
`shared-device-session`: o Node 26 define um `localStorage` global próprio, que
fica no lugar do simulado. O CI do PR não é afetado (passou em 19/11/2026).

## Não verificado

- Tipos, defaults, constraints e expressões de política do banco (só nomes).
- Privilégios reais da produção (não consultada).
- Qualquer fluxo que dependa de Edge Function além da sandbox.
- A remoção da instalação: os passos estão escritos, mas não foram executados.
