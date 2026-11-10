import { describe, expect, it } from "vitest";
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
    expect(cleanPrescription("## RECEITUÁRIO\n**Dipirona**")).toBe("RECEITUÁRIO\nDipirona");
  });
});
