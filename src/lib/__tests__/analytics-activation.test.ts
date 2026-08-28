import { describe, expect, it } from "vitest";
import { extractAgentTypeFromRequestBody, featureForAgentType, hasUsefulAgentChatResponse } from "@/lib/analytics";

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

describe("hasUsefulAgentChatResponse", () => {
  it("retorna true para SSE com delta.content útil", () => {
    const sse = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}',
      'data: {"choices":[{"delta":{"content":"Resumo clínico"}}]}',
      "data: [DONE]",
    ].join("\n");
    expect(hasUsefulAgentChatResponse(sse)).toBe(true);
  });

  it("retorna false para data: [DONE]", () => {
    expect(hasUsefulAgentChatResponse("data: [DONE]\n")).toBe(false);
  });

  it("retorna false para keepalive + DONE", () => {
    expect(hasUsefulAgentChatResponse(": keepalive\n\ndata: [DONE]\n")).toBe(false);
  });

  it("retorna false para delta role-only", () => {
    const sse = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\ndata: [DONE]';
    expect(hasUsefulAgentChatResponse(sse)).toBe(false);
  });

  it("retorna false para finish_reason-only", () => {
    const sse = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\ndata: [DONE]';
    expect(hasUsefulAgentChatResponse(sse)).toBe(false);
  });

  it("retorna false para JSON inválido e corpo vazio", () => {
    expect(hasUsefulAgentChatResponse("data: {invalid json}")).toBe(false);
    expect(hasUsefulAgentChatResponse("")).toBe(false);
    expect(hasUsefulAgentChatResponse("   \n  ")).toBe(false);
  });

  it("aceita formatos compatíveis message.content e content", () => {
    expect(hasUsefulAgentChatResponse('data: {"choices":[{"message":{"content":"ok"}}]}')).toBe(true);
    expect(hasUsefulAgentChatResponse('data: {"content":"texto"}')).toBe(true);
  });
});
