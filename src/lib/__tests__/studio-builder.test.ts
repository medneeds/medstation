import { describe, expect, it } from "vitest";
import { buildAssistantRequest, buildAssistantSystem, parseAssistantDraft, MAX_ASSISTANT_NAME, ASSISTANT_BUILDER_PROMPT } from "../studioBuilder";
import { MAX_STUDIO_CHARS } from "../studio";
import { MAX_STUDIO_INSTRUCTIONS, MAX_STUDIO_SYSTEM_CHARS } from "../../../supabase/functions/studio-chat/models";
import { PROMPTECA_LIMITS } from "../prompteca";

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

  it("assistente aceita prompt de até 40.000 caracteres (prompt longo do ChatGPT)", () => {
    expect(MAX_STUDIO_INSTRUCTIONS).toBe(40000);
    const long = "Você é meu assistente. ".repeat(1700); // ~39 mil caracteres
    expect(parseAssistantDraft(`NOME: Meu GPT\nINSTRUÇÕES:\n${long}`).instructions).toBe(long.trim());
  });

  it("ao ajustar, as instruções atuais vão inteiras no roteiro e cabem no servidor", () => {
    const current = "y".repeat(MAX_STUDIO_INSTRUCTIONS);
    const system = buildAssistantSystem({ instructions: current });
    expect(system).toContain(current);
    expect(system.length).toBeLessThanOrEqual(MAX_STUDIO_SYSTEM_CHARS);
    const msg = buildAssistantRequest("mais curto", { name: "Alta", instructions: current });
    expect(msg).not.toContain(current);
    expect(msg.length).toBeLessThanOrEqual(MAX_STUDIO_CHARS);
    expect(buildAssistantSystem({ instructions: "" })).toBe(ASSISTANT_BUILDER_PROMPT);
    expect(buildAssistantRequest("assistente de alta")).toBe("PEDIDO DO MÉDICO:\nassistente de alta");
  });

  it("a Prompteca publica um assistente longo sem cortar", () => {
    expect(PROMPTECA_LIMITS.content).toBe(MAX_STUDIO_INSTRUCTIONS);
  });
});
