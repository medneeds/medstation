# Ícones dos assistentes com mais profundidade 3D

Foco: aprofundar a sensação de volume e material (vidro esverdeado) dos ícones, mantendo o movimento discreto atual (intensidade 3/5) e a identidade verde da marca. Sem alterar tamanhos de layout.

## O que muda visualmente

- Vidro real em vez de fundo chapado: gradiente diagonal em duas camadas, borda superior clara (luz vindo de cima) e borda inferior escurecida, criando espessura.
- Sombra projetada verde por baixo do ícone, com contato mais escuro na base — o ícone passa a "flutuar acima" da superfície.
- Reflexo especular fixo no canto superior esquerdo + reflexo passante lento (já existe, será suavizado para não competir com a profundidade).
- Ícone com leve elevação sobre o vidro: sombra própria e traço um pouco mais fino, dando separação entre glifo e placa.
- Nos estados grandes (tela inicial do chat), anel externo duplo com opacidades diferentes para reforçar a profundidade do orbe.
- Estado hover (onde clicável): a placa inclina levemente e o brilho acompanha, reforçando o volume sem animação exagerada.

## Onde aplica

1. **Chat interno** — cabeçalho do assistente e orbe grande da tela inicial (já usa o componente; ganha a nova profundidade automaticamente).
2. **Sidebar** — ícones dos 12 assistentes e do Modo Escuta ganham uma versão micro do vidro (sem animação contínua, só profundidade estática + realce no item ativo/hover), preservando a altura atual das linhas do menu.
3. **Landing** — vitrine de assistentes (`AssistantPracticeShowcase`) e cards de assistentes usam a mesma placa de vidro nos ícones, em versão pequena.

## Detalhes técnicos

- Evoluir `src/components/AssistantGlyph.tsx`:
  - Adicionar variante `size="xs"` (sidebar/vitrine) e prop `interactive` (hover tilt/realce) e `animate={false}` já existente para uso estático.
  - Profundidade via `box-shadow` em camadas (inset topo claro, inset base escura, drop shadow verde externa) e gradiente duplo — todos com `hsl(var(--primary) / ...)`, sem cores fixas.
- Nova keyframe suave em `tailwind.config.ts` apenas se necessária para o realce de hover; reaproveitar `orb-float`/`orb-breathe`/`glyph-sheen` existentes.
- `src/components/AppSidebar.tsx`: envolver `item.icon` no glyph `xs` estático; manter `h-4 w-4` do ícone e o comportamento de sidebar colapsada.
- `src/components/AssistantPracticeShowcase.tsx` (e cards equivalentes na landing): substituir o ícone solto pelo glyph `xs`.
- Respeitar `prefers-reduced-motion`: desliga float/sheen, mantém a profundidade estática.
- Sem mudanças de lógica, prompts, rotas ou dados.
