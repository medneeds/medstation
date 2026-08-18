# Reengajamento: 7 dias com a plataforma inteira

## Objetivo
Antes de cortar o acesso gratuito ao Examinus, dar a todos os usuários já cadastrados (não assinantes) 7 dias completos com tudo liberado — 12 assistentes, Modo Escuta e Modo Rotineiro — com contagem regressiva visível dentro da plataforma.

## Como funciona

1. **Concessão retroativa (uma vez só)**
   Todos os usuários cadastrados hoje que não têm assinatura ativa recebem um acesso de cortesia de 7 dias, começando na data em que a mudança for aplicada. Quem já assina não é afetado. Quem se cadastrar depois continua no teste normal de 7 dias por idade de conta.

2. **Sinalização clara de "teste"**
   Hoje o acesso de cortesia é tratado como assinatura silenciosa. Passa a ser marcado como período de teste, com data de término, para que a plataforma possa avisar o usuário.

3. **Destaque dentro da plataforma**
   - Faixa fixa no topo do painel com "Seu acesso completo termina em X dias" + botão "Garantir R$ 49,90/mês".
   - Cartão de destaque no Dashboard (o mesmo espaço do aviso atual) com o que está liberado e o valor travado por 12 meses.
   - Nos últimos 2 dias a faixa muda de tom (urgência) e mostra "último dia" quando for o caso.
   - Ao terminar, o usuário cai na tela de assinatura já existente.

4. **Painel administrativo**
   Nova linha de acompanhamento: quantos estão em teste estendido, quantos converteram, quantos expiraram.

## Detalhes técnicos
- Registro do benefício via `courtesy_access` com `source = 'legacy_trial'` e `expires_at = now() + 7 dias`, inserido apenas para perfis sem assinatura ativa e sem cortesia vigente.
- `check-subscription` passa a retornar `trial: true` e `trial_source` quando o acesso vier de cortesia com prazo, e `SubscriptionContext` expõe esses campos.
- Novo componente `TrialCountdownBanner` no `DashboardLayout`; ajuste no `FreeExaminusSpotlight` para o texto do teste estendido.
- `admin-list-subscribers` já lê cortesia; adicionar contagem por `source` no dashboard admin.

## Confirmações antes de executar
- A contagem dos 7 dias começa no momento em que eu aplicar (não na data de cadastro) — ou seja, todos ganham 7 dias cheios a partir de hoje.
- Vale para todos os ~70 cadastrados sem assinatura ativa, incluindo quem nunca usou.
