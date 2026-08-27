# Auditoria P0 — Autenticação, Trial/Acesso e Stripe (somente leitura)

Nada foi editado, migrado ou alterado. Todos os pontos abaixo foram confirmados por leitura de código, consulta ao banco de produção e leitura da API Stripe (modo leitura).

## 1. Migration `public.user_access` (27/08/2026): NÃO está aplicada

- Existem no repositório: `20260827180000_create_user_access_trial_entitlements.sql` e `20260827203000_create_commercial_pricing_policy.sql`.
- Consulta ao `information_schema` de produção: as tabelas `user_access` e `commercial_policy` **não existem**. Existem apenas `courtesy_access` e `legacy_trial_invites`.
- Em produção, o trigger `on_auth_user_created_initialize_trial` e a função `initialize_signup_trial` também não existem. O único trigger de novo usuário ativo é `handle_new_user`, que apenas insere em `profiles`.

## 2. Como novos usuários (Google e e-mail) recebem trial hoje

`supabase/functions/_shared/access-control.ts` faz:
1. `has_role(admin)` → acesso total;
2. Stripe por e-mail → assinante;
3. `has_active_courtesy` → cortesia;
4. `select ... from user_access` → **falha silenciosamente** (tabela inexistente; o erro do PostgREST é ignorado, só `data` é lido, resultando em `null`);
5. **Fallback por `auth.users.created_at`**: `created_at + 7 dias`, `trialSource = "migration"`.

Ou seja: o trial de 7 dias hoje funciona em produção **exclusivamente pelo fallback do `created_at`**, igual para Google e e-mail/senha. Consequências factuais:
- O trial é sempre contado a partir da criação da conta, não do primeiro uso; não é possível pausar, estender ou registrar consumo.
- `trial_source` retornado é sempre `"migration"`, nunca `"signup"` — portanto o `TrialWelcomeDialog` (`src/components/AccessExperienceGate.tsx`), que exige `trialSource === "signup"`, **nunca aparece** e os eventos `trial_started` / `first_login` / `signup_completed` (Google) nunca são disparados.

## 3. Risco de acesso bloqueado indevidamente

- Base atual: 94 usuários em `auth.users`, 12 criados nos últimos 7 dias, 1 cortesia ativa, 1 admin, 9 assinaturas Stripe ativas. Todo o restante (contas com mais de 7 dias sem assinatura/cortesia) cai em `trial_expired` e é bloqueado por `AccessContentGate`. Isso é o comportamento desenhado, mas hoje depende de uma tabela inexistente — não há registro nem exceção manual possível a não ser `courtesy_access`.
- Risco real de bloqueio indevido: `check-subscription` responde **500** em qualquer falha (inclusive erro/timeout da Stripe). O `SubscriptionContext` captura o erro e mantém `accessActive = false` com `loading = false` → o usuário, inclusive pagante, vê o paywall. Um incidente da Stripe bloqueia toda a plataforma.
- O mesmo módulo é usado por 15 edge functions (agent-chat, transcrições, OCR, documentos etc.), então cada requisição depende de uma chamada Stripe ao vivo.
- Se as migrations forem aplicadas depois, o backfill usa `auth.users.created_at`, o que preserva o relógio atual — sem reset indevido.

## 4. Localização de customer/subscription na Stripe

- `create-checkout`, `guest-checkout`, `customer-portal`, `check-subscription` e `access-control.ts` usam todos `stripe.customers.list({ email, limit: 1 })`.
- Não existe persistência de `stripe_customer_id` em nenhuma tabela do banco (apenas em `user_metadata` de contas criadas por `complete-checkout`).
- Riscos confirmados por design: e-mail duplicado na Stripe (dois customers, o `limit: 1` pega o mais recente e pode ignorar o que tem a assinatura), e-mail alterado na Stripe ou no Supabase, diferença de caixa/alias → assinante pagante fica sem acesso, e `customer-portal` retorna "No Stripe customer found".

## 5. Tratamento de `past_due`

