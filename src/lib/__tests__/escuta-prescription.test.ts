import { describe, expect, it } from "vitest";
import { AI_PRESCRIPTION_NOTICE } from "../../../supabase/functions/_shared/ai-prescription-notice";
import { cleanPrescription, NO_PRESCRIPTION, prescriptionPromptFor } from "../../../supabase/functions/structure-anamnesis/prescription";

describe("Prescriptus no Modo Escuta", () => {
  it("emergência rápida separa medicação no PS da receita de alta", () => {
    expect(prescriptionPromptFor("emergencia_rapida")).toContain("MEDICAÇÃO NO ATENDIMENTO");
  });
  it("PSF prioriza RENAME / Farmácia Básica", () => {
    expect(prescriptionPromptFor("psf")).toContain("RENAME");
  });
  it("contexto desconhecido cai no consultório", () => {
    expect(prescriptionPromptFor("xyz")).toContain("CONSULTÓRIO / AMBULATÓRIO");
  });
  it("sem indicação, usa a frase fixa", () => {
    expect(prescriptionPromptFor("consultorio")).toContain(NO_PRESCRIPTION);
  });
  it("remove markdown", () => {
    expect(cleanPrescription("## RECEITUÁRIO\n**Dipirona**").startsWith("RECEITUÁRIO\nDipirona")).toBe(true);
  });
});

describe("Aviso CFM e evidências", () => {
  it("receita sugerida termina com o aviso de IA e CFM", () => {
    const out = cleanPrescription("RECEITUÁRIO\nDipirona");
    expect(out.endsWith(AI_PRESCRIPTION_NOTICE)).toBe(true);
    expect(AI_PRESCRIPTION_NOTICE).toContain("CFM");
  });
  it("não duplica o aviso", () => {
    const once = cleanPrescription("RECEITUÁRIO\nDipirona");
    expect(cleanPrescription(once).split(AI_PRESCRIPTION_NOTICE).length).toBe(2);
  });
  it("sem prescrição indicada, não acrescenta aviso", () => {
    expect(cleanPrescription(NO_PRESCRIPTION)).toBe(NO_PRESCRIPTION);
  });
  it("o modelo exige a seção de evidências científicas", () => {
    expect(prescriptionPromptFor("consultorio")).toContain("EVIDÊNCIAS CIENTÍFICAS");
  });
});
