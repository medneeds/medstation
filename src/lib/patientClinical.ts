// Etiquetas clínicas rápidas e alerta de alergia na receita.
// Regras puras para ficarem testáveis sem a tela.

export const PRESET_CLINICAL_TAGS = [
  "Hipertenso",
  "Diabético",
  "Gestante",
  "Idoso frágil",
  "Renal crônico",
  "Cardiopata",
  "Anticoagulado",
  "Pós-operatório",
  "Oncológico",
  "Saúde mental",
] as const;

export const MAX_CLINICAL_TAGS = 8;
export const MAX_TAG_LENGTH = 30;

/** Limpa, remove duplicadas (sem diferenciar maiúsculas/acentos) e limita a quantidade. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;
    const key = foldText(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_CLINICAL_TAGS) break;
  }
  return out;
}

export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Separa o texto livre de alergias em termos ("dipirona, penicilina; AAS"). */
export function parseAllergies(allergies: string | null | undefined): string[] {
  if (!allergies) return [];
  return allergies
    .split(/[,;\n/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !/^(nega|nenhuma|sem alergias?|nkda)$/i.test(foldText(t)));
}

/**
 * Devolve os termos de alergia que aparecem no nome do medicamento.
 * Comparação sem acentos e sem diferenciar maiúsculas; serve só de alerta para o médico conferir.
 */
export function allergyHits(medicationName: string, allergies: string | null | undefined): string[] {
  const med = foldText(medicationName);
  if (!med) return [];
  return parseAllergies(allergies).filter((term) => med.includes(foldText(term)));
}
