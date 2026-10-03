# Microfone dos assistentes: texto aparecendo enquanto fala + nunca perder a voz

## O que a auditoria encontrou

Os serviços de voz estão funcionando: testei agora com fala real. As falhas vêm do jeito que o microfone dos assistentes (Clínicus, Examinus, Prescriptus, Rotina etc.) foi montado:

1. Nenhum texto aparece enquanto o médico fala. A gravação só é enviada ao tocar em ✓, então o médico não sabe se está sendo ouvido.
2. Se o envio falha (rede do hospital, conexão instável, aba suspensa), o áudio é descartado. A fala inteira se perde e não há como tentar de novo.
3. Médicos em teste grátis podem ver o microfone bloqueado. O microfone verifica "assinante pago", e não "acesso liberado". Quem está nos 7 dias de teste fica de fora.
4. Uma gravação com menos de cerca de 1 segundo é recusada com uma mensagem pouco clara.
5. O cronômetro conta "tiques", e não o tempo real. Com a tela bloqueada, ele atrasa e o limite de 15 minutos fica errado.

## O que vou construir

### 1. Fala aparecendo na hora
- Ao tocar no microfone, as palavras surgem ao vivo no painel de gravação, como uma legenda.
- Cada frase que termina vai direto para o campo de texto, sem esperar o ✓.
- O médico pode parar a qualquer momento: o que foi dito já está escrito.

### 2. Rede de segurança dupla
- Junto com a escuta ao vivo, o áudio continua sendo gravado no aparelho como cópia de segurança.
- Se a escuta ao vivo cair, ela reconecta sozinha e avisa: "Reconectando…".
- Se não reconectar, ao tocar em ✓ a cópia gravada é transcrita do jeito atual. Nada se perde.
- Se a transcrição da cópia falhar, o áudio fica guardado e aparece um botão "Tentar de novo".
- Se a rede bloquear a escuta ao vivo (por exemplo, no hospital), o microfone passa sozinho para o modo de gravar e transcrever no final.

### 3. Microfone liberado para quem tem acesso
- O microfone passa a valer para todos com acesso ativo, inclusive no teste de 7 dias.

### 4. Ajustes finos
- O cronômetro passa a usar o relógio real.
- A mensagem de gravação curta fica mais clara.
- Indicador discreto no painel: Ao vivo / Reconectando / Gravando cópia.

## Mudança visual
O painel de gravação, que fica fixo embaixo, ganha uma faixa de 2 a 3 linhas com a legenda ao vivo, acima da onda sonora. Os botões ✕ e ✓ continuam no mesmo lugar. O resto da tela não muda, nem no computador nem no celular.

## Notas técnicas
- `AgentVoiceInput.tsx`: `useScribe` (scribe_v2_realtime, VAD, `por`) com token de `elevenlabs-scribe-token`; frases confirmadas → `onTranscription` incremental; `MediaRecorder` em paralelo como backup; fallback para `agent-transcribe` quando a escuta ao vivo não entregou texto; blob guardado em ref para "Tentar de novo"; gate trocado de `subscribed` para acesso ativo do `SubscriptionContext`; timer por `Date.now()`.
- O microfone não é compartilhado: a escuta ao vivo recebe o mesmo `MediaStream` (ou o SDK abre o dele e o gravador usa o mesmo track).
- Teste novo: regra de liberação do microfone (teste grátis = liberado; sem acesso = bloqueado).
- Sem mudanças no servidor. Sem publicar sem pedido.
