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

## Concluído (aguardando validação do usuário) — Clínicus · Interpretador de ECG (V1)
- [x] Núcleo `_shared/ecg-interpreter.ts` (`ECG_MODEL` isolado = gemini-3.1-pro-preview, temp 0.1, validação, multimodal `image_url`, prompt ECG com checklist interno nunca impresso, resposta direta em perguntas de seguimento)
- [x] Edge Function `ecg-interpret` (auth + requirePlatformAccess + shield + rate limit + SSE + ai-logger assistant=clinicus) — implantada, 401 sem sessão
- [x] `supabase/config.toml` (verify_jwt = true) · mapping `ecg-interpret -> clinicus` (adminMetrics + admin-posthog implantado)
- [x] Cliente `src/lib/ecgInterpreter.ts` (exclusividade Anamnese/Relatório/Interpretador, fila, metadata, executeOnce)
- [x] Workspace `EcgInterpreterWorkspace.tsx` (dropzone, 2 painéis desktop 42/58, card mobile colapsável, zoom, follow-ups)
- [x] AgentChat: pílula "Interpretador" no Clínicus (desktop + mobile), envio sem OCR, persistência `ecg_evidence_ids`, signed URLs na reabertura
- [x] 53 testes de contrato · Vitest 239/239 · tsgo OK · build OK · eslint sem regressão (baseline 6 erros/1 aviso em AgentChat)
- [x] E2E autenticado no preview (ECG 12 derivações CC BY) — PASS: envio só imagem, laudo, reabertura via Histórico com mesma evidence, pergunta direta, 1 INSERT por envio, sem OCR, logs sem conteúdo clínico · QA apagado, 0 resíduos
- [ ] NÃO publicar frontend até validação do usuário

## Próximos passos
- [ ] Unificar prompt shield do `agent-chat` com `_shared/prompt-shield.ts`
- [ ] Interpretadores (RX/ECG): botão "Avaliação rápida / Laudo completo" explícito ao lado do envio (hoje detecta pelo texto)
- [ ] Interpretador ECG: ao reabrir o Clínicus, oferecer atalho "Continuar última interpretação" (hoje a reabertura passa pelo Histórico)
- [ ] Interpretador ECG: comparação seriada com 2+ traçados validada em E2E (suporte já existe no prompt/UI)
- [ ] Interpretador RX: ampliar para outras modalidades (RX abdome, membros) após validação clínica

## Em andamento — Examinus · ECG como modalidade de primeira classe do Interpretador
- [ ] `src/lib/interpreterModality.ts`: modalidade (radiografia|ECG), detecção AUXILIAR e conservadora (somente pistas textuais explícitas — nunca proporção da imagem), aplicação que respeita escolha manual, cópia por modalidade
- [ ] AgentChat/Examinus: seletor de modalidade sempre visível e corrigível antes do envio; roteamento de envio e de seguimento para `radiograph-interpret` ou `ecg-interpret`; metadados e origem por modalidade; reidratação após reload
- [ ] PDF aceito nos dois interpretadores (páginas renderizadas como imagem original no cliente; nunca OCR)
- [ ] Clínicus mantém o Interpretador de ECG existente, sem alteração de comportamento
- [ ] Testes puros + vitest completo + tsgo + build + lint dos arquivos tocados + E2E autenticado com usuário QA descartável e limpeza total
- [ ] NÃO publicar antes do relatório dos gates
