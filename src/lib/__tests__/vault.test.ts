import { describe, expect, it } from "vitest";
import { vaultStoragePath, vaultTitleFrom } from "@/lib/vault";

describe("Cofre Inteligente", () => {
  it("títulos de respostas salvas usam a primeira linha e o nome do assistente", () => {
    expect(vaultTitleFrom("\n\nHIPÓTESES DIAGNÓSTICAS\n- Sepse", "Clínicus")).toBe("Clínicus · HIPÓTESES DIAGNÓSTICAS");
  });
  it("arquivos ficam sempre dentro da pasta do próprio médico", () => {
    expect(vaultStoragePath("u1", "Diretriz Sépse.pdf", 5)).toBe("u1/5-Diretriz_Sepse.pdf");
  });
});
