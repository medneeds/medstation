# Pacote P0 — Conversão e Controle de Acesso

Entrega apenas em código. Nada foi publicado, nenhuma migration foi aplicada em
produção, Stripe não foi alterado e nenhuma edge function foi implantada à mão.

## O que mudou

1. **Cadastro (`src/components/LeadForm.tsx`)** — "Continuar com Google" é a
   primeira opção do formulário. O fluxo por e-mail pede apenas nome completo e
   e-mail (passo 1) e senha (passo 2). Telefone e CRM/UF deixaram de bloquear o
   cadastro; o lead é gravado com `phone: ""` para compatibilidade com a coluna
   NOT NULL (sem migration). UTM, `lead_created` e eventos de ciclo de vida
   permanecem intactos.
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
   somente sem outra evidência); ausência da tabela `user_access` é tolerada;
   sem PII em log.
8. **`past_due`** — comportamento atual preservado. O grace period explícito de
   7 dias está preparado em `_shared/stripe-access.ts`
   (`PAST_DUE_GRACE_DAYS`, `pastDueGraceDeadline`) com TODO: requer webhook
   `customer.subscription.updated` persistido para saber quando a assinatura
   entrou em `past_due`.
9. **Analytics** — `first_value_action` intacto; PostHog não foi reestruturado.

## Migration `user_access` — rollout seguro

A migration `20260827180000_create_user_access_trial_entitlements.sql`
**permanece não aplicada em produção**. Ordem recomendada:

1. Validar este pacote em produção (o access-control já tolera a ausência da
   tabela; hoje o trial vem do fallback `auth.users.created_at + 7 dias` com
   `trial_source = "migration"`).
2. Só depois aplicar a migration.
3. Após aplicá-la, novos cadastros passam a ter `trial_source = "signup"`, o que
   reativa o diálogo de boas-vindas e os eventos de trial.

## Testes

`src/lib/__tests__/p0-access-hardening.test.ts` cobre: confirmação de e-mail sem
`signOut`, resolução de acesso com múltiplos customers Stripe / período por item,
e paginação de `listUsers` com mais de 50 usuários. `npx vitest run` → 28 testes
passando. `npm run build` OK. `npm run lint` mantém apenas o baseline de erros
pré-existentes do repositório (`no-explicit-any`).
