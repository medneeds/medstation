# Roadmap

## Em andamento — Examinus · Modo Interpretador (V1 RX tórax)
- [x] Migration: `messages.metadata` JSONB
- [x] Módulo compartilhado `_shared/radiology-interpreter.ts` (validação, multimodal, prompt)
- [x] Módulo compartilhado `_shared/prompt-shield.ts`
- [x] Edge Function `radiograph-interpret` (auth + access + shield + SSE + ai-logger)
- [x] `supabase/config.toml` (verify_jwt = true)
- [x] Cliente `src/lib/radiologyInterpreter.ts`
- [x] AgentChat: toggle, exclusividade, anexos com preview, envio, persistência, reidratação
- [x] adminMetrics / admin-posthog mapping
- [x] Testes de contrato + vitest + build + lint
- [x] Deploy apenas de `radiograph-interpret` (sem publicar frontend)

## Pronto para próximos passos
- [ ] Redeploy de `admin-posthog` junto com a próxima publicação (mapping `radiograph-interpret` → examinus)
- [ ] Unificar prompt shield do `agent-chat` com `_shared/prompt-shield.ts`
- [ ] Interpretador: thumbnails do histórico via signed URL (hoje mostra apenas contagem)
- [ ] Interpretador: ampliar para outras modalidades (RX abdome, membros) após validação clínica
