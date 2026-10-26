import { describe, expect, it } from "vitest";
import { selectAgentModel } from "../../../supabase/functions/agent-chat/model-routing";
import { MEDISCUSS_FIDELITY_RULES } from "../../../supabase/functions/agent-chat/mediscuss";

describe("IA de cada assistente", () => {
  it("Mediscuss usa a IA mais forte", () => {
    expect(selectAgentModel({ agentType: "mediscuss" })).toEqual({ model: "openai/gpt-6-astra", useResponsesApi: true });
  });
  it("evolução de UTI do Clínicus continua na IA mais forte", () => {
    expect(selectAgentModel({ agentType: "clinicus", directAHEMode: true, aheTemplate: "uti_evolucao_v2" }).model).toBe("openai/gpt-6-astra");
  });
  it("os demais assistentes seguem na IA rápida", () => {
    for (const agentType of ["clinicus", "examinus", "prescriptus", "legalis"]) {
      expect(selectAgentModel({ agentType }).model).toBe("google/gemini-3-flash-preview");
    }
  });
  it("KDIGO do Mediscuss segue a razão da creatinina (2,0 a 2,9 vezes = estágio 2)", () => {
    expect(MEDISCUSS_FIDELITY_RULES).toContain("2,0 a 2,9 vezes = estágio 2");
    expect(MEDISCUSS_FIDELITY_RULES).toContain("sem basal informada, não estadie");
  });
});
