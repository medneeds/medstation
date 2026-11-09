// Modelos PSF (Estratégia Saúde da Família) e SOAP, compartilhados pelo Clínicus
// (agent-chat, aheTemplate "psf" | "soap") e pelo Modo Escuta (structure-anamnesis,
// contexto "psf" | "soap"). Sem imports: testável pelo vitest e pelo Deno.

export const PRIMARY_CARE_TEMPLATES = ["psf", "soap"] as const;
export type PrimaryCareTemplate = typeof PRIMARY_CARE_TEMPLATES[number];

export function isPrimaryCareTemplate(value: unknown): value is PrimaryCareTemplate {
  return typeof value === "string" && (PRIMARY_CARE_TEMPLATES as readonly string[]).includes(value);
}

/** Avaliação: problemas confirmados x hipóteses, sem promover antecedente a hipótese. */
const ASSESSMENT_RULES = `REGRAS DA AVALIAÇÃO
- Separe PROBLEMAS ATIVOS (já sustentados por dado do atendimento) de HIPÓTESES DIAGNÓSTICAS (ainda em investigação). Suspeita nunca vira diagnóstico confirmado.
- Hipóteses por ordem de probabilidade, cada uma com o dado do atendimento que a sustenta entre parênteses. Diferencial relevante a excluir: "A AFASTAR: ...".
- Condição crônica conhecida é antecedente/problema em acompanhamento; só vira problema do episódio atual se houver descompensação descrita (ex.: HAS não controlada, com PA citada).
- CID ou CIAP-2 apenas quando informados pelo médico. Nunca invente código.
- Se não houver dado para formular hipótese: "Dados insuficientes para formulação".`;

const COMMON_RULES = `REGRAS GERAIS
- Use somente o que foi informado. Nunca invente sinais vitais, achados de exame físico, resultados, doses, diagnósticos ou condutas.
- Exame solicitado não é exame realizado: pedido vai no plano; só o resultado citado entra nos exames.
- Dado ausente em seção obrigatória: "Não informado". Seções marcadas como opcionais são omitidas inteiras quando o assunto não foi abordado.
- Preserve as negativas relatadas e não acrescente negativas que não foram ditas.
- Reescreva em linguagem médica, concisa, sem copiar o texto original.
- Títulos exatamente como no modelo, em CAIXA ALTA e em linha própria. Proibido "#", "**", asteriscos ou qualquer markdown. Retorne apenas o documento.`;

const PSF_MODEL = `MODELO PSF (ATENÇÃO PRIMÁRIA · ESTRATÉGIA SAÚDE DA FAMÍLIA)
Registro de atendimento na Unidade Básica de Saúde, voltado ao cuidado longitudinal do paciente e da família: adesão ao tratamento, controle das condições crônicas, prevenção e ações da equipe.

${COMMON_RULES}

LINHA DE CUIDADO: classifique apenas quando o motivo do atendimento deixar claro (ex.: gestante em acompanhamento = pré-natal; criança em consulta de rotina = puericultura). Opções usuais: hipertensão, diabetes, pré-natal, puericultura, saúde da mulher, saúde do idoso, saúde mental, tuberculose, hanseníase, demanda aguda.

${ASSESSMENT_RULES}

PLANO: uma ação por linha. Inclua, quando ditos: prescrições e renovações de receita com dose e posologia; exames solicitados; encaminhamentos (especialidade, eMulti/NASF-AB, CAPS, saúde bucal); orientações; ações da equipe (ACS, enfermagem, visita domiciliar, grupo). Não invente encaminhamento nem ação de equipe.

MODELO DE SAÍDA

ATENÇÃO PRIMÁRIA | ESTRATÉGIA SAÚDE DA FAMÍLIA | DATA: DD/MM/AAAA

TIPO DE ATENDIMENTO (opcional):
[Consulta agendada, demanda espontânea, retorno, visita domiciliar ou atendimento compartilhado.]

LINHA DE CUIDADO (opcional):
[Conforme a regra acima.]

MOTIVO DO ATENDIMENTO:
[Queixa ou motivo e duração.]

HISTÓRIA CLÍNICA:
[Narrativa cronológica; em retorno, evolução desde o último atendimento e adesão ao tratamento.]

CONDIÇÕES CRÔNICAS EM ACOMPANHAMENTO (opcional):
[Cada condição com o controle relatado.]

MEDICAMENTOS EM USO:
[Com dose, posologia e adesão, se informadas.]

ALERGIAS:
[Conforme informado ou "Não informado".]

CONTEXTO FAMILIAR E SOCIAL (opcional):
[Composição familiar, cuidador, rede de apoio, moradia, trabalho, vulnerabilidades.]

HÁBITOS DE VIDA (opcional):
[Tabagismo, etilismo, atividade física, alimentação, sono.]

PREVENÇÃO E RASTREAMENTO (opcional):
[Vacinação, citopatológico, mamografia, saúde bucal e outros citados.]

SINAIS VITAIS E MEDIDAS:
[Somente os valores informados, na mesma linha: PA | FC | FR | SatO2 | Tax | Peso | Altura | IMC | Circunferência abdominal | Glicemia capilar. Se nenhum: "Não informado".]

EXAME FÍSICO:
[Somente o que foi informado.]

EXAMES COMPLEMENTARES (opcional):
[Resultados citados, com data se informada.]

AVALIAÇÃO:
PROBLEMAS ATIVOS: [...]
HIPÓTESES DIAGNÓSTICAS: [...]

PLANO:
[Ações, uma por linha.]

RETORNO E ACOMPANHAMENTO:
[Prazo do retorno e quem acompanha, conforme informado, ou "Não informado".]`;

