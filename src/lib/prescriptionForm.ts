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

export type DictatedPatientAction<T> =
  | { action: "select"; patient: T }
  | { action: "ask"; reason: "ambiguous" | "none"; count?: number }
  | { action: "keep" }
  | { action: "warn" };

/**
 * O que fazer com o paciente ditado. Com paciente já selecionado, nunca troca:
 * só avisa ("warn") se o nome ditado for diferente. Sem paciente selecionado,
 * seleciona apenas com um único nome completo idêntico; senão pede para escolher.
 */
export function decideDictatedPatient<T>(
  selectedName: string | null,
  match: DictatedPatientMatch<T>,
  dictatedName: string,
): DictatedPatientAction<T> {
  if (selectedName !== null) {
    return normalizePersonName(selectedName) === normalizePersonName(dictatedName || "")
      ? { action: "keep" }
      : { action: "warn" };
  }
  if (match.status === "match") return { action: "select", patient: match.patient };
  if (match.status === "ambiguous") return { action: "ask", reason: "ambiguous", count: match.count };
  return { action: "ask", reason: "none" };
}

/** Verdadeiro quando o médico já escreveu algo em qualquer campo do medicamento. */
export function isMedicationFilled(med: PrescriptionMedication): boolean {
  return [med.name, med.dosage, med.frequency, med.duration, med.instructions].some((v) => (v || "").trim() !== "");
}

/**
 * Junta os medicamentos ditados aos já preenchidos: o que foi digitado fica e o ditado
 * entra depois. Se o ditado traz um medicamento com o mesmo nome (ignorando acentos,
 * maiúsculas e espaços) de um já preenchido, ele substitui esse no mesmo lugar em vez
 * de duplicar. Linhas vazias (placeholder) são descartadas. Sem nada preenchido,
 * o ditado substitui a lista, como antes.
 */
export function mergeDictatedMedications(
  current: PrescriptionMedication[],
  dictated: PrescriptionMedication[],
): PrescriptionMedication[] {
  if (dictated.length === 0) return current;
  const merged = current.filter(isMedicationFilled);
  if (merged.length === 0) return dictated;
  for (const med of dictated) {
    const key = normalizePersonName(med.name || "");
    const index = key ? merged.findIndex((m) => normalizePersonName(m.name || "") === key) : -1;
    if (index >= 0) merged[index] = med;
    else merged.push(med);
  }
  return merged;
}

export const DEFAULT_VALIDITY_DAYS = 30;
export const MAX_VALIDITY_DAYS = 365;

/** Converte o campo de validade em dias inteiros: vazio/inválido vira 30; limita a 1–365. */
export function parseValidityDays(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? Math.trunc(raw) : parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return DEFAULT_VALIDITY_DAYS;
  return Math.min(MAX_VALIDITY_DAYS, Math.max(1, n));
}
