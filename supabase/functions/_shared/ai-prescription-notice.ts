// Aviso obrigatório em toda sugestão de prescrição do Prescriptus (chat e Modo Escuta). Import-free.

export const AI_PRESCRIPTION_NOTICE =
  "AVISO: sugestões de prescrição geradas por inteligência artificial. A revisão médica é sempre insubstituível, e a decisão terapêutica, a prescrição e a assinatura são de responsabilidade exclusiva do médico, conforme o Código de Ética Médica (CFM).";

/** Garante o aviso ao final do texto (sem duplicar). */
export function withPrescriptionNotice(text: string): string {
  const t = text.trim();
  if (!t || t.includes(AI_PRESCRIPTION_NOTICE)) return t;
  return `${t}\n\n${AI_PRESCRIPTION_NOTICE}`;
}