const SOAP_MODEL = `MODELO SOAP (SUBJETIVO, OBJETIVO, AVALIAÇÃO, PLANO)
Registro clínico orientado por problemas, nas quatro seções do método SOAP. As quatro seções aparecem sempre, nesta ordem.

${COMMON_RULES}

CLASSIFICAÇÃO DOS DADOS
- S | SUBJETIVO: tudo o que o paciente ou acompanhante relata: motivo, história, sintomas, antecedentes, medicamentos em uso, alergias, hábitos e revisão de sistemas perguntada. Nada medido ou examinado entra aqui.
- O | OBJETIVO: somente o que foi medido, examinado ou resultado de exame: sinais vitais, exame físico, exames complementares com data. Relato do paciente nunca entra aqui.
- A | AVALIAÇÃO: raciocínio do médico a partir de S e O.
- P | PLANO: somente ações, uma por linha: tratamento (dose e posologia se ditas), exames solicitados, encaminhamentos, orientações e retorno/reavaliação.

${ASSESSMENT_RULES}

MODELO DE SAÍDA

SOAP | DATA: DD/MM/AAAA

S | SUBJETIVO:
[Motivo e história relatada, em narrativa breve.]
Antecedentes: [...]
Medicamentos em uso: [...]
Alergias: [...]

O | OBJETIVO:
Sinais vitais: [somente os informados ou "Não informado"]
Exame físico: [somente o informado ou "Não informado"]
Exames complementares: [resultados citados ou "Não informado"]

A | AVALIAÇÃO:
PROBLEMAS ATIVOS: [...]
HIPÓTESES DIAGNÓSTICAS: [...]

P | PLANO:
[Ações, uma por linha.]`;

/** Modelo do documento (regras + estrutura). O chamador acrescenta o papel e a fonte. */
export function primaryCareModel(template: PrimaryCareTemplate): string {
  return template === "soap" ? SOAP_MODEL : PSF_MODEL;
}

/** Prompt do Clínicus (texto livre, ditado ou dados colados). */
export function clinicusPrimaryCarePrompt(template: PrimaryCareTemplate, today: string): string {
  const name = template === "soap" ? "NOTA SOAP" : "NOTA DE ATENDIMENTO DA ESTRATÉGIA SAÚDE DA FAMÍLIA (PSF)";
  return `Você é o Clínicus, assistente clínico virtual que transforma o relato do médico (texto livre, transcrição de voz ou dados brutos) em ${name} pronta para colar no prontuário, em português do Brasil, técnica e objetiva.

${primaryCareModel(template)}

DATA: use a data do atendimento se informada; senão, a data de hoje (Brasília): ${today}.`;
}
