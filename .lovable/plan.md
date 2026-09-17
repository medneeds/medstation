# Auditoria e melhoria do Modo Escuta (Consultório)

## O que encontrei hoje

Auditei a tela de escuta, o motor de transcrição, a estruturação da anamnese e o fluxo de finalização. O que está bom e o que quebra numa consulta longa:

**Funciona bem**
- Transcrição ao vivo aparece na hora, com trecho parcial no cabeçalho.
- Identificação manual de quem fala (médico, paciente, acompanhante) com atalhos 1/2/3.
- Anamnese se reescreve sozinha durante a conversa e ao finalizar.
- Fluxo de finalização com etapas, cópia e salvamento em pasta.

**Problemas reais**

1. **Não há limite nem aviso de tempo.** O cronômetro só sobe. Numa consulta longa a conexão de transcrição pode cair sem que o médico perceba e ele segue falando achando que está gravando.
2. **Se a conexão de escuta cai, nada avisa e nada reconecta.** Aparece um erro discreto e a gravação continua "ligada" sem transcrever. Esse é o risco mais grave de uma sessão de 60 minutos.
3. **A revisão final quebra em consultas longas.** Hoje o áudio inteiro da consulta é guardado na memória do navegador e enviado de uma vez só ao serviço de transcrição. Acima de ~20 minutos isso estoura o limite de tamanho aceito e a revisão falha — justamente na consulta mais importante.
4. **Nada fica salvo até o médico apertar salvar.** Se a aba fechar, o navegador travar ou o celular bloquear, a consulta inteira se perde.
5. **O cronômetro atrasa** quando a aba fica em segundo plano (conta "tiques", não tempo real).
6. **Pausar não é seguro numa sessão longa:** o microfone é silenciado mas a conexão fica aberta parada, e serviços de escuta derrubam conexões sem áudio.
7. **A estruturação ao vivo é "tudo ou nada"**: a cada 3 falas reescreve a anamnese inteira, sem mostrar o que mudou de forma fluida nem garantir uma passada final única e confiável.

## O que vou construir

### 1. Escuta de até 60 minutos, com segurança
- Limite de sessão de 60 minutos, com o cronômetro mostrando **tempo restante** a partir dos últimos 10 minutos.
- Aos 10, 5 e 1 minuto: aviso visível e discreto (barra muda de cor, contagem regressiva em destaque).
- Ao chegar a zero: encerramento automático e elegante — finaliza, estrutura a anamnese e mostra a tela de conclusão, sem perder nada.
- Cronômetro passa a usar relógio real, então não atrasa com a tela bloqueada ou aba em segundo plano.

### 2. Escuta que não cai
- Detecção de queda de conexão e **reconexão automática** (até 3 tentativas), mantendo a transcrição já feita.
- Enquanto reconecta: aviso claro "Reconectando a escuta…". Se não voltar, aviso franco de que a escuta parou e como retomar.
- Pausa passa a encerrar a escuta de verdade e retomar com conexão nova — sem conexões ociosas derrubadas pelo serviço.
- Indicador de saúde da escuta sempre visível: Ao vivo / Reconectando / Parado.

### 3. Transcrição que aparece e fica salva
- Salvamento automático contínuo no próprio aparelho (a cada nova fala), incluindo tempo, falantes e anamnese parcial.
- Ao reabrir o Consultório depois de uma queda: aviso "Encontramos uma consulta não finalizada de há X minutos — retomar ou descartar?".
- Rascunho é limpo automaticamente quando o caso é salvo ou descartado.

### 4. Revisão final que aguenta 60 minutos
- O áudio da consulta passa a ser revisado **em blocos de ~10 minutos**, enviados em sequência e recolados em um texto único — acaba o estouro de tamanho.
- Progresso real por bloco na tela de finalização ("Revisando 3 de 6").
- Se um bloco falhar, os demais seguem e a transcrição ao vivo cobre a parte que faltou — nunca perde a consulta inteira.

### 5. Transformação em anamnese mais fluida
- Estruturação ao vivo passa a atualizar por seção, destacando suavemente só o que mudou, sem "piscar" o painel inteiro.
- Ritmo adaptativo: atualiza com mais folga em consultas longas para não competir com a escuta.
- Uma passada final única de alta qualidade ao finalizar, usando o texto revisado.
- Contador de seções preenchidas com progresso visível durante a conversa.

## Notas técnicas

- `src/hooks/useConsultation.ts`: cronômetro baseado em `Date.now()`, limite `MAX_SESSION_SECONDS = 3600` com auto-finalização, estado `listeningHealth` (`live | reconnecting | down`), reconexão do Scribe com backoff, persistência em `localStorage` (`consultorio-draft-v1`) com debounce, gravação em blocos por `MediaRecorder` reiniciado a cada 10 min (`chunkedAudioRef`).
- `runFinalReview` passa a iterar blocos, chamando `consultation-transcribe` por bloco e concatenando; expõe `reviewProgress {done,total}`.
- `ConsultationMode.tsx`: contagem regressiva no chip de tempo, faixa de aviso nos marcos, banner de reconexão, diálogo de rascunho recuperado.
- `FinalizeFlow.tsx`: etapa "Revisando o áudio" com progresso por bloco.
- `StructuredPane.tsx`: destaque por seção em vez de re-render total.
- Sem mudanças de backend; `consultation-transcribe` já aceita blocos individuais.
- Portões: `bun x tsgo --noEmit -p tsconfig.app.json`, `bun x vitest run`, `bun run build`. Nada publicado sem seu pedido.
