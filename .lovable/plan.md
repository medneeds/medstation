# Modo Receita no Prescriptus

Nova função do Prescriptus que entrega apenas o texto pronto para o receituário — sem a discussão farmacológica extensa.

## Como o médico usa

- Um botão "Receita" ao lado do botão B.I. (desktop e mobile), no mesmo padrão de pílula já usado nos outros assistentes.
- Com o Modo Receita ligado, basta digitar o medicamento ("Gynotran", "Amoxicilina 500mg") e o Prescriptus responde direto no formato de receituário.
- Também funciona por comando escrito: digitar "MODO RECEITA: [medicamento]" ativa o formato naquela mensagem, mesmo com o botão desligado.
- Modo Receita e Modo B.I. são mutuamente exclusivos: ligar um desliga o outro.

## Formato de saída fixo

```text
MODELO DE PRESCRIÇÃO

USO [VIA DE ADMINISTRAÇÃO]

1. [FÁRMACO + CONCENTRAÇÃO] -------- [QUANTIDADE TOTAL]
   [POSOLOGIA: DOSE, FREQUÊNCIA, DURAÇÃO]

ORIENTAÇÕES AO PACIENTE:
• [ALERTAS DE SEGURANÇA E CONDUTA]

CONFIANÇA GERAL: [ALTA/MODERADA/BAIXA] — [JUSTIFICATIVA CURTA]
```

Regras do modo:
- Sem seções de mecanismo de ação, farmacocinética ou contraindicações extensas — só o que cabe na receita e nas orientações ao paciente.
- Múltiplos itens são numerados na mesma receita, agrupados por via de administração.
- O assistente ainda pode fazer 1 a 3 perguntas curtas de segurança (função renal, alergias, gestação) antes de fechar a receita, quando o fármaco exigir ajuste.
- Segue as regras globais de formatação da plataforma: sem markdown, sem asteriscos, títulos em caixa alta.
- Mantém os avisos de segurança da plataforma (auxílio à redação, não substitui julgamento clínico).

## Detalhes técnicos

- `src/components/AgentChat.tsx`: novo estado `receitaMode`, toggle nas duas barras (mobile e desktop) do bloco `agentType === "prescriptus"`, exclusão mútua com `bulaInteligenteMode`, e envio no payload junto com o restante das opções do Prescriptus.
- `supabase/functions/agent-chat/index.ts`: ler `receitaMode` do corpo da requisição e, no prompt do `prescriptus`, adicionar o bloco "MODO RECEITA" com precedência sobre B.I. e Discussão. O prompt também reconhece o prefixo "MODO RECEITA:" na mensagem do usuário.
- Nada muda nos demais assistentes nem no layout geral do chat.
