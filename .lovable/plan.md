
# Plano de execução

Quatro frentes independentes. Vou executar em ordem para evitar conflitos: (1) remoção do Studius limpa o terreno; (2) redesign do pré-login; (3) auditoria do Modo Consultório; (4) refinamento do Google OAuth.

## 1. Remoção total do Studius

**Arquivos a deletar:**
- `src/pages/studius/` (toda a pasta — 8 páginas)
- `src/components/studius/` (4 componentes)
- `src/hooks/useStudius.ts`, `useStudiusLimits.ts`, `useFlashcards.ts`, `useQuizzes.ts`, `useGamification.ts`
- `supabase/functions/studius-chat/`, `generate-flashcards/`, `generate-quiz/`, `process-article/`

**Edits:**
- `src/App.tsx` — remover rotas `/studius/*`
- `src/components/AppSidebar.tsx` — remover item Studius
- `src/components/QuickCheckout.tsx` — remover plano Studius
- `src/lib/subscription-tiers.ts` — remover tier Studius
- `src/contexts/SubscriptionContext.tsx` — limpar campos `studius_*`
- `supabase/functions/check-subscription/`, `create-checkout/`, `guest-checkout/` — remover lógica Studius
- `src/pages/AdminSubscribers.tsx` — remover filtros Studius
- `src/pages/Pricing.tsx` — remover seção Studius
- `src/components/demo/` — remover menções Studius nos pop-ups
- Deletar edge functions deployadas via tool

**Banco:** drop das tabelas studius_* via migration (flashcards, quizzes, articles, gamification, leaderboard).

**Memórias a remover:** todas em "6. Studius Integration" + freemium/upgrade/dynamic-pricing do Studius.

## 2. Redesign pré-login (Auth + Landing + Pricing)

**Direção visual** — fugir do "AI gerado pela Lovable":
- Tipografia editorial: display serifa moderna (ex: `Fraunces` ou `Instrument Serif`) para títulos + sans geométrica para body
- Composição assimétrica, generoso negative space, grid quebrado
- Paleta restrita: preto profundo + verde pastel da marca + 1 acento quente (âmbar suave). **Remover qualquer gradiente verde→lilás**
- Camadas: ruído sutil + glow pontual + bordas hairline
- Motion: framer-motion com stagger, parallax leve no hero, transições entre rotas

**Auth (`src/pages/Auth.tsx`):**
- Layout split assimétrico (60/40 com offset) substituindo o atual 2-colunas simétrico
- Logo via favicon SVG (extrair de `public/favicon.ico` → criar `src/assets/medstation-logo.svg` com cores da marca)
- Animações de entrada por campo, transição suave signin↔signup, feedback inline (sem travas/spinners bloqueantes — usar skeleton states)
- Google button no topo com peso visual maior; "ou com email" como divisor elegante
- Background: noise + radial glow verde pastel apenas (zero lilás/púrpura)

**Landing (`src/pages/Home.tsx`):**
- Hero reconstruído: título serifa enorme + CTA + demo Examinus side-by-side
- Sections com sticky scroll, reveal animations, marquee de assistentes
- Remover gradiente verde→lilás onde existir

**Pricing (`src/pages/Pricing.tsx`):**
- Cards com hierarquia clara, hover 3D sutil, comparação tabular elegante

**Tokens novos** (`index.css` + `tailwind.config.ts`):
- `--accent-warm` (âmbar pastel)
- `--surface-elevated`, `--hairline`
- Remover variáveis lilás/púrpura

## 3. Auditoria do Modo Consultório (Clínicus)

Vou ler `ConsultationMode.tsx`, `useConsultation.ts`, edge function `consultation-transcribe` e `structure-anamnesis`. Verificar:
- Captura de áudio (permissões, MediaRecorder)
- Streaming/chunking pro Whisper
- Diarização de speakers
- Estruturação AHE pós-transcrição
- Anti-alucinação (3 camadas mencionadas na memória)

**Entregável:** relatório do que está quebrado + fix nos pontos críticos.

## 4. Google OAuth — sincronização

- Validar `redirect_uri` em `GoogleAuthButton.tsx`
- Garantir tratamento de `result.redirected` vs `result.error`
- Adicionar handler de callback em `App.tsx` se necessário
- Testar fluxo end-to-end

## Ordem de execução

1. Migration drop tabelas studius (aprovação) → deleta arquivos + edge functions
2. Atualiza memórias
3. Redesign Auth (maior impacto visual percebido)
4. Redesign Landing + Pricing
5. Auditoria Modo Consultório
6. Fix Google OAuth

## Detalhes técnicos

- Fontes: import via Google Fonts no `index.html`
- Logo SVG: gerar manualmente baseado no favicon (estetoscópio + estação) nas cores `--primary` (verde pastel) sobre transparente
- Framer Motion: já instalado
- Manter compatibilidade mobile (regra core: mobile não pode quebrar desktop)
- Não tocar em `src/integrations/supabase/*`, `.env`, `supabase/config.toml` project-level
