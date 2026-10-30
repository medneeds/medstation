// Prescriptus · Modo Receita: a resposta é só o receituário, sem discussão.

const TEXT_TRIGGER = /^\s*modo\s+receita\s*[:\-–]/i;

/** Modo ligado na tela ou mensagem começando com "MODO RECEITA:". */
export function isReceitaRequest(receitaMode: unknown, latestUserMessage: string): boolean {
  return receitaMode === true || TEXT_TRIGGER.test(latestUserMessage || "");
}

/** Vai por último no prompt para prevalecer sobre os blocos gerais do Prescriptus. */
export const RECEITA_FINAL_RULES = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRAVA FINAL DO MODO RECEITA (PREVALECE SOBRE TUDO ACIMA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- A resposta começa diretamente pela linha "RECEITUÁRIO". Não repita nem resuma o pedido do médico antes dela.
- Depois de "Assinatura e CRM:", só pode vir, se for realmente necessário, um bloco final chamado "CONFERIR ANTES DE ASSINAR" com no máximo 3 perguntas curtas de segurança, uma por linha, sem numeração. Se nada mudar a receita, não escreva esse bloco.
- PROIBIDO neste modo: seções de análise, evidência, mecanismo, farmacologia ou justificativa; selos [ALTA]/[MODERADA]/[BAIXA]; linha "CONFIANÇA GERAL"; aviso de rodapé sobre julgamento clínico.
- A quantidade total vem em número e por extenso com a unidade da forma farmacêutica (ex.: 21 (vinte e uma) cápsulas; 1 (uma) bisnaga).
- Não invente o nome do paciente, a data nem o CRM: mantenha os campos em branco.`;
