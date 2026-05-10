
# Monetização do Modo Consultório

Transformar o Modo Consultório em um produto pago independente, com integração total na arquitetura existente (Assistentes + Studius). Justificativa: custos de manutenção mais altos (Scribe + Whisper + processamento contínuo).

## 1. Estrutura de Produtos & Preços (Stripe)

Criar 4 novos preços no Stripe (LIVE):

| Produto | SKU interno | Preço | Quem paga |
|---|---|---|---|
| Modo Consultório (standalone) | CONSULTORIO_MONTHLY | R$ 29,90/mês | Usuário sem Assistentes |
| Modo Consultório (upgrade) | CONSULTORIO_UPGRADE | R$ 19,90/mês | Quem já tem Assistentes |
| Assistentes (upgrade) | AGENTS_UPGRADE | R$ 19,90/mês | Quem já tem Modo Consultório |
| MedStation AI Pro 2 (combo) | PRO2_BUNDLE | R$ 49,90/mês | Novos usuários querendo tudo |

Manter ativos os preços existentes:
- Assistentes standalone: R$ 29,90/mês (já existe — `prod_TgR7u5urUle7om`)
- Assistentes anual: R$ 299,90/ano (já existe)

Lógica de gating no `check-subscription`:
- `has_agents`: assinou qualquer SKU contendo Assistentes (AGENTS, AGENTS_UPGRADE, PRO2_BUNDLE)
- `has_consultorio` (novo): assinou CONSULTORIO_*, ou PRO2_BUNDLE
- `available_upgrade`: backend devolve qual SKU de upgrade o usuário pode comprar

## 2. Banco de Dados

Adicionar em `subscribers` (ou criar tabela equivalente) colunas:
- `has_consultorio BOOLEAN`
- `consultorio_product_id TEXT`

Atualizada pelo `check-subscription` a cada verificação.

## 3. Backend — Edge Functions

**`check-subscription`** (editar):
- Listar TODAS as subscriptions ativas do customer (não só uma)
- Retornar `has_agents`, `has_consultorio`, `product_ids[]`, `subscription_end`
- Detectar bundle PRO2 → liga ambas as flags

**`create-checkout`** (editar):
- Receber `priceId` + validar elegibilidade do upgrade no servidor
  - Tentou comprar CONSULTORIO_UPGRADE sem ter Assistentes → erro 403
  - Tentou comprar AGENTS_UPGRADE sem ter Consultório → erro 403
  - Tentou comprar standalone tendo o complementar → sugere bundle
- Cria checkout session normalmente

**`SubscriptionContext`** (frontend):
- Expor `hasConsultorio`, `availableUpgrade`
- Usado por `PremiumAgentGuard` análogo (criar `PremiumConsultorioGuard`)

## 4. Sidebar — Separar Clínicus do Modo Consultório

`AppSidebar.tsx`: hoje Clínicus engloba ambos. Passa a haver:
- **Clínicus** → `/clinicus` (chat AHE puro)
- **Modo Consultório** → `/consultorio` (rota nova com a UI ao vivo)

`Clinicus.tsx`: remover o banner de "Ativar Modo Consultório" e o toggle interno. Vira só o chat.

Criar `src/pages/Consultorio.tsx`: monta direto o componente `ConsultationMode` em tela cheia, com `PremiumConsultorioGuard` envolvendo. Usuário sem assinatura vê paywall com CTA.

Adicionar rota em `App.tsx`.

## 5. Landing Page — Seção na Home

Em `src/pages/Home.tsx`, inserir nova seção entre Assistentes e Pricing:
- Título: "Modo Consultório — Produza mais. Digite menos. Em tempo real."
- Visual: mockup do fluxo (paciente fala → transcrição ao vivo → AHE estruturada)
- 3 bullets: Transcrição híbrida (Scribe + Whisper), Anti-alucinação estrita, Anamnese pronta ao final
- CTA primário: "Conhecer o Modo Consultório" → `/consultorio-landing`
- CTA secundário: "Assinar agora — R$ 29,90/mês"

## 6. Landing Page Dedicada — `/consultorio-landing`

