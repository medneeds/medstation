# /admin — Painel Administrativo MedStation

Painel unificado para você e o time de suporte gerenciarem usuários, faturamento, suporte, uso de IA, segurança, feature flags e broadcasts. Escopo COMPLETO (8 módulos) na v1.

## 1. Acesso e permissões

Nova role `support` no enum `app_role` (hoje só existe `admin`, `user`).

| Módulo | admin | support |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Usuários (ver / reset senha / cortesia) | ✅ | ✅ |
| Criar admin, remover role | ✅ | ❌ |
| Faturamento | ✅ | ❌ |
| Chat de suporte (inbox) | ✅ | ✅ |
| Analytics de uso / tokens | ✅ | ✅ (sem custo $) |
| Auditoria / segurança | ✅ | 🔎 leitura |
| Feature flags | ✅ | ❌ |
| Broadcast | ✅ | ❌ |

Guarda `AdminRoute` usa `has_role(uid,'admin') OR has_role(uid,'support')`. Cada edge function revalida a role.

## 2. Rotas

```text
/admin                       Dashboard (KPIs)
/admin/usuarios              lista + drawer de detalhe
/admin/faturamento           MRR, churn, filtros, export CSV
/admin/suporte               inbox de tickets (realtime)
/admin/suporte/:ticketId     conversa
/admin/uso-ia                consumo de tokens / custo
/admin/feedback              NPS + comentários
/admin/auditoria             security_events + audit log
/admin/flags                 feature flags
/admin/broadcast             banners globais
```

Layout próprio (`AdminLayout`) com sidebar dedicada — não reaproveita `DashboardLayout` para não misturar UX médica com ops.

## 3. Módulos

### 3.1 Dashboard
Cards: usuários totais / ativos 30d / novos hoje · MRR · churn 30d · tickets abertos · tokens 24h · custo IA mês · erros edge 24h. Gráficos: signups/dia (30d), receita/dia, uso por assistente (pizza).

### 3.2 Usuários
Reaproveita `admin-list-subscribers`. Drawer com perfil, assinatura Stripe, cortesias, últimos logins, conversas e casos recentes, tokens consumidos. Ações: reset senha, confirmar email manualmente, conceder/revogar cortesia, promover admin/support, revogar sessão, exportar dados LGPD, excluir conta.

### 3.3 Faturamento
MRR, ARR, churn, LTV, novos/expansão/cancelamento. Filtros: período, plano, status. Tabela de assinaturas com deep-link Stripe. Export CSV. Refunds inline.

### 3.4 Suporte (chat)
Fluxo: usuário abre SupportChat → IA responde → botão "Falar com humano" cria ticket. Time vê inbox realtime, atribui e responde. Cliente recebe as respostas no mesmo widget.

Novo:
- `support_tickets` (user_id, status open/assigned/waiting_user/resolved, assigned_to, priority, subject, ai_context_snapshot).
- `support_messages` (ticket_id, sender_type user/ai/agent, sender_id, content, read_at).
- Edge functions `support-ticket-create`, `support-ticket-reply`, `support-ticket-list`.
- `SupportChat.tsx` ganha estado "conectando com humano" + realtime em `support_messages`.

### 3.5 Uso de IA / tokens
Nova tabela `ai_usage_logs` (user_id, assistant, function_name, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, status). Helper `_shared/ai-logger.ts` chamado em TODAS as edge functions de IA: agent-chat, examinus-chat, public-examinus, support-chat, studius-chat, generate-flashcards, generate-quiz, structure-anamnesis, generate-case-title, generate-medical-document, extract-case-from-document, process-article, transcribe-*, consultation-transcribe, elevenlabs-scribe-token.

Dashboard: tokens e custo por dia · top 20 usuários · breakdown por assistente / modelo / função · média por sessão · alertas de outliers.

### 3.6 Feedback / NPS (sugestão minha)
Widget pós-uso ("Isso foi útil?" + comentário). Tabela `user_feedback` (user_id, assistant, rating 1-5, comment, session_id). Admin vê NPS por assistente e tendência.

