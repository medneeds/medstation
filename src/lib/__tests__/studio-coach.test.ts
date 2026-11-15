import { describe, expect, it } from "vitest";
import {
  MAX_COACH_QUESTIONS, buildCoachRequest, buildCoachSystem, buildRefineRequest, diffStats, lineDiff, parseCoachReply,
} from "../studioCoach";
import { MAX_STUDIO_CHARS, MAX_STUDIO_INSTRUCTIONS, MAX_STUDIO_SYSTEM_CHARS } from "../../../supabase/functions/studio-chat/models";

describe("Consultor de prompts do Studio", () => {
  it("lê o JSON mesmo com cerca de código e texto em volta", () => {
    const r = parseCoachReply('Claro!\n```json\n{"resumo":"Bom começo","pontos_fortes":["Seções claras"],"melhorias":["Falta tom"],"perguntas":[{"pergunta":"Qual tom?","opcoes":["Formal","Direto","Formal"]}],"pronto":false}\n```');
    expect(r?.summary).toBe("Bom começo");
    expect(r?.questions).toEqual([{ question: "Qual tom?", options: ["Formal", "Direto"] }]);
    expect(r?.ready).toBe(false);
  });

  it("no máximo 4 perguntas", () => {
    const perguntas = Array.from({ length: 7 }, (_, i) => ({ pergunta: `P${i}?`, opcoes: ["a", "b"] }));
    expect(parseCoachReply(JSON.stringify({ resumo: "x", perguntas }))?.questions.length).toBe(MAX_COACH_QUESTIONS);
  });

  it("sem perguntas, o prompt é dado como pronto", () => {
    expect(parseCoachReply('{"resumo":"Completo","perguntas":[],"pronto":false}')?.ready).toBe(true);
  });

  it("resposta que não é JSON não vira análise", () => {
    expect(parseCoachReply("Não consegui analisar.")).toBeNull();
    expect(parseCoachReply("{}")).toBeNull();
  });

  it("o prompt inteiro de 40.000 caracteres vai para a análise e cabe no servidor", () => {
    const sys = buildCoachSystem("z".repeat(MAX_STUDIO_INSTRUCTIONS));
    expect(sys).toContain("z".repeat(MAX_STUDIO_INSTRUCTIONS));
    expect(sys.length).toBeLessThanOrEqual(MAX_STUDIO_SYSTEM_CHARS);
  });

  it("não pergunta de novo o que já foi respondido", () => {
    const msg = buildCoachRequest("Alta", [{ question: "Qual tom?", answer: "Direto" }]);
    expect(msg).toContain("não pergunte de novo");
    expect(msg).toContain("Qual tom?");
    expect(buildCoachRequest("Alta")).not.toContain("RESPOSTAS ANTERIORES");
  });

  it("perguntas puladas não entram no pedido de nova versão", () => {
    const msg = buildRefineRequest("Alta", [{ question: "Qual tom?", answer: "Direto" }, { question: "Tamanho?", answer: "" }]);
    expect(msg).toContain("Qual tom?");
    expect(msg).not.toContain("Tamanho?");
    expect(msg.length).toBeLessThanOrEqual(MAX_STUDIO_CHARS);
  });

  it("mostra o antes e depois por linha", () => {
    const d = lineDiff("A\nB\nC", "A\nB2\nC\nD");
    expect(d).toEqual([
      { type: "same", text: "A" }, { type: "del", text: "B" }, { type: "add", text: "B2" },
      { type: "same", text: "C" }, { type: "add", text: "D" },
    ]);
    expect(diffStats(d)).toEqual({ added: 2, removed: 1 });
  });
});
