// Evolução médica de UTI (modelos "uti_evolucao" e "uti_evolucao_v2").
// Proposta de melhoria de out/2026: mais fidelidade, campo único de CONDUTAS,
// parâmetros clínicos fixos como roteiro de verificação e controle do dia de
// antibioticoterapia. Os blocos abaixo são compartilhados pelos dois modelos e as
// regras de fidelidade entram por último, para prevalecer sobre o modelo de texto.

export const UTI_EVOLUCAO_TEMPLATES = ["uti_evolucao", "uti_evolucao_v2"] as const;

export function isUtiEvolucaoTemplate(template: unknown): boolean {
  return typeof template === "string" && (UTI_EVOLUCAO_TEMPLATES as readonly string[]).includes(template);
}

/** Data de hoje no horário de Brasília (dd/mm/aaaa), usada para contar o dia de antibiótico. */
export function utiReferenceDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);
}

/** Dia de tratamento: a data de início é D1. Datas no formato dd/mm/aaaa. */
export function antimicrobialDay(startDate: string, referenceDate: string): number | null {
  const toUtc = (value: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return null;
    return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  };
  const start = toUtc(startDate);
  const reference = toUtc(referenceDate);
  if (start === null || reference === null || reference < start) return null;
  return Math.round((reference - start) / 86_400_000) + 1;
}

export const UTI_PARAMETROS_BLOCK = `PARÂMETROS CLÍNICOS:
(BLOCO FIXO, SEMPRE COM AS SETE LINHAS, NESTA ORDEM. FUNCIONA COMO ROTEIRO DE VERIFICAÇÃO: PREENCHA CADA ITEM SOMENTE COM O QUE FOI INFORMADO E ESCREVA "não informado" NO ITEM SEM DADO. NUNCA GERE VALOR, ACHADO OU NORMALIDADE NÃO INFORMADOS.)
HEMODINÂMICA: PA ___ | FC ___ | PAM ___ (só se informada) | estabilidade circulatória ___ | vasopressores e doses ___
RESPIRATÓRIO: SpO2 ___ | FR ___ | suporte de oxigênio ___ | fluxo ou FiO2 ___ | parâmetros ventilatórios ___ (modo, VC, PEEP, Pplatô, driving pressure, quando informados)
FUNÇÃO RENAL E BALANÇO HÍDRICO: diurese ___ mL/24h | balanço hídrico do período ___ | balanço acumulado ___ | terapia renal substitutiva ___
DRENOS E DISPOSITIVOS: (um por item: tipo, localização, aspecto e débito em mL/24h; acessos, sondas, cateteres e tubos com data de inserção quando informada)
NEUROLÓGICO: nível de consciência ___ | sedação e analgesia ___ | escalas ___ (Glasgow, RASS, CAM-ICU, BPS ou outra, somente se informadas)
NUTRICIONAL E GASTROINTESTINAL: via de alimentação ___ | aceitação ou tolerância da dieta ___ | eliminações ___
TEMPERATURA E GLICEMIA: Tax ___ | glicemias ___ | insulinoterapia ___`;

