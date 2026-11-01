// Regras puras do formulário de nova prescrição (ditado por voz e validade),
// separadas da página para ficarem testáveis.

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

/** Minúsculas, sem acentos e com espaços normalizados — "  JOSÉ  da Silva " → "jose da silva". */
export function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type DictatedPatientMatch<T> =
  | { status: "match"; patient: T }
  | { status: "ambiguous"; count: number }
  | { status: "none" };

/**
 * Procura o paciente pelo nome ditado. Só aceita nome completo idêntico (ignorando
 * acentos, maiúsculas e espaços). Nome parcial ("Ana" x "Mariana") nunca seleciona,
 * e homônimos ficam para o médico escolher.
 */
export function matchDictatedPatient<T extends { name: string }>(
  patients: T[],
  dictatedName: string,
): DictatedPatientMatch<T> {
  const target = normalizePersonName(dictatedName || "");
  if (!target) return { status: "none" };
  const matches = patients.filter((p) => normalizePersonName(p.name || "") === target);
  if (matches.length === 1) return { status: "match", patient: matches[0] };
  if (matches.length > 1) return { status: "ambiguous", count: matches.length };
  return { status: "none" };
}

/** Verdadeiro quando o médico já escreveu algo em qualquer campo do medicamento. */
export function isMedicationFilled(med: PrescriptionMedication): boolean {
  return [med.name, med.dosage, med.frequency, med.duration, med.instructions].some((v) => (v || "").trim() !== "");
}

/**
 * Junta os medicamentos ditados aos já preenchidos: o que foi digitado fica e o ditado
 * entra depois. Linhas vazias (placeholder) são descartadas. Sem nada preenchido,
 * o ditado substitui a lista, como antes.
 */
export function mergeDictatedMedications(
  current: PrescriptionMedication[],
  dictated: PrescriptionMedication[],
): PrescriptionMedication[] {
  if (dictated.length === 0) return current;
  const filled = current.filter(isMedicationFilled);
  return filled.length ? [...filled, ...dictated] : dictated;
}

export const DEFAULT_VALIDITY_DAYS = 30;
export const MAX_VALIDITY_DAYS = 365;

/** Converte o campo de validade em dias inteiros: vazio/inválido vira 30; limita a 1–365. */
export function parseValidityDays(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? Math.trunc(raw) : parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return DEFAULT_VALIDITY_DAYS;
  return Math.min(MAX_VALIDITY_DAYS, Math.max(1, n));
}