### 3.7 Auditoria e segurança (sugestão minha)
UI para `security_events` + nova `audit_log` (admin_id, action, target_user_id, metadata) — toda ação sensível grava. Filtros por admin, ação, data.

### 3.8 Feature flags (sugestão minha)
Tabela `feature_flags` (key, enabled_global, enabled_users uuid[], disabled_users uuid[], rollout_pct). Hook `useFeatureFlag(key)`. Kill-switch por assistente, feature ou rollout gradual, sem deploy.

### 3.9 Broadcast (bônus)
Tabela `announcements` (title, body, variant, cta, target all/plan/role, janela de datas). Banner global no `DashboardLayout` lê a announcement ativa.

### 3.10 Cortesias em massa (bônus)
Bulk paste de emails + motivo + validade — hoje é 1 a 1.

## 4. Migrations (novas)

```text
1. ALTER TYPE app_role ADD VALUE 'support'
2. FUNCTION is_staff(uid) → admin OR support (SECURITY DEFINER)
3. TABLE support_tickets + RLS + GRANTs
4. TABLE support_messages + RLS + GRANTs + realtime publication
5. TABLE ai_usage_logs + RLS + GRANTs (staff lê; service_role insere)
6. TABLE user_feedback + RLS + GRANTs
7. TABLE audit_log + RLS + GRANTs (append-only, admin lê)
8. TABLE feature_flags + RLS + GRANTs
9. TABLE announcements + RLS + GRANTs
```

## 5. Novas edge functions

`support-ticket-create`, `support-ticket-reply`, `support-ticket-list`, `admin-metrics`, `admin-billing-metrics`, `admin-ai-usage`, `admin-bulk-courtesy`. Helper `_shared/ai-logger.ts` e `_shared/model-pricing.ts`. Todas as admin revalidam `is_staff(uid)`.

## 6. Frontend

```text
src/pages/admin/
  AdminLayout.tsx, AdminDashboard.tsx, AdminUsers.tsx, AdminUserDetail.tsx,
  AdminBilling.tsx, AdminSupport.tsx, AdminSupportTicket.tsx,
  AdminAIUsage.tsx, AdminFeedback.tsx, AdminAudit.tsx,
  AdminFlags.tsx, AdminBroadcast.tsx
src/components/admin/ (MetricCard, UsageChart, TicketList, FlagToggle, etc.)
src/components/AdminRoute.tsx
src/hooks/useFeatureFlag.ts, useAdminRole.ts
```

Rota `/admin/*` em `src/App.tsx` sob `<AdminRoute>`.

## 7. Fases de entrega

Escopo completo entregue em 4 sub-releases testáveis:

- **Fase A — Fundação:** role `support`, `AdminLayout`, `AdminRoute`, `is_staff()`, `audit_log`, Dashboard com KPIs básicos, módulo Usuários.
- **Fase B — Faturamento + Uso de IA:** métricas Stripe, tela Faturamento, `ai_usage_logs` + helper + instrumentação de TODAS as edge functions IA, tela Uso de IA.
- **Fase C — Suporte:** tickets + messages, edge functions, inbox realtime, hand-off no SupportChat.
- **Fase D — Extras:** Feedback/NPS, Auditoria UI, Feature flags + hook, Broadcast, Cortesias em massa.

## 8. Fora de escopo (explícito)

- Impersonation (login como usuário) — risco LGPD, entra só se pedir.
- App mobile do admin.
- Alertas Slack/Discord — trivial de adicionar via connector depois.
- Backfill de tokens históricos (log só a partir da instrumentação).

## Detalhes técnicos

- RLS: tabelas admin com SELECT usando `is_staff(auth.uid())`; INSERT/UPDATE admin-only via `has_role(uid,'admin')`.
- Realtime: `support_messages` publicado; frontend usa `supabase.channel().on('postgres_changes')`.
- Custo IA calculado no helper via `_shared/model-pricing.ts` (constante atualizável).
- Cache 5 min em `admin-metrics` e `admin-billing-metrics` (mesmo padrão de `admin-list-subscribers`).
- Feature flags com fallback client-side (query falha → default).
- Auditoria escrita explicitamente em cada edge admin sensível.
- Tabelas paginadas server-side, toasts e loading states padronizados.
