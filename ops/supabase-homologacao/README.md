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

Plano: [`plano/001_grants_tabelas_legadas.sql`](plano/001_grants_tabelas_legadas.sql),
com reversão em
[`plano/001_grants_tabelas_legadas.rollback.sql`](plano/001_grants_tabelas_legadas.rollback.sql).

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

1. **Conferir a produção, somente leitura.** O Artur roda no SQL Editor da
   produção e compara com a lista do item 1:

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

2. **Aplicar `plano/001_grants_tabelas_legadas.sql` só na homologação.**
   Reversão: o arquivo `.rollback.sql` ao lado.
3. **Decidir o item 2** com o resultado do passo 1 e, se for o caso, escrever
   um `002_*.sql` com reversão própria.
4. **Repetir a verificação:** `inventario-esquema.py . --sql` e o teste de
   login com leitura de `profiles` (em `../RESULTADOS-2026-11-24.md`).
5. **Não** recriar os agendamentos (item 3) nem a fila de e-mail (item 4) sem
   uma decisão explícita: os dois ligam envio real.

## Função `ai-core-hermes-sandbox`

Está publicada, mas responde `404 not_found` até com o admin fictício: o
portão da função exige quatro variáveis, e elas não estão definidas (ou não
batem). Valores, nenhum sigiloso:

| Variável | Valor |
|---|---|
| `AI_CORE_ENVIRONMENT` | `staging` |
| `AI_CORE_HERMES_SANDBOX_ENABLED` | `true` |
| `AI_CORE_STAGING_PROJECT_REF` | `qcvvwbbeuvawgccstyro` |
| `AI_CORE_PRODUCTION_PROJECT_REF` | `rwiovxyftfbkvzbepfqi` |

Onde: painel do Supabase → projeto de homologação → Edge Functions → Secrets.
Para desfazer, apagar as quatro; a função volta a responder 404.

## Contas fictícias criadas

| E-mail | Papel | Para quê |
|---|---|---|
| `homolog-admin@example.com` | `admin` | JWT para a ponte do Hermes |
| `homolog-medico@example.com` | nenhum | teste de login e de RLS |

Foram inseridas direto em `auth.users`/`auth.identities` com hash bcrypt, sem
passar pelo fluxo de cadastro, para que nenhum e-mail de confirmação saísse.
As senhas são aleatórias e ficam só no Mac, em `~/.medstation-homolog/` (modo
700), fora do Git. Para apagar as contas, ver o fim de
[`../hermes-vps/README.md`](../hermes-vps/README.md).
