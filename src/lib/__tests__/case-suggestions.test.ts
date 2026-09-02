import { describe, expect, it } from "vitest";
import {
  blockToText,
  itemToFollowUpQuestion,
  parseCaseSuggestions,
} from "@/lib/caseSuggestions";

const SAMPLE = `LACUNAS DA HISTÓRIA

- Há quanto tempo iniciou a dor? (define janela terapêutica)
- Uso prévio de anticoagulante? (muda conduta)

HIPÓTESES DIAGNÓSTICAS

- SCA sem supra. SUSTENTA: dor típica. FALTA: troponina seriada.

SUGESTÕES DE CONDUTA E INVESTIGAÇÃO

Recomendações condicionais aos dados disponíveis.
- ECG seriado em 3 horas (CONDICIONAL)

SUGESTÕES DE APOIO — A DECISÃO FINAL É DO MÉDICO ASSISTENTE.`;

describe("parseCaseSuggestions", () => {
  it("separa blocos por título em caixa alta", () => {
    const { blocks } = parseCaseSuggestions(SAMPLE);
    expect(blocks.map((b) => b.title)).toEqual([
      "LACUNAS DA HISTÓRIA",
      "HIPÓTESES DIAGNÓSTICAS",
      "SUGESTÕES DE CONDUTA E INVESTIGAÇÃO",
    ]);
  });

  it("extrai itens sem o hífen", () => {
    const { blocks } = parseCaseSuggestions(SAMPLE);
    expect(blocks[0].items).toHaveLength(2);
    expect(blocks[0].items[0]).toContain("Há quanto tempo");
  });

  it("mantém texto solto como nota do bloco", () => {
    const { blocks } = parseCaseSuggestions(SAMPLE);
    expect(blocks[2].notes).toEqual(["Recomendações condicionais aos dados disponíveis."]);
  });

  it("isola o rodapé de decisão final", () => {
    const { footer } = parseCaseSuggestions(SAMPLE);
    expect(footer).toContain("DECISÃO FINAL");
  });

  it("não trata linha clínica com dois pontos como título", () => {
    const { blocks } = parseCaseSuggestions("HIPÓTESES DIAGNÓSTICAS\n- CID: I21.0");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].items).toEqual(["CID: I21.0"]);
  });

  it("tolera resposta vazia", () => {
    expect(parseCaseSuggestions("")).toEqual({ blocks: [], footer: null });
  });

  it("agrupa conteúdo sem título em bloco genérico", () => {
    const { blocks } = parseCaseSuggestions("- Solicitar troponina");
    expect(blocks[0].title).toBe("SUGESTÕES");
  });

  it("blockToText remonta título e itens", () => {
    const { blocks } = parseCaseSuggestions(SAMPLE);
    const text = blockToText(blocks[0]);
    expect(text.startsWith("LACUNAS DA HISTÓRIA")).toBe(true);
    expect(text).toContain("- Uso prévio de anticoagulante?");
  });

  it("gera pergunta de follow-up sem inventar dados", () => {
    const q = itemToFollowUpQuestion("Solicitar troponina", "SUGESTÕES DE CONDUTA");
    expect(q).toContain("Solicitar troponina");
    expect(q).toContain("sem inventar dados");
  });
});
