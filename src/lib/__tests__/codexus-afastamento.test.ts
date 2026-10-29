import { describe, expect, it } from "vitest";
import {
  AFASTAMENTO_ATESTUS_HEADER as SERVER_ATESTUS,
  AFASTAMENTO_HEADER as SERVER_HEADER,
  buildAfastamentoPrompt,
  validateCodexusRequest,
} from "../../../supabase/functions/agent-chat/codexus-afastamento";
import { selectAgentModel } from "../../../supabase/functions/agent-chat/model-routing";
import {
  AFASTAMENTO_ATESTUS_HEADER,
  AFASTAMENTO_HEADER,
  buildAtestusPrefill,
  extractAtestusBlock,
  isAfastamentoResponse,
} from "../codexusAfastamento";

const SAMPLE = `DIAS & AFASTAMENTO — Lombalgia aguda

CID SUGERIDOS PARA O ATESTADO
1. M54.5 — Dor lombar baixa · quadro mecânico

ESTIMATIVA DE DIAS
• Trabalho administrativo (sentado, pouco esforço): 2 a 3 dias
• Trabalho braçal (esforço físico, carga, em pé): 5 a 7 dias

PARA O ATESTUS
• CID: M54.5
• Dias sugeridos: 3 (administrativo) | 6 (braçal)`;

describe("CODexus · D.A. (Dias & Afastamento)", () => {
  it("app e servidor usam os mesmos títulos", () => {
    expect(AFASTAMENTO_HEADER).toBe(SERVER_HEADER);
    expect(AFASTAMENTO_ATESTUS_HEADER).toBe(SERVER_ATESTUS);
  });

  it("toda resposta separa trabalho administrativo e braçal", () => {
    const prompt = buildAfastamentoPrompt();
    expect(prompt).toContain("Trabalho administrativo");
    expect(prompt).toContain("Trabalho braçal");
  });

  it("marco do INSS: a partir do 16º dia vai para a perícia", () => {
    expect(buildAfastamentoPrompt()).toContain("a partir do 16º dia");
  });

  it("C.R. e D.A. não podem ser ligados juntos", () => {
    expect(validateCodexusRequest({ agentType: "codexus", quickCIDMode: true, afastamentoMode: true })).not.toBeNull();
    expect(validateCodexusRequest({ agentType: "codexus", afastamentoMode: true })).toBeNull();
  });

  it("D.A. só existe no CODexus", () => {
    expect(validateCodexusRequest({ agentType: "atestus", afastamentoMode: true })).not.toBeNull();
  });

  it("D.A. usa a IA mais forte; CODexus comum segue na rápida", () => {
    expect(selectAgentModel({ agentType: "codexus", afastamentoMode: true }).model).toBe("openai/gpt-6-astra");
    expect(selectAgentModel({ agentType: "codexus" }).model).toBe("google/gemini-3-flash-preview");
  });

  it("o atalho do Atestus aparece só em respostas D.A.", () => {
    expect(isAfastamentoResponse(SAMPLE)).toBe(true);
    expect(isAfastamentoResponse("CID RÁPIDO — lombalgia\n1. M54.5")).toBe(false);
  });

  it("o Atestus recebe o caso, o CID e os dias", () => {
    expect(extractAtestusBlock(SAMPLE)).toEqual(["CID: M54.5", "Dias sugeridos: 3 (administrativo) | 6 (braçal)"]);
    const prefill = buildAtestusPrefill("Lombalgia após carregar peso", SAMPLE);
    expect(prefill).toContain("Caso: Lombalgia após carregar peso");
    expect(prefill).toContain("• CID: M54.5");
    expect(prefill).toContain("6 (braçal)");
  });
});
