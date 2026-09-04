// Modalidade do Interpretador do Examinus (radiografia | ECG).
// Regras PURAS: nenhuma dependência de React, Supabase ou DOM — testáveis isoladamente.
// A detecção automática é ESTRITAMENTE AUXILIAR e conservadora: baseia-se apenas em
// pistas textuais explícitas (nome do arquivo e texto digitado). Nunca usa proporção
// da imagem, nunca "chuta" e nunca sobrepõe uma escolha manual do médico.

import { ECG_MODE } from "./ecgInterpreter";
import { RADIOLOGY_MODE } from "./radiologyInterpreter";

export type InterpreterModality = "radiografia" | "ecg";

export const INTERPRETER_MODALITIES: InterpreterModality[] = ["radiografia", "ecg"];

export const INTERPRETER_MODALITY_LABEL: Record<InterpreterModality, string> = {
  radiografia: "Radiografia",
  ecg: "ECG",
};

/** Texto exibido junto ao seletor, sempre visível antes do envio. */
export const INTERPRETER_MODALITY_HINT: Record<InterpreterModality, string> = {
  radiografia: "Segunda leitura de radiografia de tórax a partir da imagem original.",
  ecg: "Segunda leitura de eletrocardiograma a partir do traçado original.",
};

const ECG_HINTS = [
  "ecg",
  "ekg",
  "eletrocardiograma",
  "electrocardiogram",
  "eletro",
  "12 derivacoes",
  "12 derivações",
  "tracado",
  "traçado",
  "ritmo cardiaco",
];

const RADIOGRAPHY_HINTS = [
  "rx",
  "raio x",
  "raio-x",
  "raiox",
  "radiografia",
  "radiograma",
  "chest x-ray",
  "chest xray",
  "xray",
  "x-ray",
  "cxr",
  "torax",
  "tórax",
];

function normalize(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(haystack: string, hints: string[]): boolean {
  return hints.some((hint) => {
    const needle = normalize(hint);
    if (!needle) return false;
    // Palavras curtas (rx, ecg, ekg) só valem como token isolado, para evitar falsos positivos.
    if (needle.length <= 3) {
      return new RegExp(`(^| )${needle}( |$)`).test(haystack);
    }
    return haystack.includes(needle);
  });
}

export interface ModalityDetection {
  /** `null` quando não há confiança suficiente — nesse caso a modalidade NÃO deve mudar sozinha. */
  modality: InterpreterModality | null;
  confident: boolean;
}

/**
 * Detecção conservadora a partir de pistas textuais explícitas.
 * Retorna `null` quando não há pista, quando há pistas conflitantes das duas modalidades,
 * ou quando arquivos diferentes apontam para modalidades diferentes.
 */
export function detectInterpreterModality(
  inputs: { name?: string }[],
  typedText = "",
): ModalityDetection {
  const haystacks = [...inputs.map((i) => normalize(i?.name || "")), normalize(typedText)].filter(Boolean);
  let sawEcg = false;
  let sawRadiography = false;
  for (const hay of haystacks) {
    if (matches(hay, ECG_HINTS)) sawEcg = true;
    if (matches(hay, RADIOGRAPHY_HINTS)) sawRadiography = true;
  }
  if (sawEcg === sawRadiography) return { modality: null, confident: false };
  return { modality: sawEcg ? "ecg" : "radiografia", confident: true };
}

/**
 * Aplica a detecção respeitando a escolha manual: se o médico já escolheu a modalidade
 * nesta conversa (`locked`), nada muda. Sem confiança, também nada muda.
 */
export function applyModalityDetection(input: {
  current: InterpreterModality;
  locked: boolean;
  detection: ModalityDetection;
}): { modality: InterpreterModality; changed: boolean } {
  const { current, locked, detection } = input;
  if (locked || !detection.confident || !detection.modality || detection.modality === current) {
    return { modality: current, changed: false };
  }
  return { modality: detection.modality, changed: true };
}

export interface ModalityMessageLike {
  role?: string;
  metadata?: unknown;
}

/** Modalidade já usada nesta conversa (a partir dos metadados persistidos). Null se não houver. */
export function conversationInterpreterModality(messages: ModalityMessageLike[]): InterpreterModality | null {
  let found: InterpreterModality | null = null;
  for (const m of messages || []) {
    const meta = m?.metadata && typeof m.metadata === "object" ? (m.metadata as Record<string, unknown>) : null;
    if (!meta) continue;
    if (meta.mode === ECG_MODE) found = "ecg";
    else if (meta.mode === RADIOLOGY_MODE) found = "radiografia";
  }
  return found;
}

/** Rótulos usados na interface do Examinus, por modalidade. */
export function interpreterCopy(modality: InterpreterModality) {
  const ecg = modality === "ecg";
  return {
    label: INTERPRETER_MODALITY_LABEL[modality],
    dropTitle: ecg ? "Solte o ECG aqui" : "Solte a radiografia aqui",
    emptyError: ecg
      ? "Anexe o traçado do ECG (JPEG, PNG, WebP ou PDF) para interpretar."
      : "Anexe uma radiografia de tórax (JPEG, PNG, WebP ou PDF) para interpretar.",
    attachedOne: ecg ? "ECG anexado" : "radiografia anexada",
    attachedMany: ecg ? "ECGs anexados" : "radiografias anexadas",
    pendingAria: ecg ? "ECGs anexados" : "Radiografias anexadas",
    placeholder: ecg
      ? "Envie o ECG e, se quiser, o contexto clínico"
      : "Envie a radiografia e, se quiser, o contexto clínico",
    sendTitle: ecg ? "Interpretar ECG" : "Interpretar radiografia",
    sendEmptyTitle: ecg ? "Anexe um ECG para enviar" : "Anexe uma radiografia para enviar",
    analyzing: ecg ? "Analisando o ECG..." : "Analisando a radiografia...",
    lastPreviewPrefix: ecg ? "ECG" : "Radiografia",
    failure: ecg ? "Falha ao processar o ECG." : "Falha ao processar a radiografia.",
    followUpNoticeOne: ecg ? "o ECG já anexado" : "a radiografia já anexada",
    followUpNoticeMany: (n: number) => (ecg ? `os ${n} ECGs já anexados` : `as ${n} radiografias já anexadas`),
  };
}
