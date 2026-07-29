
# Refino da quantificação de custos de IA

## O que existe hoje
- Tabela `ai_usage_logs` já registra `user_id`, `assistant`, `function_name`, `model`, tokens, `cost_usd`, `latency_ms`, `status`, `metadata`.
- Só logam hoje as funções de texto: `agent-chat`, `examinus-chat`, `support-chat`, `structure-anamnesis`, `generate-medical-document`, `extract-case-from-document`, `extract-file-text`.
- Ficam de fora as chamadas de áudio (custo real relevante): `transcribe-case`, `transcribe-prescription`, `consultation-transcribe`, `agent-transcribe` (OpenAI Whisper e ElevenLabs Scribe v2).
- A página `/admin/uso-ia` mostra apenas 3 KPIs simples + duas listas, sem filtro por usuário, sem separação Lovable vs APIs externas, sem série temporal.

## O que vou entregar

### 1. Cobertura completa de logs (backend)
- Adicionar `logAIUsage` nas 4 funções de transcrição, gravando:
  - `provider` no `metadata` (`lovable_ai`, `openai`, `elevenlabs`).
  - `audio_seconds` no `metadata` quando a resposta trouxer duração; senão estimar pelo tamanho do arquivo.
  - `model` padronizado (`openai/whisper-1`, `elevenlabs/scribe_v2`).
  - Custo derivado por minuto (não por token) para STT.
- Atualizar `_shared/model-pricing.ts`:
  - Adicionar `elevenlabs/scribe_v2` ($/min) e manter `openai/whisper-1` ($/min).
  - Nova função `estimateSTTCostUSD(model, seconds)`.
  - Marcar cada modelo com `provider` (`lovable_ai | openai | elevenlabs`) para segmentação consistente.
- `ai-logger.ts`: aceitar `provider` e `audioSeconds` opcionais e persistir em `metadata`.

### 2. Endpoint agregador (edge function nova: `admin-ai-usage`)
Um único endpoint, staff-only, que devolve tudo já agregado (evita puxar 1000 linhas no cliente e permite bucketização no servidor):
- KPIs: chamadas, tokens, custo total, custo Lovable, custo APIs externas, latência média, erros.
- Série temporal por dia (custo e tokens, empilhado por provider).
- Top N por: usuário (com nome/CRM), assistente, modelo, função.
- Split por provider (Lovable AI, OpenAI, ElevenLabs).
- Aceita filtros: `from`, `to`, `user_id`, `provider`, `assistant`, `model`.

### 3. UI /admin/uso-ia reconstruída
Mantém o mesmo container, sem mexer no shell do AdminLayout. Layout:

```text
┌───────────────────────────────────────────────────────────┐
│ Filtros: [Período ▼] [Usuário ▼] [Provider ▼] [Assist ▼] │
├───────────────────────────────────────────────────────────┤
│ KPI  KPI  KPI  KPI  KPI   (Chamadas, Tokens, Custo,       │
│                            Custo Lovable, Custo Externo)  │
├───────────────────────────────────────────────────────────┤
│ Série temporal — barras empilhadas por provider (recharts)│
├───────────────────────────────────────────────────────────┤
│ Split Provider │ Top Assistentes │ Top Modelos            │
├───────────────────────────────────────────────────────────┤
│ Top Usuários (nome, chamadas, tokens, custo)              │
├───────────────────────────────────────────────────────────┤
│ Últimas chamadas (tabela paginada, exportável CSV)        │
└───────────────────────────────────────────────────────────┘
```

- Filtros persistem em query string.
- Botão "Exportar CSV" do agregado atual.
- Tokens semânticos (sem hardcode), respeita o toggle dark/light já adicionado.

### 4. Sincronização com o resto do admin
- `admin-metrics` (dashboard global) passa a puxar custo total 30d do mesmo agregador, garantindo que o card "Uso de IA" do Dashboard bata com a página detalhada.
- Sem alteração de schema — usa `metadata` para `provider` e `audio_seconds`, então nenhuma migração é necessária.

## Detalhes técnicos
- Nada muda no fluxo do usuário final; logs continuam best-effort (não quebram a resposta).
- Custo de STT: `openai/whisper-1` ≈ $0.006/min; `elevenlabs/scribe_v2` ≈ $0.40/hora (~$0.0067/min) — ajustável em `model-pricing.ts`.
- Provider inferido do `model` prefix quando não vier explícito, para retroagir sobre logs antigos.
- Página nova usa `recharts` (já no projeto) para a série temporal.

## O que NÃO vou fazer nesta rodada
- Não vou criar novas tabelas nem tocar em RLS.
- Não vou mexer no fluxo de checkout/Stripe nem em outros módulos admin.
- Não vou alterar layout do AdminLayout — só o conteúdo da rota `/admin/uso-ia` e o card correspondente do Dashboard.

Confirma que sigo por esse caminho? Se preferir tirar/adicionar algo (por exemplo, custo em BRL com câmbio, ou alerta de gasto por usuário), me diga antes que eu implemente.
