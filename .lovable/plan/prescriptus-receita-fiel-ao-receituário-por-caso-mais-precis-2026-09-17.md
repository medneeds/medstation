# Prescriptus: Receita fiel ao receituário + Por caso mais preciso

Dois ajustes no Prescriptus, sem tocar na Bula Inteligente (que ficou correta) e sem mudar a tela.

## 1. Modo Receita — igual a uma receita médica de verdade

Hoje a saída sai como um "modelo" genérico. Passa a sair como um receituário brasileiro real:

```text
RECEITUÁRIO

Paciente: ____________________________
USO ORAL

1) Amoxicilina 500 mg — comprimidos ............ 21 comprimidos (vinte e um)
   Tomar 1 comprimido de 8 em 8 horas, por 7 dias.

2) Dipirona 500 mg — comprimidos ............... 20 comprimidos (vinte)
   Tomar 1 comprimido de 6 em 6 horas, se dor ou febre.

USO TÓPICO

3) ...

ORIENTAÇÕES AO PACIENTE
• até 5 itens objetivos

Local e data: ____________________
Assinatura e CRM: ________________
```

Regras que entram:
- Quantidade sempre em número e por extenso (padrão do receituário).
- Posologia escrita como instrução ao paciente ("Tomar 1 comprimido de 8 em 8 horas, por 7 dias"), não em jargão.
- Agrupar por via de administração, com o cabeçalho de uso repetido; numeração contínua entre grupos.
- Linha de aviso quando o fármaco for de controle especial (receita branca em 2 vias / azul B / amarela A), para o médico usar o talonário certo.
- Sem classe farmacológica, mecanismo, contraindicações nem discussão.
- Campos de paciente, data e assinatura sempre presentes, em branco, para preenchimento.

## 2. Modo Por caso — estrutura própria e mais precisa

Deixa de parecer bula/receita e passa a ser raciocínio terapêutico:

```text
PROBLEMA TERAPÊUTICO
uma a duas linhas

CONDUTA IMEDIATA
• só quando houver instabilidade ou risco de vida; senão a seção é omitida

ESQUEMA DE PRIMEIRA ESCOLHA
1) Fármaco + concentração — dose, via, intervalo, duração
   Por quê: diretriz/estudo que sustenta + força da recomendação

SE NÃO PUDER USAR (alergia, falha, indisponibilidade)
• alternativa → em que situação trocar

AJUSTES PARA ESTE PACIENTE
• renal / hepático / idade / gestação / interações com o que já usa
• só com o que o médico informou

REAVALIAÇÃO
• o que medir, em quanto tempo, e o que indica trocar ou escalonar

NÃO FAZER
• condutas frequentes e inadequadas neste cenário

O QUE FALTA SABER
• até 3 pontos que mudariam a conduta

EVIDÊNCIA
• diretriz principal, ano e força da recomendação
```

Ganhos de acurácia:
- Toda dose sai com via, intervalo e duração explícitos — nunca só o nome do fármaco.
- "Por quê" obrigatório por item, com a fonte, o que reduz sugestão sem lastro.
- Seção "Não fazer" e "Se não puder usar" forçam o modelo a considerar falha e contraindicação.
- Ajustes só com dados informados; o que faltar vai para "O que falta saber", em vez de ser presumido.
- Conduta de estabilização primeiro quando houver risco de vida.

## Detalhes técnicos

- Alterações apenas no prompt do `prescriptus` em `supabase/functions/agent-chat/index.ts` (blocos `receitaMode` e `casoTerapeuticoMode`).
- Sem mudança de interface, de estado ou de toggles.
- O renderizador atual já preserva numeração e títulos; os novos títulos em caixa alta ficam verdes automaticamente. Ajusto o parser apenas se a numeração no formato `1)` não for reconhecida — nesse caso incluo `1)` no padrão de lista ordenada e adiciono teste.
- Gates: typecheck, vitest e build. Publicação da função só após sua autorização.