export function utiAntibioticBlock(referenceDate: string): string {
  return `ANTIBIOTICOTERAPIA:
(BLOCO FIXO. UM ANTIMICROBIANO POR LINHA, INCLUSIVE OS SUSPENSOS NO PERÍODO, NO FORMATO:)
Nome | Início: dd/mm/aaaa | Dn em dd/mm/aaaa | Duração prevista: ___ | Término ou reavaliação prevista: dd/mm/aaaa | Motivo: ___
Exemplo: Meropenem | Início: 23/10/2026 | D5 em 27/10/2026 | Duração prevista: não informado | Reavaliação prevista: 29/10/2026

REGRAS DA ANTIBIOTICOTERAPIA
- A data de início é D1. Dia atual = (data de referência − data de início) + 1. Ex.: início 23/10 e referência 27/10 = D5.
- Data de referência: a data da evolução informada pelo médico; se ele não informar, use hoje, ${referenceDate}.
- Sem data de início informada: escreva "Início: não informado" e não calcule o dia, a menos que o médico tenha escrito o dia (ex.: "D5"); nesse caso preserve o dia escrito por ele.
- Se o dia escrito pelo médico não bater com o calculado pela data de início, registre os dois como "DIVERGÊNCIA NA FONTE".
- Duração prevista e data de término ou reavaliação: somente quando informadas. Com duração e início informados, o término é o último dia de tratamento (início + duração − 1). Sem esses dados: "não informado". Nunca proponha duração.
- Motivo de escalonamento, descalonamento ou suspensão: somente quando documentado; sem motivo informado, omita esse campo.
- Suspenso: acrescente "Suspenso em dd/mm/aaaa" quando a data for informada.
- Sem qualquer menção a antimicrobiano: "não informado". Se o médico disser que não há antimicrobiano em uso: "Sem antimicrobianos em uso".`;
}

export const UTI_CONDUTAS_BLOCK = `CONDUTAS:
(ITENS CURTOS E OBJETIVOS, UM POR LINHA, SOMENTE COM DECISÕES REGISTRADAS OU EXPRESSAMENTE VALIDADAS PELO MÉDICO, PRESERVANDO O SENTIDO, A ORIGEM E AS CONDIÇÕES QUE ELE ESCREVEU. EXEMPLOS DE REDAÇÃO:)
Escalonamento da antibioticoterapia conforme orientação da Infectologia.
Manutenção do suporte ventilatório vigente.
Programação de transferência para enfermaria nas próximas 24 horas, conforme evolução clínica e disponibilidade de leito.
Solicitação de avaliação pela especialidade.
Reavaliação laboratorial programada.
(SE O MÉDICO NÃO INFORMAR NENHUMA CONDUTA, ESCREVA "não informado". NÃO COMPLETE COM CONDUTAS DE ROTINA.)`;

export function utiEvolucaoFidelityRules(referenceDate: string): string {
  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRAVAS DE FIDELIDADE DA EVOLUÇÃO DE UTI (PRIORIDADE SOBRE QUALQUER INSTRUÇÃO ACIMA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Você organiza o registro, não decide pelo médico. Use somente o que ele enviou. Não crie diagnóstico, hipótese, intervenção, conduta, meta, prazo, frequência, dose ou recomendação que não esteja escrita na fonte.
2. Ausente é "não informado". Nunca presuma normalidade: sem o dado, não escreva "estável", "normotenso", "eupneico", "afebril", "diurese preservada", "sem drogas vasoativas", "sem intercorrências", "sem alterações" ou "bom estado geral". Segmento do exame físico sem dado recebe "não informado".
3. Sem interpretação além da fonte. Melhora, piora, estabilidade, resposta ao tratamento, gravidade e prognóstico só entram quando o médico os escreveu. Não conclua a partir de dados isolados.
4. Hipóteses diagnósticas: somente as registradas pelo médico (suspeita, provável, a esclarecer, a afastar). Não formule novas hipóteses nem diferenciais.
5. Sem sugestões. Não escreva sugestões, recomendações, "considerar", "avaliar necessidade" nem "sugestão condicional". Lacuna relevante aparece apenas como "não informado" no campo correspondente.
6. CONDUTAS refletem exclusivamente decisões registradas ou expressamente validadas pelo médico assistente. Solicitado continua solicitado, programado continua programado; não transforme em realizado.
7. Os blocos PARÂMETROS CLÍNICOS, ANTIBIOTICOTERAPIA e CONDUTAS aparecem sempre, mesmo sem dados, para servir de roteiro de verificação.
8. Comunicação com família e equipe só entra quando informada; sem dado, "não informado".
9. Data de referência para o dia de tratamento: ${referenceDate}, salvo data da evolução informada pelo médico.
10. Antes de entregar, confira em silêncio cada frase contra os dados enviados e apague o que não tiver origem neles. Não mostre essa conferência.`;
}
