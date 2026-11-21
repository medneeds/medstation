# MedStation AI Core — Fase 1 (sem deploy)

## Escopo implementado
- Catálogo tipado de modelos usados atualmente em `supabase/functions/_shared/ai-core/model-registry.ts`.
- Roteamento atual de `agent-chat` preservado, agora referenciando o catálogo.
- Estimativas de custo nullable (`estimateKnownCostUSD`, `estimateKnownSTTCostUSD`).
- `ai-logger` armazena `cost_usd = null` quando não há tarifa conhecida, com `metadata.cost_source` e `metadata.cost_estimate_missing`.
- Contrato declarativo de ferramentas clínicas, com verificação pura de contexto e exigência de aprovação nas propostas de prescrição. **Não é mecanismo completo de autorização**.
- Resolução fail-closed de endpoint/alias para futura substituição do gateway Lovable.
- Testes de regressão em `src/lib/__tests__/ai-core-foundation.test.ts`.

## Diagnóstico da produção (14 nov 2026, somente leitura)
- 25 usuários distintos com assinatura recorrente ativa e 4 usuários distintos com compra anual paga vigente, totalizando 29 chaves de usuário na soma deduplicada da consulta.
- 26 linhas de assinaturas ativas para 25 usuários; uma conta apresenta duas linhas ativas de R$29,90. Não cancelar automaticamente.
- 349 chamadas `openai/gpt-6-astra` em 30 dias e aproximadamente 2,52M tokens com custo zero registrado. O modelo está ausente da tabela local de tarifas; o custo real não pode ser estimado sem tabela contratada.
- 14 erros `elevenlabs/scribe_v2`; investigar recuperação via fallback antes de considerar impacto final.
- Gateway Lovable ainda referenciado por várias Edge Functions; **a migração de chamadas NÃO está ativada**.
- Valores reportados pelo logger não equivalem a faturas de fornecedores.

## Migração controlada — próximas etapas
1. Executar `npx vitest run src/lib/__tests__/agent-model-routing.test.ts src/lib/__tests__/ai-core-foundation.test.ts`, `npm run lint` e `npm run build` em CI.
2. Confirmar a tarifa contratada de GPT-6 Astra e corrigir custo histórico somente a partir de extratos reconciliados. Não inventar preços.
3. Identificar todos os pontos de chamada Lovable, dependências da autenticação e integrações de e-mail antes de portar.
4. Construir adaptadores reais com segredos exclusivamente em servidor; emular respostas streaming e erros numa suíte de regressão.
5. Avaliar modelos equivalentes diretamente contratados (os IDs do gateway podem não ser identificadores válidos em APIs diretas).
6. Habilitar troca por feature flag em homologação; nunca mudar o provedor de uma rota clínica sem revisão de qualidade.
7. Hermes executará planejamento de chamadas a **ferramentas autorizadas**; sem terminal livre, acesso amplo ao banco, execução de prescrição ou uso de PII para marketing.
8. Verificar backups, RLS, exportação e restauração antes de migração do banco.

## Critérios de aceitação
- Mesmos modelos e prompts do fluxo atual enquanto as flags não forem alteradas.
- Registro `cost_usd=null` para modelo sem preço conhecido, não zero.
- Pacientes segregados por autorização server-side, não apenas pelo guard puro de planejamento.
- Revisão manual para qualquer saída que implique prescrição, alta ou decisão clínica.
- Testes, CI e revisão de PR aprovados antes de merge. Nenhuma operação de produção nesta fase.

## Limitações
Este PR é uma **fundação**. O Hermes não está instalado, não há gateway direto em execução e não foi feito deploy. O catálogo cobre rotas principais identificadas, não substitui o inventário completo dos serviços independentes.