- Em `access-control.ts`, `past_due` entra na lista de assinaturas válidas: `canUsePlatform = true`, `isPaidSubscriber = true`, `status = "past_due"`.
- Não há prazo de tolerância, restrição de funcionalidade nem aviso na interface — o acesso continua integral por tempo indeterminado enquanto a Stripe mantiver o status.
- `create-checkout` e `guest-checkout` bloqueiam nova assinatura para quem está `past_due` (HTTP 409), então o usuário inadimplente não consegue reassinar sozinho pelo checkout; só pelo portal.

## 6. Contagens agregadas sem PII (obtidas agora)

Stripe Sigma não está habilitado na conta; os números abaixo vieram da API de listagem, agregados localmente sem exibir dados pessoais.

Assinaturas (todas, 19 no total, sem paginação pendente):
- active: 9
- trialing: 0
- past_due: 0
- canceled: 10
- 1 assinatura ativa marcada com `cancel_at_period_end`

Distribuição por preço (19 assinaturas): 13 no preço legado `price_1Sj4Fb…`, 5 em `price_1TVga8…`, 1 no plano unificado atual `price_1U4Zo7…` (R$ 49,90).

Checkouts (últimas 50 sessões, de 10/05/2026 a 24/08/2026):
- complete + paid: 12
- expired + unpaid: 38
- Há mais páginas além dessas 50.

Banco (agregado): 94 usuários, 12 criados nos últimos 7 dias, 1 cortesia ativa, 1 admin.

## 7. Bugs confirmados

P0
1. Migrations de 27/08 (`user_access`, `commercial_policy`) não aplicadas em produção; o código de entitlement consulta essas tabelas e ignora o erro, mascarando a falha. Todo o trial roda em fallback implícito.
2. `complete-checkout` verifica duplicidade com `supabaseAdmin.auth.admin.listUsers()` **sem paginação** (padrão 50 por página) com 94 usuários na base. Contas fora da primeira página são vistas como inexistentes → `createUser` falha → resposta 500 na volta do pagamento, mesmo com cobrança concluída.
3. `check-subscription` retorna 500 em qualquer erro e o frontend interpreta como "sem acesso": falha da Stripe = paywall para todos, inclusive assinantes ativos.
4. Não há webhook Stripe. O reconhecimento do pagamento depende do retorno do usuário a `/obrigado` e do polling de 5 minutos; se o navegador fechar após o pagamento (fluxo guest), a conta pode não ser criada.

P1
5. `subscription.current_period_end` não existe mais no nível da assinatura na API `2025-08-27.basil` (confirmado no payload: o campo aparece apenas em `items.data[].current_period_end`). `access-control.ts` lê o campo do nível errado → `subscription_end` fica `null` para assinantes.
6. Lookup de customer por e-mail com `limit: 1` e sem `stripe_customer_id` persistido (itens do ponto 4).
7. `past_due` com acesso integral e sem prazo, e ao mesmo tempo bloqueado de reassinar via checkout (409).
8. `trial_source` nunca é `"signup"` em produção → diálogo de boas-vindas do trial e eventos de ciclo de vida (`trial_started`, `first_login`, `signup_completed` do Google) não disparam.
9. `admin-list-subscribers` consulta `user_access` e `commercial_policy`; com as tabelas ausentes os erros são ignorados e as colunas de trial e a proteção de preço legado aparecem vazias no painel admin — sem qualquer aviso.
10. `applyCommercialPolicy` sempre resulta em `legacyFullAccessUntil = null` e `pricingReviewDue = false`, então a régua de proteção dos assinantes legados não existe de fato em produção.
11. `complete-checkout` monta `autoLoginUrl` manualmente a partir de `hashed_token`, fora do formato de verificação do Supabase; em pagamentos por wallet a conta fica com senha temporária e o auto-login tende a falhar.

Nenhuma correção foi aplicada. Posso detalhar qualquer item ou preparar um plano de correção quando você autorizar.
