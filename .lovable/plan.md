
VARREDURA DO PAINEL ADMIN — INCONSISTÊNCIAS ENCONTRADAS

Fiz uma auditoria completa das 10 páginas admin e do edge function `admin-list-subscribers`. Os problemas reais são:

1. CORTESIAS DIVERGENTES
   Dashboard conta TODAS as linhas de `courtesy_access` (inclui expiradas). Usuários/Faturamento contam só as ATIVAS. Os dois números nunca batem.

2. FATURAMENTO NÃO RESPONDE AOS FILTROS
   Os KPIs (MRR, ARR, Ticket médio, Ativos, etc.) mostram sempre os números globais mesmo quando você filtra por status ou período. O backend já calcula `filteredStats`, mas a página nunca lê. Este é o bug mais visível: "filtrei mas o número não mudou".

3. MÉTRICAS TRUNCADAS APRESENTADAS COMO TOTAIS
   - Feedback: "Média geral" calculada só sobre as últimas 200 avaliações.
   - Indicações: KPIs (total, conversão, dias creditados) sobre 500 linhas.
   - Suporte: contador de tickets abertos sobre 100 tickets.
   - Auditoria: contadores sobre 200 registros.
   Se o volume passar do teto, os números silenciosamente subestimam a realidade.

4. LÓGICA DUPLICADA DE IA
   Dashboard e AdminAIUsage fazem queries próprias em `ai_usage_logs` com janelas diferentes. Fonte única faltando.

5. `filteredStats` INCOMPLETO
   Faltam `arr_cents`, `avg_ticket_cents`, `none`, `auth_missing` — não dá paridade com os cards globais mesmo se conectado.

O QUE VOU FAZER

A. BACKEND — `admin-list-subscribers`
   - Completar `filteredStats` com todos os campos que o global tem.
   - Corrigir contagem de cortesia para respeitar `expires_at` em todos os cálculos.

B. NOVO EDGE FUNCTION — `admin-metrics`
   Fonte única para métricas não-Stripe. Retorna contagens/agregações REAIS via `count: 'exact'` e `sum()` no Postgres:
   - Cortesias ativas (com filtro `expires_at IS NULL OR > now()`).
   - Feedback: média global + distribuição por assistente.
   - Indicações: totais, convertidas, dias creditados, conversão.
   - Suporte: abertos, em andamento, resolvidos hoje.
   - IA: tokens 24h, custo 30d, top assistentes.
   - Auditoria: eventos 24h/7d.

C. FRONTEND — REORGANIZAR PÁGINAS
   - `AdminDashboard`: passa a consumir `admin-metrics` + `admin-list-subscribers` para Stripe. Remove a query solta de `courtesy_access`.
   - `AdminBilling`: adiciona toggle "KPIs: Global ↔ Filtro atual". Quando filtro ativo, lê `filteredStats`; senão, `stats`.
   - `AdminFeedback`, `AdminReferrals`, `AdminSupport`, `AdminAudit`: exibem KPI global (do `admin-metrics`) acima da tabela paginada, deixando claro que a lista é "amostra recente".

D. CÓDIGO — TIPOS COMPARTILHADOS
   Criar `src/pages/admin/types.ts` com as interfaces `SubscriberRecord`, `SubscriberStats`, `AdminMetrics` importadas por todas as páginas. Elimina duplicação de tipos entre Dashboard/Users/Billing.

E. SEGURANÇA
   Todas as chamadas de `admin-metrics` validam `is_staff(auth.uid())` no início (mesmo padrão dos outros admin functions).

ESCOPO EXCLUÍDO (para manter foco)
- Não vou mexer em layout visual, cores, ordenação de menus.
- Não vou alterar `admin-set-role`, `admin-grant-courtesy`, `admin-reset-password` — funcionam.
- Não vou implementar exportação nova (a de faturamento já existe).

RESULTADO ESPERADO
- Todos os números que hoje divergem passam a bater.
- Filtros no faturamento passam a atualizar os KPIs.
- Métricas truncadas viram valores reais.
- Dashboard passa a ser retrato íntegro do projeto.

Aprova este plano ou quer ajustar algum ponto antes de eu implementar?
