# Experiência de leitura premium no chat do Clínicus

Só frontend. Sem backend, sem mudança de prompt, sem mudança no formato do texto gerado (continua CAPS + linhas em branco + bullets). O que muda é como esse texto é exibido.

## Problema atual

A resposta do assistente é jogada dentro de um balão cinza estreito, em um único parágrafo com fonte pequena (`text-sm`) e sem hierarquia. Um AHE longo vira um bloco espremido, difícil de escanear e de copiar por partes.

## O que será feito (apenas Clínicus)

1. **Resposta em formato documento, sem balão**
   - Mensagem do assistente passa a ser uma folha limpa: fundo sutil, borda leve, largura confortável de leitura (até ~78 caracteres por linha), respiro generoso.
   - Mensagem do usuário continua exatamente como está (balão verde à direita).

2. **Hierarquia automática de seções**
   - Um parser de apresentação identifica títulos em CAIXA ALTA, bullets e linhas `RÓTULO: valor`.
   - Título de seção: menor, com letter-spacing, cor de destaque e um filete separando os blocos.
   - Bullets viram lista real com marcador discreto; texto corrido ganha altura de linha maior.
   - Nada de markdown: os `**` continuam removidos, nenhum `#` aparece.

3. **Copiar por seção**
   - Botão discreto no canto de cada bloco (hover no desktop, sempre visível no toque) que copia só aquela seção.
   - Ações atuais da mensagem (Ler, Maiúscula, Copiar) continuam, reorganizadas numa barra inferior alinhada.

4. **Leitura e ritmo**
   - Fonte base maior na resposta do Clínicus e escala ainda maior no Modo Foco / leitura ampliada.
   - Seções aparecem com fade-in suave conforme chegam no streaming, e o cursor de digitação fica no fim do último bloco.
   - Índice rápido opcional: chips com os nomes das seções no topo de respostas longas, que rolam até o bloco.

5. **Estados de qualidade**
   - "Pensando..." mantém o indicador atual.
   - Respostas curtas ou de conversa (modo Discussão) caem no render simples, sem virar documento — só o formato estruturado ganha seções.

## Detalhes técnicos

- Novo `src/lib/clinicalResponse.ts`: parser puro que transforma texto em blocos (`heading` | `paragraph` | `bullets` | `keyValue`), com testes Vitest cobrindo AHE típico, texto sem estrutura e conteúdo em streaming parcial.
- Novo `src/components/chat/StructuredResponse.tsx`: renderiza os blocos, botão de copiar por seção, chips de índice, animação de entrada.
- `src/components/AgentChat.tsx`: no ramo de render da mensagem, quando `agentType === "clinicus"` e `msg.role === "assistant"`, usar `StructuredResponse` em vez do `<p>`; remover fundo de balão só nesse caso. Demais assistentes ficam idênticos ao que são hoje.
- O diálogo de leitura ampliada usa o mesmo componente para manter consistência.
- Somente tokens semânticos de cor (sem `text-white`, sem hex fixo), preservando tema claro/escuro.
- Desktop e mobile validados: layout mobile não pode encolher, largura de leitura usa `max-w` responsivo.

## Fora de escopo

Nenhuma alteração em Edge Functions, prompts, banco, ou nos outros assistentes. Se você gostar do resultado, aplico o mesmo padrão aos demais em um passo seguinte.
