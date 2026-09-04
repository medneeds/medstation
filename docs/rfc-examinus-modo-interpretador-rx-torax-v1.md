# RFC — Examinus · Modo Interpretador V1 (RX de Tórax)

Status: IMPLEMENTATION
Data: 2026-09-04
Escopo: MedStation / Examinus

## 1. Decisão de produto

O Modo Interpretador é um modo especializado dentro do Examinus. Não cria um novo assistente. A navegação conceitual permanece:

- Extrator
- Consultor
- Interpretador

A V1 é deliberadamente restrita a radiografia simples de tórax. TC, RM, USG, mamografia e DICOM ficam fora do escopo inicial.

Objetivo: transformar o Examinus de um leitor de texto contido em imagens em um copiloto visual capaz de olhar a radiografia original, integrar contexto clínico e manter conversa sobre o exame.

## 2. Regra arquitetural principal

No Modo Interpretador, a radiografia original deve obrigatoriamente chegar ao modelo multimodal.

Fluxo proibido:

imagem -> OCR -> texto -> interpretação

Fluxo obrigatório:

imagem original + contexto clínico + histórico relevante -> modelo multimodal -> interpretação

OCR pode existir apenas como apoio para leitura de marcadores ou texto da imagem, nunca como substituto da imagem diagnóstica.

## 3. Escopo funcional da V1

### Entrada

- JPG, JPEG, PNG ou WEBP.
- Uma ou mais imagens da mesma avaliação, respeitando limite técnico do modelo.
- Contexto clínico opcional em texto.
- Conversa subsequente sobre as imagens já anexadas.

### Saídas

1. Interpretação completa.
2. Avaliação rápida.
3. Laudo preliminar.
4. Discussão interativa sobre achados.
5. Reanálise focal, por exemplo: “olhe melhor a base direita”.
6. Avaliação de dispositivos quando solicitado.

### Fora de escopo na V1

- DICOM nativo.
- Window/level e ferramentas PACS.
- TC/RM/USG.
- Medidas que dependam de escala DICOM.
- Laudo definitivo autônomo.
- Sistema automático de notificação clínica fora da sessão.

## 4. Interface

O Examinus recebe um novo toggle `Interpretador`, ao lado do `Consultor`.

Quando ativo:

- controles de formatação laboratorial ficam ocultos;
- o upload aceita apenas imagens compatíveis com a V1;
- o placeholder muda para linguagem de interpretação radiográfica;
- imagens anexadas aparecem em preview antes do envio;
- o usuário pode remover uma imagem antes de enviar;
- o botão de envio chama o motor multimodal próprio do Interpretador.

A conversa continua usando a experiência visual do `AgentChat` para histórico, streaming, cópia e continuidade.

## 5. Persistência

As imagens são armazenadas no bucket privado `evidences`, já protegido por RLS.

Cada imagem cria uma evidência com:

- `type = image`
- `source_type = upload`
- `origin = examinus_interpreter`
- `metadata.modality = xray`
- `metadata.body_region = chest`
- `metadata.mode = radiology_interpreter`

A mensagem que originou a interpretação persiste os IDs das evidências anexadas em metadata de mensagem na V1. Isso evita base64 no banco e permite reidratar a conversa após reload. Se o produto passar a aceitar anexos heterogêneos em múltiplos módulos, esse vínculo poderá ser extraído para uma tabela relacional dedicada sem alterar o contrato do motor multimodal.

## 6. Backend

Nova Edge Function:

`supabase/functions/radiograph-interpret/index.ts`

Responsabilidades:

1. autenticar usuário;
2. validar acesso comercial;
3. validar payload e IDs de evidência;
4. confirmar propriedade das evidências;
5. baixar as imagens do bucket privado;
6. construir mensagem multimodal;
7. aplicar prompt especializado em radiografia de tórax;
8. chamar modelo multimodal configurável;
9. responder em streaming;
10. registrar uso, latência, modelo e custo no logger central.

O motor não deve ser incorporado ao `agent-chat` geral para evitar acoplamento entre interpretação visual e os demais assistentes.

## 7. Prompt modular

Estrutura lógica:

