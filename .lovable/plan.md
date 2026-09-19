# Evolução de UTI · Versão 2 (modelo institucional) no Clínicus

Novo modelo de evolução de UTI, alternativo ao atual, seguindo o formato do documento que você enviou (com gerenciamento de risco em P.U.B.F.I.S.Q.D.). O modelo de hoje continua igual, intocado — o médico escolhe qual quer usar.

## Onde aparece

No seletor "Contexto" do Clínicus (usado com a Anamnese ativa), a lista passa de 6 para 7 opções:

- Consultório
- Enfermaria / Clínica Médica
- Emergência · Avaliação Inicial
- Emergência · Admissão Completa
- UTI · Admissão (Paciente Crítico)
- UTI · Evolução / Plantão  ← o de hoje, sem mudança
- UTI · Evolução (Modelo Institucional)  ← NOVO

## Estrutura do documento gerado

Blocos, nesta ordem, com títulos em caixa alta e sem markdown:

```text
EVOLUÇÃO MÉDICA UTI ADULTO
| DIA DE UTI:   | DATA/HORA:

DIAGNÓSTICOS
PROBLEMAS ATIVOS            (um por linha, com status: ativo / em investigação / controlado / resolvido)
HIPÓTESES DIAGNÓSTICAS      (regra já vigente na plataforma)
HPP                         (antecedentes pessoais)
ALERGIAS                    (se nada informado: "NEGA" só quando o médico disser; senão "NÃO INFORMADO")
MEDICAÇÕES DE USO DIÁRIO
HISTÓRIA CLÍNICA            (1 a 3 linhas: motivo da internação e origem)
EVOLUÇÃO MÉDICA             (narrativa do período, iniciada pelo horário quando informado)
EXAME FÍSICO                (abertura geral + ACV / AR / ABDOME / EXT. / NEURO.)
SINAIS VITAIS               (PA | FC | FR | SpO2 | Tax)
EXAMES COMPLEMENTARES       (laboratório e gasometria em linha corrida, com data/hora)
PLANO TERAPÊUTICO: AÇÃO E PRAZO/DURAÇÃO (COM GERENCIAMENTO DIÁRIO)
METAS/CONDUTAS DO DIA
GERENCIAMENTO DE RISCO
```

O bloco final segue exatamente o mnemônico do seu documento, uma linha por letra:

```text
GERENCIAMENTO DE RISCO
P - PROFILAXIAS:
U - LESÃO POR PRESSÃO:
B - BRONCOASPIRAÇÃO:
F - FLEBITE:
I - INVASIVOS:
S - SANGRAMENTO:
Q - QUEDAS:
D - PROTOCOLO DE DOR (END):
```

Cada letra recebe o que foi informado; sem dado, fica "NÃO INFORMADO"; quando o médico disser que não se aplica, "NÃO SE APLICA". Nenhuma profilaxia, medicação ou escala é inventada.

## Diferença em relação ao modelo de UTI atual

| Hoje (UTI · Evolução / Plantão) | Versão 2 (Institucional) |
|---|---|
| Foco no delta das últimas 24 h | Ficha institucional completa do leito |
| Suportes/controles em blocos próprios | Suportes descritos dentro do plano terapêutico |
| Impressão do plantão + plano 24 h | Plano com ação e prazo + metas do dia |
| Sem gerenciamento de risco | Bloco P.U.B.F.I.S.Q.D. obrigatório |

## Regras mantidas

- Nada é inventado: sem dado, o bloco é omitido ou marcado como "NÃO INFORMADO" / "EM INVESTIGAÇÃO".
- Datas, horários, doses e valores são preservados exatamente como informados.
- Abreviações expandidas na primeira ocorrência (VMI, TOT, DVA, CVC, SNE, SVD...).
- Sem markdown, sem asteriscos, sem emojis; corpo em caixa mista, só os títulos em caixa alta.
- Bloco de hipóteses diagnósticas conforme a regra já em vigor para todos os modelos.
- Plano terapêutico em itens curtos, um por linha, cada um com ação e prazo quando informado.

## Detalhes técnicos

- `supabase/functions/agent-chat/index.ts`: novo prompt `utiEvolucaoV2Prompt` reaproveitando `utiSharedRules`, roteado por `aheTemplate === "uti_evolucao_v2"` no bloco `directAHEMode`.
- `src/components/AgentChat.tsx`: nova entrada em `CLINICUS_CONTEXTS` (`uti_evolucao_v2`, rótulo "UTI · Evolução (Modelo Institucional)").
- Nenhuma mudança de layout, de banco ou de outros assistentes.
- Requer publicar a função do backend para valer nas respostas (aviso antes).
