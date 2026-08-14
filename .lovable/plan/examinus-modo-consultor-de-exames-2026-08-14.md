# Examinus — Modo Consultor de Exames

Nova opção dentro do Examinus (não é um novo assistente). Um botão liga o "Modo Consultor", e o Examinus deixa de apenas extrair/resumir resultados e passa a raciocinar sobre exames.

## O que o modo entrega

Quatro comportamentos, reconhecidos automaticamente pelo que o médico escreve:

1. Comando curto ("marcadores tumorais", "painel de tireoide")
   Lista os exames do painel, com o que cada um investiga, quando pedir e limitações.
2. Caso clínico colado
   Devolve exames essenciais (obrigatórios), complementares (úteis conforme evolução) e dispensáveis, com justificativa curta por item.
3. Nome de um exame
   Contraindicações absolutas e relativas, preparo, riscos, cuidados (contraste, gestação, função renal, marca-passo, alergias, jejum) e alternativas.
4. Exame ou procedimento desconhecido
   Explica o que é, indicação, como é feito e o que o resultado significa na prática.

Saída sempre no padrão da plataforma: cabeçalhos em CAPS, bullets, sem markdown. Em toda resposta, uma linha final de responsabilidade clínica (decisão final é do médico).

## Interface

- Um toggle novo na barra de opções do Examinus, ao lado de "Alterados / Impressão / Compacto", com rótulo "Consultor" e ícone próprio.
- Presente igualmente na barra desktop e na fileira de pílulas do mobile — mesmo tamanho e altura dos toggles atuais, sem alterar o layout existente.
- Ao ligar, os toggles de formatação de resultado (barra "|", Horário, Alterados, Compacto) ficam ocultos/desativados, pois não se aplicam a esse modo.
- O placeholder do campo muda para algo como: "Peça um painel, cole um caso ou pergunte sobre um exame".

## Técnico

- `src/components/AgentChat.tsx`: novo estado `examSuggestMode`, enviado no corpo da chamada junto com os demais parâmetros do Examinus; renderização dos toggles condicionada a ele.
- `supabase/functions/agent-chat/index.ts`: quando `examSuggestMode` for verdadeiro e o agente for examinus, usar um prompt de sistema consultivo (com as 4 rotas acima, base em evidências e aviso clínico) no lugar do prompt extrator; manter o escudo anti-extração e o log de uso.
- Temperatura levemente acima de 0 apenas nesse modo, para raciocínio clínico.

Nada mais na plataforma é alterado.
