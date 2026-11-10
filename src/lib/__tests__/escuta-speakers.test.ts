import { describe, expect, it } from "vitest";
import { acceptLabeledTranscript } from "../../../supabase/functions/structure-anamnesis/speakers";

const original = "O que o senhor está sentindo? Estou com dor de cabeça há três dias. Vou prescrever dipirona 500 mg.";

describe("Reconhecimento automático de falantes", () => {
  it("aceita rótulos quando as palavras são as mesmas", () => {
    const labeled = "Médico: O que o senhor está sentindo?\nPaciente: Estou com dor de cabeça há três dias.\nMédico: Vou prescrever dipirona 500 mg.";
    expect(acceptLabeledTranscript(original, labeled)).toBe(labeled);
  });
  it("rejeita quando a IA muda uma dose", () => {
    const labeled = "Médico: O que o senhor está sentindo?\nPaciente: Estou com dor de cabeça há três dias.\nMédico: Vou prescrever dipirona 1 g.";
    expect(acceptLabeledTranscript(original, labeled)).toBeNull();
  });
  it("rejeita quando a IA remove uma fala", () => {
    const labeled = "Médico: O que o senhor está sentindo?\nMédico: Vou prescrever dipirona 500 mg.";
    expect(acceptLabeledTranscript(original, labeled)).toBeNull();
  });
  it("rejeita linha sem rótulo válido", () => {
    const labeled = "Médico: O que o senhor está sentindo?\nEnfermeira: Estou com dor de cabeça há três dias.\nMédico: Vou prescrever dipirona 500 mg.";
    expect(acceptLabeledTranscript(original, labeled)).toBeNull();
  });
});
