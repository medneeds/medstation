# Pacote P0 — Conversão e Controle de Acesso

Pacote P0 publicado e migrations de entitlement/política comercial aplicadas em produção em 27/08/2026. Stripe não foi alterado diretamente durante o rollout.

## O que mudou

1. **Cadastro (`src/components/LeadForm.tsx`)** — "Continuar com Google" é a
   primeira opção do formulário. O fluxo por e-mail pede apenas nome completo e
   e-mail (passo 1) e senha (passo 2). Telefone e CRM/UF deixaram de bloquear o
   cadastro; o lead é gravado com `phone: ""` para compatibilidade com a coluna
   NOT NULL. UTM, `lead_created` e eventos de ciclo de vida permanecem intactos.
2. **Confirmação de e-mail (`src/pages/Auth.tsx`)** — removido o `signOut()` no
   retorno com `?confirmed=1`. Se o link devolver sessão válida, o usuário entra
   direto; sem sessão, apenas o toast de confirmação e login normal. Nenhum
   `refreshSession`/`getUser` agressivo foi adicionado.
3. **Primeiro acesso** — `OnboardingTour` removido do `DashboardLayout`.
   `/welcome-tour` é a única introdução automática. O `TrialWelcomeDialog` só
   aparece depois que o tour foi concluído ou pulado. `TrialCountdownBanner`
   preservado.
4. **Inatividade (`src/hooks/useInactivityLogout.ts`)** — 8 horas de inatividade
   com aviso 5 minutos antes. Sem refresh manual de sessão.
5. **`complete-checkout`** — paginação via `findUserByEmail` (`perPage: 1000`,
   erro tratado explicitamente), e-mail não é mais logado em texto claro, senha
   do `custom_field` do Stripe deixou de ser requisito (compatibilidade mantida
   para sessões antigas), senha temporária forte + `properties.action_link`
   oficial do Supabase. Nenhuma URL montada com `hashed_token`.
6. **`guest-checkout`** — `custom_fields` de senha removido das novas sessões.
7. **`_shared/access-control.ts`** — `subscriptionEnd` lido de
   `items.data[].current_period_end`; busca de customers com `limit: 10` e
   varredura das assinaturas de todos eles; falha temporária da Stripe não vira
   paywall (fallback para cortesia/trial e novo status `verification_error`
   somente sem outra evidência); sem PII em log.
8. **`past_due`** — comportamento atual preservado. O grace period explícito de
   7 dias está preparado em `_shared/stripe-access.ts`
   (`PAST_DUE_GRACE_DAYS`, `pastDueGraceDeadline`) com TODO: requer webhook
   `customer.subscription.updated` persistido para saber quando a assinatura
   entrou em `past_due`.
9. **Analytics** — `first_value_action` intacto; PostHog não foi reestruturado.

## Migrations aplicadas em produção

As migrations foram aplicadas pelo mecanismo normal de migration da Lovable/Supabase e registradas no histórico remoto com as versões abaixo:

- `20260827223525_79553cce-211f-47ec-99da-621dedfbbb2d.sql` — cria `public.user_access`, faz backfill usando `auth.users.created_at` e instala o trigger `on_auth_user_created_initialize_trial`.
- `20260827223552_e74faf73-6936-4bed-ab5c-a52012f94c5b.sql` — cria `public.commercial_policy` e registra a política comercial unificada.

Validação imediatamente após a aplicação:

- 94 usuários em `auth.users` e 94 registros em `user_access`;
- 12 trials ainda ativos e 82 expirados;
- todos os 94 registros existentes foram marcados como `trial_source = "migration"`;
- 0 usuários antigos receberam um novo período gratuito;
- novos cadastros passam a ser inseridos pelo trigger com `trial_source = "signup"`;
- preço registrado: R$ 49,90/mês e R$ 499,90/ano;
- proteção comercial dos assinantes legados até 27/02/2027.

Os arquivos antigos `20260827180000_create_user_access_trial_entitlements.sql` e `20260827203000_create_commercial_pricing_policy.sql` foram removidos do repositório após a aplicação porque continham o mesmo SQL sob versões diferentes e poderiam aparecer como migrations pendentes em sincronizações futuras.

## Testes

`src/lib/__tests__/p0-access-hardening.test.ts` cobre: confirmação de e-mail sem
`signOut`, resolução de acesso com múltiplos customers Stripe / período por item,
e paginação de `listUsers` com mais de 50 usuários. `npx vitest run` → 28 testes
passando. `npm run build` OK. `npm run lint` mantém apenas o baseline de erros
pré-existentes do repositório (`no-explicit-any`).
