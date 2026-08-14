# Elevar o chat interno ao padrão da landing

O chat público do Examinus (landing) hoje tem uma experiência bem mais cuidada que o chat interno dos assistentes. A ideia é levar tudo o que funciona na landing para dentro da plataforma, sem mexer em nenhuma regra de negócio (limites, cobrança, prompts, envio).

## Diferenças que existem hoje

| Elemento | Landing (Examinus público) | Interno (AgentChat) |
|---|---|---|
| Campo de escrita | Área grande e dominante, ações flutuando dentro dela | Linha fina de 44px com botões espremidos ao lado |
| Botão enviar | Botão largo com a palavra "Enviar" | Ícone pequeno redondo |
| Ajustes de saída | Barra com rótulo "AJUSTES DE SAÍDA", pílulas coloridas e um "i" que explica cada ajuste | Pílulas soltas, sem rótulo e sem explicação (só title do navegador) |
| Tela cheia | Botão "Expandir tela" com modo imersivo | Só aumenta a altura do campo |
| Tela inicial | Abertura com convite e o que o assistente entrega | Área vazia sem orientação |
| Contador/avisos | Rodapé discreto e alinhado ao campo | Texto solto abaixo |

## O que será feito

1. **Composer novo (o ponto principal)**
   Campo de escrita grande, com anexo, voz e botão "Enviar" flutuando dentro da própria caixa, igual à landing. Cresce conforme o texto, com rodapé fino trazendo o contador de caracteres e a dica de Enter/Shift+Enter. No celular continua compacto, com os botões em linha.

2. **Barra "Ajustes de saída" unificada**
   Os toggles de cada assistente (Examinus, Clínicus, Gasometrus, Codexus, Mediscuss, Legalis) passam a viver numa barra rotulada, com as mesmas pílulas e as mesmas cores da landing, e cada uma ganha o botãozinho "i" explicando em uma frase o que aquele ajuste faz. Os seletores (Modo, Especialidade, Contexto) entram na mesma barra, mantendo o comportamento atual.

3. **Modo tela cheia**
   Botão "Expandir tela" no cabeçalho do chat, abrindo o assistente em tela cheia com conversa e composer maiores — mesmo padrão do público.

4. **Tela inicial de cada assistente**
   Quando não há mensagens: nome do assistente, uma linha do que ele entrega e 3 sugestões clicáveis específicas do assistente, que preenchem o campo.

5. **Acabamento das mensagens**
   Balões, espaçamento, animação de entrada e ações de copiar/maiúscula/leitura ampliada alinhados ao visual da landing, com transições suaves.

## Escopo e cuidados

- Sem alteração em limites de caracteres, assinatura, prompts, Edge Functions ou fluxo de envio.
- Sem mudança na landing — ela é a referência, fica como está.
- Desktop e mobile revisados separadamente; o layout mobile atual (pílulas em linha) é preservado.

## Detalhes técnicos

- Extrair `InfoTip` e `OutputControl` de `src/components/PublicExaminusChat.tsx` para `src/components/chat/OutputControl.tsx` e reusar nos dois lados (landing passa a importar, sem mudança visual).
- Novo `src/components/chat/ChatComposer.tsx` com textarea + ações flutuantes + rodapé; `AgentChat.tsx` passa a usá-lo no lugar do bloco de input atual, mantendo `sendMessage`, `AgentVoiceInput`, upload e validações intactos.
- Estado `isFullscreen` local no `AgentChat`, com wrapper `fixed inset-0 z-[70]` (mesmo padrão do público).
- Mapa de sugestões e subtítulo por `agentType` num arquivo de dados (`src/lib/agentIntro.ts`), sem tocar nos prompts do backend.
- Só arquivos de UI são alterados; nada em `supabase/functions`.
