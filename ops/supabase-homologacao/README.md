# Supabase de homologação: o que foi conferido

> Escrito pelo Claude em 24/11/2026. Todas as consultas foram somente leitura
> e só no projeto de homologação. **Nenhuma migração foi aplicada.** A produção
> (`rwiovxyftfbkvzbepfqi`) não foi consultada.

## Identidade

| Campo | Valor |
|---|---|
| Projeto | `qcvvwbbeuvawgccstyro` — "MedStation Project" |
| Região / banco | `us-west-2`, Postgres 17.12 |
| Estado | `ACTIVE_HEALTHY`, criado em 24/11/2026 00:52 UTC |
| Edge Functions publicadas | só `ai-core-hermes-sandbox` (v1, `verify_jwt` ligado) |

## Os sete registros de migração

A homologação tem 7 registros em `supabase_migrations.schema_migrations`,
todos de 24/11/2026 entre 03:06 e 03:12 UTC, cada um com uma única instrução:

| Versão | Nome | Tamanho |
|---|---|---|
| 20261124030644 | `medstation_lote01_base` | 43 kB |
| 20261124030724 | `medstation_lote01b_pecas_criadas_pela_lovable` | 2,4 kB |
| 20261124030730 | `medstation_app_role_support` | 61 B |
| 20261124031010 | `medstation_lote02_admin_suporte_billing` | 45 kB |
| 20261124031210 | `medstation_lote03_stripe_cofre_prompteca_studio` | 37 kB |
| 20261124031232 | `medstation_email_send_state_lovable` | 653 B |
| 20261124031240 | `medstation_revoga_execucao_funcoes_de_trigger` | 287 B |

