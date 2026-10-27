import { describe, expect, it } from "vitest";
import { selectAgentModel } from "../../../supabase/functions/agent-chat/model-routing";
import {
  UTI_CONDUTAS_BLOCK,
  UTI_PARAMETROS_BLOCK,
  antimicrobialDay,
  utiAntibioticBlock,
  utiReferenceDate,
} from "../../../supabase/functions/agent-chat/uti-evolucao";

describe("Evolução de UTI", () => {
  it("a data de início do antimicrobiano é D1 (início 23/10, em 27/10 = D5)", () => {
    expect(antimicrobialDay("23/10/2026", "23/10/2026")).toBe(1);
    expect(antimicrobialDay("23/10/2026", "27/10/2026")).toBe(5);
    expect(antimicrobialDay("28/10/2026", "27/10/2026")).toBeNull();
  });
  it("o dia de referência segue o horário de Brasília", () => {
    // 01h UTC de 28/10 ainda é 27/10 em Brasília
    expect(utiReferenceDate(new Date("2026-10-28T01:00:00Z"))).toBe("27/10/2026");
    expect(utiAntibioticBlock("27/10/2026")).toContain("use hoje, 27/10/2026");
  });
  it("o campo de condutas se chama CONDUTAS e só aceita decisões do médico", () => {
    expect(UTI_CONDUTAS_BLOCK.startsWith("CONDUTAS:")).toBe(true);
    expect(UTI_CONDUTAS_BLOCK).toContain("SOMENTE COM DECISÕES REGISTRADAS OU EXPRESSAMENTE VALIDADAS PELO MÉDICO");
  });
  it("os parâmetros fixos cobrem hemodinâmica, respiratório, renal, drenos, neurológico e nutricional", () => {
    for (const label of ["HEMODINÂMICA:", "RESPIRATÓRIO:", "FUNÇÃO RENAL E BALANÇO HÍDRICO:", "DRENOS E DISPOSITIVOS:", "NEUROLÓGICO:", "NUTRICIONAL E GASTROINTESTINAL:"]) {
      expect(UTI_PARAMETROS_BLOCK).toContain(label);
    }
  });
  it("as duas evoluções de UTI usam a IA mais forte", () => {
    for (const aheTemplate of ["uti_evolucao", "uti_evolucao_v2"]) {
      expect(selectAgentModel({ agentType: "clinicus", directAHEMode: true, aheTemplate }).model).toBe("openai/gpt-6-astra");
    }
    expect(selectAgentModel({ agentType: "clinicus", directAHEMode: true, aheTemplate: "consultorio" }).model).toBe("google/gemini-3-flash-preview");
  });
});
