# Roadmap

## Concluído — Examinus · Modo Interpretador (V1 RX tórax)
- [x] Migration: `messages.metadata` JSONB
- [x] Módulo compartilhado `_shared/radiology-interpreter.ts` (validação, multimodal, prompt ABCDE)
- [x] Módulo compartilhado `_shared/prompt-shield.ts`
- [x] Edge Function `radiograph-interpret` (auth + acesso + shield + SSE + ai-logger) — implantada, 401 sem sessão, expõe `X-Radiology-Output-Mode`
- [x] `supabase/config.toml` (verify_jwt = true)
- [x] Cliente `src/lib/radiologyInterpreter.ts` (regras puras) + 24 testes
- [x] AgentChat: toggle "Interpretador" (desktop + mobile), exclusividade com Consultor, fila de radiografias com preview/remoção, envio sem texto, upload no bucket privado → `evidences` → chamada por IDs, streaming, persistência com metadata, chips na bolha, reidratação de contexto por conversa, recuperação de erro (devolve imagens à fila)
- [x] adminMetrics / admin-posthog mapping (`radiograph-interpret` → examinus)
- [x] Vitest 179/179 · tsgo OK · lint sem novos erros
- [x] NÃO publicado em produção (apenas função implantada no backend)

## Pendente de validação com sessão
- [ ] E2E autenticado no preview: ligar Interpretador → anexar RX tórax (JPEG/PNG) → enviar → conferir leitura em streaming e metadata gravada (requer login no preview; `LOVABLE_BROWSER_AUTH_STATUS=signed_out` nesta sessão)

## Próximos passos
- [ ] Redeploy de `admin-posthog` junto com a próxima publicação (mapping `radiograph-interpret` → examinus)
- [ ] Unificar prompt shield do `agent-chat` com `_shared/prompt-shield.ts`
- [ ] Interpretador: thumbnails do histórico via signed URL (hoje mostra apenas contagem/chip)
- [ ] Interpretador: botão "Avaliação rápida / Laudo completo" explícito ao lado do envio (hoje detecta pelo texto)
- [ ] Interpretador: ampliar para outras modalidades (RX abdome, membros) após validação clínica
