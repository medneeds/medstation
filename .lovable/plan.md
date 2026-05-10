## Objetivo

Manter o demo gratuito do Examinus na landing page, mas (1) educar visitantes recorrentes sobre os 9 outros assistentes pagos via pop-ups rotativos não invasivos e (2) controlar o gasto de créditos com cooldown de 30s entre extrações no modo gratuito.

---

## 1. Cooldown de 30s entre extrações

Após cada resposta bem-sucedida, o input fica bloqueado por 30 segundos com:

- Botão de enviar desabilitado mostrando contador regressivo ("Aguarde 28s · Modo gratuito")
- Barra de progresso fina abaixo do input
- Texto explicativo discreto: "Versão gratuita: 30s entre extrações. Crie sua conta para uso instantâneo."
- Link "Acelerar agora →" abre modal de upgrade

Comportamento:
- Cooldown só ativa após a 1ª extração (primeira é instantânea para não frustrar)
- Persistido em `sessionStorage` (não burla com refresh)
- Validação dupla no edge function `public-examinus`: rejeita requisições do mesmo fingerprint+IP em janela <30s com 429 e mensagem amigável

---

## 2. Sistema de pop-ups híbrido (tempo + interação)

Engine central `useDemoPromoEngine` controla todos os gatilhos com cooldown global de 60s entre pop-ups (nunca dois ao mesmo tempo) e dismissal persistido em `sessionStorage` para não repetir o mesmo nos próximos 5 min.

### Gatilhos por interação
| Evento | Pop-up | Formato |
|---|---|---|
| 1ª extração concluída | "Gostou? Veja o que mais te espera" | Banner inline no chat |
| 3ª extração | Apresenta 1 assistente aleatório (Clínicus/Prescriptus/Gasometrus...) | Toast canto inferior |
| Limite atingido (5/5) | Bloqueio total + CTA forte | Modal central |

### Gatilhos por tempo na página (com a seção do demo visível)
| Tempo | Conteúdo (rotativo) | Formato |
|---|---|---|
| 90s | Economia de tempo: "Médicos economizam ~2h/dia" | Toast |
| 4min | Apresenta 1 assistente diferente do mostrado antes | Toast |
| 8min | Oferta: "R$ 29,90/mês · 7 dias garantia · sem cartão" | Banner inline |
| 14min | Modal central com os 10 assistentes em grid + CTA | Modal |

### Pool de conteúdo rotativo (mistura os 3 eixos pedidos)

A. **Assistentes** (9 cards rotativos): Clínicus, Prescriptus, Gasometrus, Atestus, Orientus, Protocolus, Scorius, Numerus, Codexus — cada um com 1 frase de benefício.

B. **Economia/produtividade**: "2h economizadas por dia", "Anamnese em 30s", "Prescrição com bula inteligente", "Sem digitar repetições".

C. **Preço/garantia**: "R$ 29,90/mês", "7 dias de garantia incondicional", "Sem cartão para testar grátis", "Cancele quando quiser".

Rotação aleatória sem repetir o último item da mesma categoria.

---

## 3. Otimização de créditos (além do cooldown)

- Reduzir limite de extrações anônimas de **5 → 3** por IP+fingerprint/24h
- Cap de `max_tokens` na resposta do demo (ex.: 1500 → 800) para reduzir custo por extração
- Bloquear arquivos > 1 (no demo, processar só 1 imagem/PDF por vez)
- Cooldown de 30s no servidor (defesa em profundidade)

---

## 4. Componentes a criar/editar

**Novos:**
- `src/components/demo/DemoPromoEngine.tsx` — orquestrador (timers, gatilhos, cooldown global)
- `src/components/demo/PromoToast.tsx` — wrapper sonner com CTA
- `src/components/demo/PromoBanner.tsx` — card inline para timeline do chat
- `src/components/demo/UpgradeModal.tsx` — grid dos 10 assistentes + CTA principal
- `src/components/demo/CooldownIndicator.tsx` — botão com contador + barra
- `src/lib/demoPromoContent.ts` — pool de mensagens das 3 categorias

**Editados:**
- `src/components/PublicExaminusChat.tsx` — integra cooldown 30s, monta `<DemoPromoEngine />`, dispara eventos `extractionCompleted`, reduz `accept multiple` para 1
- `src/pages/Home.tsx` — monta engine de tempo no nível da seção `#demo` (IntersectionObserver)
- `supabase/functions/public-examinus/index.ts` — reduz limite p/ 3, valida cooldown 30s server-side, reduz `max_tokens`

**Sem mudança de banco** (cooldown usa coluna `updated_at` existente em `rate_limits`).

---

## Detalhes técnicos

```text
DemoPromoEngine
├── usePromoTimers (90s, 4min, 8min, 14min)
├── usePromoEvents (extractionCount, limitReached)
├── usePromoCooldown (60s entre qualquer pop-up)
└── usePromoDismissed (sessionStorage, TTL 5min por id)
   ↓
   dispatch → toast | banner | modal
```

Cooldown server-side: query `rate_limits` ordenada por `updated_at desc`; se `now - last < 30s` retorna 429 com `cooldownRemaining`. Cliente já trata 429 e mostra mensagem.

Eventos client→engine via `CustomEvent("demo:extraction-completed", { detail: { count } })` para desacoplar `PublicExaminusChat` da engine.

---

## Fora do escopo

- Sem mudanças no fluxo autenticado (assistentes internos seguem ilimitados conforme assinatura)
- Sem alterações no checkout/Stripe
- Sem novas tabelas ou migrations
