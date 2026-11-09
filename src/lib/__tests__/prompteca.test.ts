import { describe, expect, it } from "vitest";
import { findPersonalData, formatRating, matchesSearch, validatePromptecaDraft } from "../prompteca";

const ok = {
  kind: "prompt" as const,
  title: "Evolução de enfermaria",
  description: "",
  content: "Organize a evolução em S, O, A e P sem inventar dados.",
  category: "documentacao",
};

describe("Prompteca", () => {
  it("publica um prompt completo e sem dados pessoais", () => {
    expect(validatePromptecaDraft(ok)).toEqual([]);
  });

  it("bloqueia CPF, telefone, e-mail e Cartão SUS", () => {
    expect(findPersonalData("Paciente CPF 123.456.789-09")).toEqual(["CPF"]);
    expect(findPersonalData("ligar (98) 98123-4567")).toEqual(["telefone"]);
    expect(findPersonalData("enviar para maria@gmail.com")).toEqual(["e-mail"]);
    expect(findPersonalData("CNS 898 0012 3456 7890")).toEqual(["Cartão SUS"]);
    expect(validatePromptecaDraft({ ...ok, content: ok.content + " CPF 12345678909" }).join(" ")).toContain("dados pessoais");
  });

  it("não confunde doses e valores clínicos com dados pessoais", () => {
    expect(findPersonalData("Dipirona 500 mg 6/6h, PA 120x80, Hb 10,2, K 4.5, 2026-11-09")).toEqual([]);
  });

  it("exige título e prompt com tamanho mínimo e categoria válida", () => {
    const errors = validatePromptecaDraft({ ...ok, title: "ab", content: "curto", category: "x" });
    expect(errors).toHaveLength(3);
  });

  it("mostra a nota com vírgula e nada sem avaliações", () => {
    expect(formatRating(4.666, 3)).toBe("4,7");
    expect(formatRating(0, 0)).toBe("");
  });

  it("busca sem acento e por vários termos", () => {
    const item = { title: "Evolução de UTI", description: "", content: "", author_name: "Ana Souza" };
    expect(matchesSearch(item, "evolucao ana")).toBe(true);
    expect(matchesSearch(item, "pediatria")).toBe(false);
  });
});