- base radiológica e regras de segurança;
- protocolo de RX de tórax;
- achados críticos;
- formato de saída;
- contexto clínico;
- histórico da conversa.

A V1 deve seguir busca sistemática:

- qualidade técnica (rotação, inspiração, projeção/posicionamento, exposição);
- via aérea;
- pulmões e pleuras;
- coração, circulação, mediastino e hilos;
- diafragma;
- ossos e partes moles;
- dispositivos;
- segunda revisão: ápices, retroclaviculares, hilos, retrocardíaco, bases, ângulos costofrênicos, subdiafragmático e estruturas ósseas.

## 8. Formatos de saída

### Interpretação completa

TÉCNICA E QUALIDADE
ACHADOS
IMPRESSÃO
ACHADOS POTENCIALMENTE CRÍTICOS
LIMITAÇÕES
CONFIANÇA
CORRELAÇÃO CLÍNICA

### Avaliação rápida

- qualidade resumida;
- até três principais achados;
- presença/ausência de emergência radiográfica evidente;
- impressão curta.

### Laudo

EXAME
INDICAÇÃO
TÉCNICA
COMPARAÇÃO
ACHADOS
CONCLUSÃO

## 9. Segurança clínica

O produto se apresenta como análise radiográfica preliminar e segunda leitura para profissional de saúde.

Regras:

- nunca inventar incidência, idade, sexo, sintomas ou medidas;
- não afirmar exclusão de doença quando o método/técnica não permite;
- considerar magnificação em AP portátil antes de afirmar cardiomegalia;
- declarar limitações de incidência única, baixa inspiração, rotação, baixa resolução e recorte anatômico;
- não usar porcentagens fictícias de probabilidade;
- confiança apenas como ALTA, MODERADA ou BAIXA;
- priorizar possíveis achados críticos de forma explícita;
- não substituir laudo radiológico definitivo nem julgamento clínico.

## 10. Achados potencialmente críticos da V1

- pneumotórax significativo / suspeita de tensão;
- derrame pleural volumoso;
- edema pulmonar importante;
- alargamento mediastinal potencialmente agudo;
- tubo orotraqueal mal posicionado;
- CVC mal posicionado;
- sonda enteral projetada sobre via aérea;
- complicação aguda de dispositivo quando visível.

A presença de possível achado crítico altera a prioridade visual da resposta, mas não dispara alerta fora da sessão.

## 11. Telemetria

Registrar, quando disponível:

- `assistant = examinus`
- `mode = radiology_interpreter`
- `modality = xray`
- `body_region = chest`
- `images_count`
- `model`
- `latency_ms`
- tokens de entrada/saída
- custo estimado
- formato de saída solicitado

Não registrar conteúdo clínico ou imagem em logs de observabilidade.

## 12. Critérios de aceite técnico

- imagem no Interpretador não passa por `extract-file-text`;
- imagem original chega como conteúdo visual ao modelo;
- usuário não consegue acessar evidência de outro usuário;
- upload inválido é bloqueado antes de consumir IA;
- resposta faz streaming;
- histórico textual continua funcional;
- IDs de evidência ficam persistidos com a mensagem;
- reload da conversa permite continuar discutindo a mesma radiografia;
- modo Extrator e modo Consultor não sofrem regressão;
- uso é registrado no logger central.

## 13. Critérios de aceite clínico inicial

Criar conjunto de avaliação anonimizável com, no mínimo:

- normal;
- pneumotórax;
- derrame pleural;
- consolidação focal;
- edema pulmonar;
- atelectasia;
- cardiomegalia em PA;
- AP portátil com magnificação cardíaca;
- hiperinsuflação;
- TOT bem posicionado;
- TOT seletivo;
- CVC mal posicionado;
- exame hipoinspirado;
- exame rotado.

Toda mudança relevante de modelo ou prompt deve ser comparada contra esse conjunto antes de promoção para produção.

## 14. Evolução planejada

Fase 2: múltiplas incidências e comparação temporal.
Fase 3: dispositivos/pós-procedimento refinado.
Fase 4: musculoesquelético.
Fase 5: abdome.
Fase 6: DICOM/PACS e ferramentas de visualização, se houver viabilidade regulatória e técnica.
