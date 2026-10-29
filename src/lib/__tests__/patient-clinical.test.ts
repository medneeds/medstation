import { describe, it, expect } from "vitest";
import { allergyHits, normalizeTags, parseAllergies, MAX_CLINICAL_TAGS } from "../patientClinical";

describe("etiquetas clínicas", () => {
  it("remove duplicadas sem diferenciar maiúsculas ou acentos", () => {
    expect(normalizeTags(["Diabético", "diabetico", " Hipertenso "])).toEqual(["Diabético", "Hipertenso"]);
  });

  it("limita a quantidade de etiquetas por paciente", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Tag ${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_CLINICAL_TAGS);
  });
});

describe("alerta de alergia na receita", () => {
  it("avisa quando o medicamento contém a substância alérgica, mesmo sem acento", () => {
    expect(allergyHits("Amoxicilina 500 mg", "Penicilina, amoxicilina")).toEqual(["amoxicilina"]);
    expect(allergyHits("Dipirona sódica 1 g", "dipirôna")).toEqual(["dipirôna"]);
  });

  it("não avisa quando não há relação", () => {
    expect(allergyHits("Paracetamol 750 mg", "Dipirona; AAS")).toEqual([]);
  });

  it("ignora 'nega alergias'", () => {
    expect(parseAllergies("Nega")).toEqual([]);
    expect(allergyHits("Dipirona", "nega")).toEqual([]);
  });
});
