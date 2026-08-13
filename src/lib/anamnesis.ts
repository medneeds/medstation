import type { AnamnesisStructure } from "@/hooks/useConsultation";

export const ANAMNESIS_LABELS: Record<keyof AnamnesisStructure, string> = {
  chiefComplaint: "QUEIXA PRINCIPAL",
  historyPresentIllness: "HISTÓRIA DA DOENÇA ATUAL",
  pastMedicalHistory: "HISTÓRIA PATOLÓGICA PREGRESSA",
  familyHistory: "HISTÓRIA FAMILIAR",
  medications: "MEDICAMENTOS EM USO",
  allergies: "ALERGIAS",
  socialHistory: "HÁBITOS DE VIDA",
  reviewOfSystems: "REVISÃO DE SISTEMAS",
  physicalExam: "EXAME FÍSICO",
  diagnosticHypotheses: "HIPÓTESES DIAGNÓSTICAS",
  plan: "CONDUTA",
};

export const ANAMNESIS_ORDER: (keyof AnamnesisStructure)[] = [
  "chiefComplaint",
  "historyPresentIllness",
  "pastMedicalHistory",
  "familyHistory",
  "medications",
  "allergies",
  "socialHistory",
  "reviewOfSystems",
  "physicalExam",
  "diagnosticHypotheses",
  "plan",
];

export function buildAnamnesisText(structure: AnamnesisStructure): string {
  return ANAMNESIS_ORDER.filter((key) => structure[key]?.trim())
    .map((key) => `${ANAMNESIS_LABELS[key]}:\n${structure[key].trim()}`)
    .join("\n\n");
}

export function countFilledSections(structure: AnamnesisStructure): number {
  return ANAMNESIS_ORDER.filter((key) => structure[key]?.trim()).length;
}
