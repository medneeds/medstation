import { describe, expect, it } from "vitest";
import { extractAgentTypeFromRequestBody, featureForAgentType } from "@/lib/analytics";

describe("extractAgentTypeFromRequestBody", () => {
  it("extrai somente o agentType do corpo JSON", () => {
    const body = JSON.stringify({
      agentType: "examinus",
      messages: [{ role: "user", content: "Paciente João, Hb 8.2, CRM 12345" }],
    });
    expect(extractAgentTypeFromRequestBody(body)).toBe("examinus");
  });

  it("aceita snake_case e normaliza maiúsculas/espaços", () => {
    expect(extractAgentTypeFromRequestBody(JSON.stringify({ agent_type: " Clinicus " }))).toBe("clinicus");
  });

  it("retorna null para corpos inválidos ou sem agentType", () => {
    expect(extractAgentTypeFromRequestBody(undefined)).toBeNull();
    expect(extractAgentTypeFromRequestBody("not json")).toBeNull();
    expect(extractAgentTypeFromRequestBody(JSON.stringify({ messages: [] }))).toBeNull();
    expect(extractAgentTypeFromRequestBody(JSON.stringify({ agentType: 42 }))).toBeNull();
  });

  it("nunca devolve conteúdo clínico do corpo", () => {
    const body = JSON.stringify({ agentType: "gasometrus", notes: "pH 7.21 paciente Maria" });
    const result = extractAgentTypeFromRequestBody(body);
    expect(result).toBe("gasometrus");
    expect(result).not.toContain("Maria");
    expect(result).not.toContain("7.21");
  });
});

describe("featureForAgentType", () => {
  it("mapeia assistentes conhecidos de forma granular", () => {
    for (const agent of ["examinus", "clinicus", "prescriptus", "gasometrus", "codexus", "mediscuss", "legalis"]) {
      expect(featureForAgentType(agent)).toBe(agent);
    }
  });

  it("cai para clinical_assistant quando não há agentType", () => {
    expect(featureForAgentType(null)).toBe("clinical_assistant");
    expect(featureForAgentType("x")).toBe("clinical_assistant");
  });
});
