import { describe, expect, it } from "vitest";
import { clinicusPrimaryCarePrompt, isPrimaryCareTemplate, primaryCareModel } from "../../../supabase/functions/_shared/primary-care-notes.ts";
import { documentPromptFor, parseClinicalContext } from "../../../supabase/functions/structure-anamnesis/clinical-context.ts";

describe("contextos PSF e SOAP", () => {
  it("reconhece só psf e soap como modelos de atenção primária", () => {
    expect(isPrimaryCareTemplate("psf")).toBe(true);
    expect(isPrimaryCareTemplate("soap")).toBe(true);
    expect(isPrimaryCareTemplate("consultorio")).toBe(false);
  });

  it("SOAP tem as quatro seções na ordem S, O, A, P", () => {
    const m = primaryCareModel("soap");
    const pos = ["S | SUBJETIVO:", "O | OBJETIVO:", "A | AVALIAÇÃO:", "P | PLANO:"].map((t) => m.lastIndexOf(t));
    expect(pos.every((p) => p > 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it("PSF traz linha de cuidado, contexto familiar e retorno", () => {
    const m = primaryCareModel("psf");
    expect(m).toContain("LINHA DE CUIDADO");
    expect(m).toContain("CONTEXTO FAMILIAR E SOCIAL");
    expect(m).toContain("RETORNO E ACOMPANHAMENTO:");
  });

  it("os dois separam problemas ativos de hipóteses e não inventam CID", () => {
    for (const t of ["psf", "soap"] as const) {
      const m = primaryCareModel(t);
      expect(m).toContain("PROBLEMAS ATIVOS");
      expect(m).toContain("HIPÓTESES DIAGNÓSTICAS");
      expect(m).toContain("Nunca invente código");
    }
  });

  it("Clínicus recebe a data de hoje", () => {
    expect(clinicusPrimaryCarePrompt("soap", "09/11/2026")).toContain("09/11/2026");
  });

  it("Modo Escuta aceita psf e soap e usa o mesmo modelo", () => {
    expect(parseClinicalContext("psf")).toBe("psf");
    expect(parseClinicalContext("soap")).toBe("soap");
    expect(documentPromptFor("soap")).toContain(primaryCareModel("soap"));
    expect(documentPromptFor("psf")).toContain(primaryCareModel("psf"));
    expect(documentPromptFor("psf")).toContain("FIDELIDADE À CONSULTA");
  });
});
