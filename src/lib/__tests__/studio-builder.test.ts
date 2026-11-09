import { describe, expect, it } from "vitest";
import { buildAssistantRequest, parseAssistantDraft, MAX_ASSISTANT_NAME } from "../studioBuilder";
import { MAX_STUDIO_CHARS } from "../studio";

describe("Criador de assistentes do Studio", () => {
  it("separa nome e instruções da resposta da IA", () => {
    const d = parseAssistantDraft("NOME: Parecer pré-operatório\nINSTRUÇÕES:\nVocê é um assistente...\n\nNUNCA\n- inventar");
    expect(d.name).toBe("Parecer pré-operatório");
    expect(d.instructions).toBe("Você é um assistente...\n\nNUNCA\n- inventar");
  });

  it("tira negrito e # que a IA colocar", () => {
    const d = parseAssistantDraft("**NOME:** Alta\n## INSTRUÇÕES:\n**Você** responde");
    expect(d.name).toBe("Alta");
    expect(d.instructions).toBe("Você responde");
  });

  it("sem marcadores, o texto inteiro vira instruções", () => {
    expect(parseAssistantDraft("Você é um assistente de alta.")).toEqual({ name: "", instructions: "Você é um assistente de alta." });
  });

  it("limita o nome a 60 caracteres", () => {
    expect(parseAssistantDraft(`NOME: ${"a".repeat(90)}\nINSTRUÇÕES:\nx`).name.length).toBe(MAX_ASSISTANT_NAME);
  });

  it("ao ajustar, envia as instruções atuais sem passar do limite da mensagem", () => {
    const msg = buildAssistantRequest("mais curto", { name: "Alta", instructions: "x".repeat(20000) });
    expect(msg).toContain("INSTRUÇÕES ATUAIS");
    expect(msg.length).toBeLessThanOrEqual(MAX_STUDIO_CHARS);
    expect(buildAssistantRequest("assistente de alta")).toBe("PEDIDO DO MÉDICO:\nassistente de alta");
  });
});
