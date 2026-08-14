/**
 * Sugestões de abertura por assistente — apenas conteúdo de UI.
 * Preenchem o campo de mensagem; não alteram prompts do backend.
 */
export const AGENT_SUGGESTIONS: Record<string, string[]> = {
  examinus: [
    "Resuma este hemograma e destaque o que está alterado",
    "Quais exames complementares valem a pena neste caso?",
    "Explique para que serve este exame e as contraindicações",
  ],
  clinicus: [
    "Monte a anamnese a partir destas informações soltas",
    "Transforme este caso em relatório médico",
    "Prepare a passagem de caso para a cardiologia",
  ],
  gasometrus: [
    "pH 7,21 pCO2 58 HCO3 20 BE -6 Lac 3,1",
    "Faça a leitura sistemática desta gasometria",
    "Distúrbio misto? Analise passo a passo",
  ],
  prescriptus: [
    "Prescrição para pneumonia comunitária em adulto",
    "Ajuste de dose na insuficiência renal",
    "Interações relevantes desta prescrição",
  ],
  protocolus: [
    "Conduta atual em sepse nas primeiras 3 horas",
    "Protocolo de dor torácica na emergência",
    "Manejo de fibrilação atrial de início recente",
  ],
  codexus: [
    "CID para pneumonia adquirida na comunidade",
    "Códigos para diabetes tipo 2 com nefropatia",
    "CID de crise hipertensiva",
  ],
  atestus: [
    "Atestado de 3 dias por quadro gripal",
    "Declaração de comparecimento",
    "Atestado de repouso pós-procedimento",
  ],
  orientus: [
    "Orientações de alta após crise asmática",
    "Explique o uso da medicação para o paciente",
    "Sinais de alarme para retorno imediato",
  ],
  mediscuss: [
    "Monte o pedido de parecer para a nefrologia",
    "Justifique a indicação de UTI para este caso",
    "Prepare a solicitação de transferência",
  ],
  legalis: [
    "Como registrar uma recusa de tratamento?",
    "Blindagem do prontuário em evasão hospitalar",
    "Aspectos éticos da alta a pedido",
  ],
  numerus: [
    "Clearance de creatinina deste paciente",
    "Dose de noradrenalina para 70 kg",
    "Correção de sódio em hiponatremia grave",
  ],
  scorius: [
    "Calcule o CHA2DS2-VASc deste paciente",
    "Escore de gravidade para pneumonia (CURB-65)",
    "Aplique o SOFA com estes dados",
  ],
};

export function getAgentSuggestions(agentType: string): string[] {
  return AGENT_SUGGESTIONS[agentType] ?? [];
}