O repositório tem **85** arquivos de migração em dois lugares: 67 em
`supabase/migrations/` e 18 em `drizzle/migrations/` (iguais na `main` e no
PR #20). A diferença de contagem (7 contra 85) não é divergência: os lotes
condensam os arquivos. O que importa é o esquema resultante.

## Comparação do esquema

Método: `inventario-esquema.py` lê as 85 migrações sem executar nada e monta o
estado final esperado por nome; uma consulta somente leitura compara isso com o
catálogo da homologação.

| Objeto | Esperado pelo repositório | Na homologação | Faltando | A mais |
|---|---|---|---|---|
| Tabelas `public` | 64 | 69 | 0 | 5 |
| Colunas (das 64 tabelas) | 676 | 676 | 0 | 0 |
| Funções `public` | 31 | 32 | 0 | 1 |
| Políticas (`public` + `storage`) | 156 | 159 | 0 | 3 |
| Triggers (`public` + `auth.users`) | 51 | 51 | 0 | 0 |
| Índices nomeados | 92 | 92 | 0 | 0 |
| Tabelas em realtime | 3 | 3 | 0 | 0 |

**Nada do que o repositório define falta na homologação.**

O que existe a mais vem de peças que a Lovable criou fora do histórico do
repositório, e as migrações do repositório dependem delas:

- tabelas `user_roles`, `email_send_log`, `email_send_state`,
  `email_unsubscribe_tokens`, `suppressed_emails`;
- função `has_role` e o enum `app_role` (`admin`, `user`, `support`);
- três políticas de `user_roles`.

Corpo das funções: 26 das 31 são idênticas ao repositório. As outras 5
(`generate_document_number`, `generate_exam_request_number`,
`generate_prescription_number`, `link_one_time_purchases_on_signup`,
`save_note_version`) diferem só por comentários removidos; a lógica é a mesma.

Dados: 4 linhas de configuração (`feature_flags`, `referral_settings`,
`commercial_policy`, `email_send_state`) e as 2 contas fictícias criadas em
24/11/2026 para os testes.

### Não comparado

Tipos e defaults de coluna, constraints, expressões das políticas e o conteúdo
dos buckets. A homologação tem 4 buckets (`avatars` público; `evidences`,
`vault` e `round-audio` privados).

## Divergências

### 1. Privilégios das tabelas antigas (impede o app de funcionar)

18 tabelas criadas pelas migrações de 2025 **não têm nenhum privilégio de
dados** para `authenticated` nem para `service_role` na homologação:

`cases`, `conversations`, `courtesy_access`, `evidences`, `exam_requests`,
`medical_documents`, `messages`, `note_versions`, `notes`, `notifications`,
`patients`, `prescription_library`, `prescriptions`, `profiles`, `rate_limits`,
`referral_codes`, `referrals`, `security_events`.

Causa: essas migrações não trazem `GRANT` (confirmado no repositório) e contavam
com o padrão antigo do Supabase. No projeto novo, o padrão para objetos criados
pelo papel `postgres` não dá leitura nem escrita a `anon`, `authenticated` e
`service_role`.

Efeito medido: o médico fictício entra, mas `GET /rest/v1/profiles` responde
`42501 permission denied`. O mesmo acontece em `notes`, `patients`,
`conversations` e `cases`. Tabelas mais novas, que têm `GRANT` explícito nas
migrações (`user_access`, `user_onboarding`), respondem normalmente.

Estado medido das 18 tabelas antes da fase 1, idêntico em todas (hoje
`profiles` tem também leitura para `authenticated`; as outras 17 seguem assim):

```
{postgres=arwdDxtm/postgres, anon=Dxtm/postgres, authenticated=Dxtm/postgres, service_role=Dxtm/postgres}
```

(`a` incluir, `r` ler, `w` alterar, `d` excluir; `D` truncate, `x` references,
`t` trigger, `m` maintain.) Os três papéis têm só `Dxtm`. Nenhuma coluna tem
privilégio próprio.

O plano está em duas fases, cada uma com reversão simétrica (ver
[Plano](#plano-ordenado-e-reversível-nada-aplicado)).

### 2. Privilégios parciais em tabelas mais novas (a confirmar)

Nestas tabelas a homologação tem exatamente o que as migrações concedem, mas
as políticas preveem mais para administradores:

| Tabela | Políticas preveem | `authenticated` tem |
|---|---|---|
| `announcements` | ler, incluir, alterar, excluir | ler |
| `feature_flags` | ler, incluir, alterar, excluir | ler |
| `referral_settings` | ler, incluir, alterar, excluir | ler |
| `admin_notification_reads` | ler, incluir, alterar, excluir | ler, incluir, excluir |
| `page_views` | ler, incluir | incluir |
| `user_lifecycle_email_events` | ler | nada |

Em `user_roles` e `prompt_library_items` a restrição é intencional (as
migrações revogam a escrita ou a limitam a colunas) e não entra na lista.

Se o painel administrativo grava nessas tabelas pelo navegador na produção,
é porque a produção tem privilégios herdados que a homologação não tem. Não
incluí essas tabelas no plano: depende do que a produção realmente concede.

### 3. Agendamentos que apontam para a produção (ausência correta)

`drizzle/migrations/0010` e `0016` criam `pg_cron` + `pg_net` e dois jobs
(`black-recovery-reminders`, `whatsapp-recovery-run`) com a URL da
**produção** e a chave pública da produção escritas no SQL. Na homologação não
há `pg_cron`, `pg_net` nem jobs. Manter assim: se fossem recriados como estão,
a homologação chamaria funções da produção de hora em hora.

### 4. Fila de e-mail da Lovable ausente (ausência correta nesta etapa)

A migração `20260730121925` revoga permissões de `enqueue_email`,
`read_email_batch`, `delete_email`, `move_to_dlq`, `email_queue_wake` e
`email_queue_dispatch`, que não são criadas pelo repositório. Elas não existem
na homologação. Enquanto e-mails reais devem ficar desligados, isso é desejado.

### 5. Edge Functions

Só `ai-core-hermes-sandbox` está publicada. Login pelo aplicativo
(`device-check`, `device-verify`), checkout (`create-checkout`,
`guest-checkout`, `stripe-webhook`) e as demais funções não existem na
homologação.

### Avisos do Supabase (segurança)

- `intern_spots_taken` e `submit_intern_signup` são `SECURITY DEFINER` e
  executáveis por `anon` — esperado, é o formulário público da campanha.
- 13 funções `SECURITY DEFINER` executáveis por `authenticated`.
- 4 tabelas com RLS e sem política (`bird_webhook_events`, `email_send_state`,
  `email_unsubscribe_tokens`, `login_challenges`) — acesso só por service role.
- Nenhuma tabela `public` sem RLS; nenhuma função `SECURITY DEFINER` sem
  `search_path` fixo.

## Plano ordenado e reversível (nada aplicado)

### Fase 1 — a menor alteração: ler o próprio perfil

**Aplicada em 24/11/2026, com autorização do Artur.** As pré-condições (RLS
ativa, única política de leitura `auth.uid() = id`, `authenticated` sem
`SELECT`) foram conferidas na mesma conexão antes do `GRANT`. Depois dele, os
quatro itens de `verificar-perfil-homologacao.sh` passaram. Detalhes em
`../RESULTADOS-2026-11-24.md`.

| | |
|---|---|
| Arquivo | [`plano/001_grant_select_profiles.sql`](plano/001_grant_select_profiles.sql) |
| Conteúdo | `grant select on public.profiles to authenticated;` |
| Reversão | [`plano/001_grant_select_profiles.rollback.sql`](plano/001_grant_select_profiles.rollback.sql): `revoke select on public.profiles from authenticated;` |
| Antes | `authenticated=Dxtm` |
| Depois | `authenticated=rDxtm` |

Por que só isso: o caminho "login → primeira tela" foi mapeado no código e
medido com o app rodando localmente (`../frontend-homologacao/README.md`).
Das tabelas que esse caminho lê, só duas respondem 42501:

| Tabela | Quem lê | Privilégio hoje | Entra na fase 1? |
|---|---|---|---|
| `profiles` | `ProfileContext` (9 colunas, `id = usuário`) | nenhum antes; leitura depois da fase 1 | **sim** — é o pedido: ler o próprio perfil |
| `notifications` | sino do cabeçalho | nenhum | não — o app segue sem ela; fica na fase 2 |
| `user_onboarding` | `OnboardingContext` | ler, incluir, alterar | já funciona |
| `active_sessions` | `DeviceGuard` | ler | já funciona |
| `user_roles`, `announcements`, `legacy_trial_invites`, `studio_*` | primeira tela | ler | já funcionam |
| `page_views` | analytics das páginas públicas | incluir | já funciona |

A fase 1 não dá escrita em `profiles`, não dá nada a `anon` nem a
`service_role` e não toca outra tabela. O login em si não depende de tabela
nenhuma: é o serviço de autenticação.

### Fase 2 — o restante das 18 tabelas (fora desta rodada)

[`plano/002_grants_demais_tabelas_legadas.sql`](plano/002_grants_demais_tabelas_legadas.sql)
e a reversão ao lado. Revisado em relação à primeira versão:

- `service_role` recebe `select, insert, update, delete` listados um a um, sem
  `GRANT ALL`;
- a reversão repete exatamente as mesmas listas, por papel e por tabela, e não
  usa `REVOKE ALL`;
- o `SELECT` de `profiles` é da fase 1 e a reversão da fase 2 não o retira.

Sobre a primeira versão: ela dava `GRANT ALL` a `service_role` e revertia só
quatro privilégios. No catálogo de hoje o resultado coincidiria com o estado
anterior, porque os outros quatro (`Dxtm`) já existiam nas 18 tabelas. Numa
tabela sem esse padrão, sobraria `Dxtm` que não existia antes (reproduzido no
banco local). A versão atual não depende dessa coincidência.

Antes da fase 2, comparar com a produção. O Artur roda no SQL Editor da
**produção** (somente leitura) e compara com as listas do arquivo:

```sql
select table_name, grantee,
       string_agg(privilege_type, ',' order by privilege_type) as privilegios
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated', 'service_role')
   and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
 group by 1, 2
 order by 1, 2;
```

### Depois

- Decidir a divergência 2 com o resultado da consulta acima.
- **Não** recriar os agendamentos (divergência 3) nem a fila de e-mail
  (divergência 4) sem decisão explícita: os dois ligam envio real.

## Verificações

### Banco local descartável (executado: passou, 21 de 21)

```bash
ops/supabase-homologacao/verificacao/rodar-teste-local.sh
```

Sobe um Postgres em memória (PGlite 0.6.0), monta `profiles` com as mesmas
colunas, constraints e políticas lidas do catálogo da homologação, o mesmo
privilégio padrão (`Dxtm`) e as outras 17 tabelas em forma mínima. Aplica os
arquivos reais de `plano/` e confere:

- antes da fase 1, o usuário logado recebe 42501 (reproduz a falha de hoje);
- depois: a conta fictícia lê a própria linha; não lê a de outro usuário;
  sem filtro só vê a própria; anônimo recebe 42501; alteração e exclusão do
  perfil continuam negadas; nada muda para `service_role`;
- a ACL de `profiles` muda só em `authenticated` e nenhuma outra tabela muda;
- a reversão da fase 1 devolve a ACL exata do início;
- fase 2: nada para `anon`, leitura e escrita para `service_role`, conjuntos
  menores respeitados; reverter a fase 2 devolve o estado "só fase 1" e
  reverter a fase 1 em seguida devolve o estado inicial.

Limites: o motor local é Postgres 19 (a homologação é 17.12); os triggers de
`profiles` e o restante do Supabase não são reproduzidos.

### Pela API da homologação (para rodar depois de aplicar a fase 1)

```bash
ops/supabase-homologacao/verificacao/verificar-perfil-homologacao.sh
```

Executado duas vezes em 24/11/2026:

| Verificação | Antes da fase 1 | Depois da fase 1 |
|---|---|---|
| 1. conta fictícia lê a própria linha | falhou — HTTP 403, 42501 | passou — HTTP 200, 1 linha, o próprio id |
| 2. conta fictícia não lê a linha de outro usuário | HTTP 403, 42501 (negado pelo privilégio, não pela política) | passou — HTTP 200, 0 linhas |
| 2b. sem filtro, só a própria linha | HTTP 403, 42501 | passou — HTTP 200, 1 linha |
| 3. anônimo não lê nenhuma linha | passou — HTTP 401, 42501 | passou — HTTP 401, 42501 |

## Função `ai-core-hermes-sandbox`

**Está publicada** na homologação (v1, ativa, `verify_jwt` ligado). O código
publicado tem a mesma lógica do repositório (comentários removidos).

**O 404 vem da trava de ambiente, não de rota ausente.** As duas respostas são
diferentes e foram medidas lado a lado:

| Chamada | Status | Corpo | `x-deno-execution-id` |
|---|---|---|---|
| `ai-core-hermes-sandbox` (POST e GET) | 404 | `{"error":"not_found"}`, `Cache-Control: no-store` | presente: a função executou |
| função que não existe (ex.: `create-checkout`) | 404 | `{"code":"NOT_FOUND","message":"Requested function was not found"}` | ausente |
| `ai-core-hermes-sandbox` sem `Authorization` | 401 | `UNAUTHORIZED_NO_AUTH_HEADER` | — |

A primeira coisa que a função faz é `isSandboxEnabled(...)`; se falhar,
devolve exatamente `404 {"error":"not_found"}`.

Repetido na rodada 3 (depois da fase 1): mesmo 404 da trava.

**Em 24/11/2026 às 23:06 UTC a trava abriu:** a função respondeu 200 ao admin
fictício e `validar-ponte-homologacao.sh` passou. As medições abaixo são de
antes disso e ficam como registro de como distinguir os dois tipos de 404.

**Presença das quatro variáveis: não consegui ler.** O conector que uso não
lista os secrets das Edge Functions, e a CLI do Supabase no Mac não está
logada (além de estar com a assinatura do binário inválida). O que a trava
fechada prova é que pelo menos uma das condições abaixo não é atendida; não dá
para saber qual.

Para configurar — painel do Supabase, **projeto `qcvvwbbeuvawgccstyro`
("MedStation Project")** → **Edge Functions** → **Secrets**
(`https://supabase.com/dashboard/project/qcvvwbbeuvawgccstyro/functions/secrets`):

| Nome | Valor |
|---|---|
| `AI_CORE_ENVIRONMENT` | `staging` |
| `AI_CORE_HERMES_SANDBOX_ENABLED` | `true` |
| `AI_CORE_STAGING_PROJECT_REF` | `qcvvwbbeuvawgccstyro` |
| `AI_CORE_PRODUCTION_PROJECT_REF` | `rwiovxyftfbkvzbepfqi` |

Nenhum dos quatro é sigiloso. O que conferir no painel: que o projeto no topo
da página é o de homologação; que os quatro nomes existem exatamente como
acima (maiúsculas, sem espaço); e que os valores não têm espaço nem quebra de
linha no fim. Não alterei nada aqui: sem conseguir ler o estado anterior, não
havia como registrá-lo nem garantir a reversão. Não é preciso publicar a função de novo. Para
desfazer, apagar os quatro; a função volta a responder 404.

## Contas fictícias criadas

| E-mail | Papel | Para quê |
|---|---|---|
| `homolog-admin@example.com` | `admin` | JWT para a ponte do Hermes |
| `homolog-medico@example.com` | nenhum | teste de login e de RLS |

Foram inseridas direto em `auth.users`/`auth.identities` com hash bcrypt, sem
passar pelo fluxo de cadastro, para que nenhum e-mail de confirmação saísse.
Os gatilhos de cadastro criaram, para cada conta, uma linha em `profiles`,
`user_onboarding` e `user_access`, e uma notificação interna em
`admin_notifications` ("Novo usuário cadastrado"). As senhas são aleatórias e ficam só no Mac, em `~/.medstation-homolog/` (modo
700), fora do Git. Para apagar as contas, ver o fim de
[`../hermes-vps/README.md`](../hermes-vps/README.md).