Novo arquivo `src/pages/ConsultorioLanding.tsx` seguindo a estética de `Home.tsx`:
- Hero: "Produza mais. Digite menos. Direto da consulta."
- Sub-hero: parágrafo sobre transcrição em tempo real durante atendimento
- Demo visual (placeholder estático ou GIF do fluxo real)
- Como funciona (3 passos): 1) Inicia consulta 2) Conversa naturalmente 3) AHE pronta
- Tecnologia: Scribe v2 ao vivo + Whisper na revisão final + zero alucinação
- Casos de uso: consultório, ambulatório, telemedicina
- Pricing inline com lógica condicional baseada no `SubscriptionContext`:
  - Não logado / sem nada → mostra 3 cards: Consultório R$29,90, Assistentes R$29,90, **Pro 2 R$49,90 (destacado)**
  - Já tem Assistentes → mostra card destacado "Adicione Consultório por +R$19,90"
  - Já tem Consultório → não vê CTA aqui (mas vê cross-sell de Assistentes na própria página)
- FAQ: por que pago à parte? (custos), posso testar? (garantia 7 dias), funciona offline?
- Footer com mesmo padrão

## 7. Página de Pricing (`/pricing`)

Reestruturar para refletir os 3 planos + lógica de upgrade:

```text
┌──────────────┐  ┌──────────────┐  ┌────────────────────┐
│  Assistentes │  │  Consultório │  │  Pro 2 (Bundle)    │
│   R$ 29,90   │  │   R$ 29,90   │  │   R$ 49,90 ⭐      │
│   10 assist. │  │  Transcrição │  │  Tudo incluso      │
└──────────────┘  └──────────────┘  └────────────────────┘
```

Banner condicional acima dos cards quando o usuário já tem 1 dos 2:
- "Você já tem Assistentes. Complete sua estação por apenas R$ 19,90/mês →"
- "Você já tem Consultório. Adicione 10 Assistentes por apenas R$ 19,90/mês →"

## 8. Componentes Novos / Editados

**Novos:**
- `src/pages/Consultorio.tsx` — wrapper do ConsultationMode + guard
- `src/pages/ConsultorioLanding.tsx` — landing dedicada
- `src/components/PremiumConsultorioGuard.tsx` — paywall específico
- `src/components/UpgradeBanner.tsx` — banner de cross-sell condicional

**Editados:**
- `src/lib/subscription-tiers.ts` — adicionar 4 novos SKUs + helpers
- `src/contexts/SubscriptionContext.tsx` — `hasConsultorio`, `availableUpgrade`
- `src/components/AppSidebar.tsx` — separar entradas
- `src/pages/Clinicus.tsx` — remover toggle/banner do Consultório
- `src/pages/Home.tsx` — nova seção Consultório
- `src/pages/Pricing.tsx` — 3 planos + banner upgrade
- `src/App.tsx` — novas rotas
- `supabase/functions/check-subscription/index.ts` — múltiplas subs + flag consultório
- `supabase/functions/create-checkout/index.ts` — validação de elegibilidade

## 9. Detalhes Técnicos

- **Stripe**: criar produtos via tool `create_stripe_product_and_price` em LIVE, não no código.
- **Migração**: adicionar colunas em `subscribers` via `supabase--migration`.
- **Memória**: atualizar `mem://monetization/production-pricing-v2` com a nova matriz e criar `mem://monetization/consultorio-pricing-logic` com a lógica de upgrade cruzado.
- **Garantia**: aplicar a mesma política de 7 dias do `mem://monetization/money-back-guarantee-policy`.
- **Mobile**: ambas as landings e Pricing precisam respeitar `mem://design/mobile-first-optimization-priority`.
- **Terminologia**: nunca chamar de "agentes" — sempre "assistentes" (`mem://terminology/agent-naming`).

## 10. Ordem de Execução

1. Criar produtos+preços no Stripe (LIVE) e colher IDs
2. Migração DB (colunas em `subscribers`)
3. Atualizar `subscription-tiers.ts` com IDs reais
4. Editar edge functions (`check-subscription`, `create-checkout`)
5. Editar `SubscriptionContext`
6. Criar `Consultorio.tsx` + `PremiumConsultorioGuard` + rota
7. Editar `AppSidebar` e limpar `Clinicus.tsx`
8. Criar `ConsultorioLanding.tsx` + rota
9. Editar `Home.tsx` (seção nova)
10. Reestruturar `Pricing.tsx` + `UpgradeBanner`
11. Atualizar memórias

## Perguntas Antes de Executar

1. **Período de cobrança**: ofereço também plano anual do Consultório (ex: R$ 299,90/ano) e do Pro 2 (ex: R$ 499,90/ano)? Ou só mensal por enquanto?
2. **Trial / garantia**: aplicar os mesmos 7 dias de garantia incondicional ao Consultório?
3. **Quem já assinou Assistentes hoje**: deve ver o upsell de R$ 19,90 imediatamente após o deploy, certo? (Sim por padrão.)
4. **Studius**: o Modo Consultório entra em alguma lógica do Studius ou são totalmente independentes?
