# ECG como modalidade de primeira classe no Interpretador do Examinus

## Entendimento
Hoje existem dois interpretadores separados: Radiografia (Examinus, `radiograph-interpret`) e ECG (Clínicus, `ecg-interpret`). Você quer que o ECG passe a ser uma modalidade do MESMO fluxo de interpretação já polido no Examinus — mesma estética, mesmo histórico, streaming, segurança e continuidade de conversa — sem redesenhar o produto e sem quebrar Radiografia nem os modos antigos.

Premissa que assumo (corrija se for diferente): o Interpretador de ECG que já existe dentro do Clínicus permanece funcionando como está. O que muda é que o Examinus ganha ECG como modalidade explícita, reutilizando o mesmo motor `ecg-interpret` já validado.

## O que será construído

### 1. Seletor de modalidade no Interpretador do Examinus
- Ao ligar "Interpretador", aparece uma escolha discreta entre **Radiografia** e **ECG** (pílulas, mesmo estilo das atuais; desktop e mobile).
- A escolha fica salva na conversa e pode ser trocada manualmente a qualquer momento.
- Todo o resto da tela (fila de anexos, preview, envio sem texto, bolhas, chips) continua igual.

### 2. Reconhecimento automático da modalidade
- Ao anexar, o app tenta reconhecer se é ECG (nome do arquivo, proporção da imagem, dicas de conteúdo) e já posiciona a modalidade correta.
- Reconhecimento é apenas uma sugestão: nunca bloqueia nem impede a correção manual, e mostra de forma visível qual modalidade será usada antes de enviar.

### 3. Suporte a PDF
- PDF passa a ser aceito nos dois interpretadores: as páginas são convertidas em imagem no navegador (já existe `src/utils/pdfToImages.ts`) e a imagem original resultante é a que vai ao modelo — nunca OCR.
- Limite mantido: até 4 imagens, 10 MB cada.

### 4. Prompt e contrato de saída do ECG
O prompt do ECG é próprio da modalidade (não é o de radiografia renomeado) e será ampliado para cobrir exatamente o que você pediu:
qualidade técnica e se as 12 derivações estão visíveis; calibração/velocidade/ganho só se visíveis; frequência ventricular e atrial; ritmo; eixo; PR, QRS, QT/QTc apenas quando mensuráveis com segurança — caso contrário "não mensurável com segurança a partir desta imagem"; distúrbios de condução; morfologia P/QRS/T; ST-T e isquemia; critérios de hipertrofia só se avaliáveis; impressão priorizada; achados críticos em destaque; correlação clínica breve.
Regras rígidas: nada de medidas inventadas a partir de baixa resolução; nada de inferir derivação/velocidade/ganho/fórmula de QTc; achado urgente sinalizado com linguagem clara e não categórica, recomendando avaliação imediata; imagem ilegível/cortada gera resposta de qualidade e limitação acionável, não interpretação fabricada.

### 5. Continuidade da conversa
- "Fazer laudo", "qual o QTc?", "há bloqueio?", "compare os achados" usam o MESMO traçado já anexado, sem novo upload.
- Após reload/reabertura pelo histórico, as evidências corretas são reidratadas e o follow-up continua funcionando.
- O metadado da mensagem e da evidência distingue ECG de radiografia, e é ele que roteia o follow-up para o motor certo.
- Isolamento por usuário mantido: bucket privado, checagem explícita de propriedade no servidor, JWT obrigatório.

## Detalhes técnicos
- `src/lib/interpreterModality.ts` (novo): modalidade ativa, detecção automática, roteamento de follow-up por metadado.
- `src/lib/radiologyInterpreter.ts` / `src/lib/ecgInterpreter.ts`: aceitar PDF na validação; conversão feita no AgentChat antes do upload.
- `supabase/functions/_shared/ecg-interpreter.ts`: prompt ampliado (mensurabilidade, 12 derivações, hipertrofia, achados críticos, resposta de limitação).
- `src/components/AgentChat.tsx`: estado da modalidade, seletor, roteamento de envio/follow-up, persistência em `messages.metadata` e `evidences.metadata`. Sem migration nova.
- Deploy apenas de `ecg-interpret` (prompt) — Radiografia intocada.

## Validação antes de publicar
Vitest completo, typecheck, build, ESLint nos arquivos tocados, e E2E autenticado descartável no preview: ECG só anexo → interpretação → "faça o laudo" → reload → pergunta sobre o mesmo traçado → conferência de persistência/evidência no banco → remoção total do usuário, storage e linhas de teste. Regressão explícita do fluxo de Radiografia e dos modos antigos. Nada é publicado até você aprovar o resultado dos gates.
