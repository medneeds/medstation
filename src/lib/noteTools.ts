// Pure text tools and the character-limit rule for the Bloco de Notas ("Personalizar").
// Kept dependency-free so the rules are testable.

export type LimitStatus = "none" | "ok" | "near" | "over";

/** Near the limit from this share of it (90%). */
export const NEAR_LIMIT_RATIO = 0.9;
export const MAX_NOTE_CHARS = 50000;
export const LIMIT_PRESETS = [1000, 2000, 4000, 8000, 10000] as const;
export const CHAR_LIMIT_STORAGE_KEY = "ms_note_char_limit";

export function limitStatus(length: number, limit: number | null): LimitStatus {
  if (!limit || limit <= 0) return "none";
  if (length > limit) return "over";
  if (length >= limit * NEAR_LIMIT_RATIO) return "near";
  return "ok";
}

/** Accepts only whole numbers between 1 and the note maximum; anything else means "no limit". */
export function parseCharLimit(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(Math.floor(n), MAX_NOTE_CHARS);
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Collapses runs of blank lines into a single blank line and drops trailing spaces on each line. */
export function collapseBlankLines(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "");
}

// Markdown marks, decorative bullets/arrows/checks, box drawing and emojis. Keeps letters (with accents),
// digits, regular punctuation and clinical symbols such as - + / % < > = | ( ) : ; , . ? !
const DECORATIVE = /[*#_`~^\u2022\u25AA-\u25FF\u2023\u2043\u2190-\u21FF\u2500-\u257F\u2600-\u27BF\u2B00-\u2BFF]|\p{Extended_Pictographic}|\uFE0F|\u200D/gu;
const INVISIBLE = /[\u200B\u200C\u2060\uFEFF]/g;

/** Removes decorative characters; line-leading bullets become "- " so lists stay lists. */
export function removeSpecialChars(text: string): string {
  return text
    .replace(INVISIBLE, "")
    .replace(/\u00A0/g, " ")
    .replace(/^([ \t]*)[\u2022\u25AA-\u25FF\u2023\u2043\u27A4\u2192\u2713\u2714]+[ \t]*/gm, "$1- ")
    .replace(DECORATIVE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]+$/gm, "");
}

export interface TextEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Applies a transform to the selected range, or to the whole text when nothing is selected.
 * Returns the new text and the range covering the transformed part.
 */
export function applyToRange(
  text: string,
  start: number,
  end: number,
  transform: (part: string) => string,
): TextEdit {
  const s = Math.max(0, Math.min(start, end));
  const e = Math.min(text.length, Math.max(start, end));
  if (s === e) {
    const all = transform(text);
    return { text: all, selectionStart: 0, selectionEnd: 0 };
  }
  const part = transform(text.slice(s, e));
  return { text: text.slice(0, s) + part + text.slice(e), selectionStart: s, selectionEnd: s + part.length };
}

export const toUpperPtBr = (part: string) => part.toLocaleUpperCase("pt-BR");

export const toLowerPtBr = (part: string) => part.toLocaleLowerCase("pt-BR");

// Clinical abbreviations kept as written when the text goes back to "Padrão" or "Iniciais Maiúsculas".
const ACRONYMS = [
  "AA", "AAS", "ABD", "AC", "ACM", "AIT", "AINE", "AVC", "AVCI", "AVCH", "AP", "BEG", "BNF", "BRNF", "BIC", "BH", "CID",
  "CIVD", "CKD", "CPK", "CRM", "CT", "CVC", "DAC", "DM", "DM1", "DM2", "DPOC", "DRC", "DRGE", "DVA", "EAP", "EAS", "ECG",
  "ECO", "EDA", "EEG", "EV", "FA", "FC", "FR", "FAN", "HAS", "HB", "HBV", "HCV", "HDA", "HDB", "HGT", "HIV", "HMA", "HPP",
  "HT", "IAM", "IAMCSST", "IAMSSST", "IC", "ICC", "IECA", "IM", "IMC", "INR", "IOT", "IRA", "IRC", "ITU", "IVAS", "LCR",
  "LRA", "MEG", "MMII", "MMSS", "MV", "PA", "PAD", "PAM", "PAS", "PCR", "PO", "POI", "PS", "PVC", "RCR", "RHA", "RM",
  "RN", "RX", "SC", "SDRA", "SF", "SNC", "SNE", "SNG", "SUS", "SVD", "TC", "TCE", "TEP", "TGO", "TGP", "TOT", "TSH",
  "TTPA", "TVP", "UBS", "UPA", "USG", "UTI", "VDRL", "VHS", "VM", "VNI", "VO", "VVP", "T4L", "SpO2", "SatO2", "FiO2",
  "PaO2", "PaCO2", "HCO3", "EtCO2", "PEEP", "BAAR", "BCP", "COVID", "COVID-19", "CPAP", "BiPAP", "Glasgow", "SOFA", "qSOFA",
];
const ACRONYM_MAP = new Map(ACRONYMS.map((a) => [a.toLocaleUpperCase("pt-BR"), a]));
const SMALL_WORDS = new Set(["a", "à", "ao", "aos", "as", "às", "o", "os", "de", "da", "das", "do", "dos", "e", "em", "na", "nas", "no", "nos", "para", "por", "com", "um", "uma"]);
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;

/** Keeps listed clinical abbreviations, and all-caps tokens mixing letters and digits (e.g. D1, CKD3). */
function keepAbbreviation(original: string): string | null {
  const upper = original.toLocaleUpperCase("pt-BR");
  const known = ACRONYM_MAP.get(upper);
  if (known) return known;
  if (/\p{L}/u.test(original) && /\p{N}/u.test(original) && original === upper) return original;
  return null;
}

const capitalize = (w: string) => w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1);

/** "Padrão": lowercase with a capital at the start of each sentence and line; clinical abbreviations stay. */
export function toSentenceCasePtBr(part: string): string {
  let last = 0;
  let out = "";
  for (const m of part.matchAll(WORD)) {
    const gap = part.slice(last, m.index);
    const startOfSentence = last === 0 || gap.includes("\n") || /[.!?]/.test(gap);
    out += gap;
    const kept = keepAbbreviation(m[0]);
    const lower = m[0].toLocaleLowerCase("pt-BR");
    out += kept ?? (startOfSentence ? capitalize(lower) : lower);
    last = m.index! + m[0].length;
  }
  return out + part.slice(last);
}

/** "Iniciais Maiúsculas": each word capitalized, except short connectors (de, da, e...) in the middle. */
export function toTitleCasePtBr(part: string): string {
  let first = true;
  return part.replace(WORD, (w, offset: number) => {
    const before = part.slice(0, offset);
    const lineStart = first || /\n[\s\-•*\d.)]*$/.test(before);
    first = false;
    const kept = keepAbbreviation(w);
    if (kept) return kept;
    const lower = w.toLocaleLowerCase("pt-BR");
    if (!lineStart && SMALL_WORDS.has(lower)) return lower;
    return capitalize(lower);
  });
}

// ---- Undo / redo for the notepad (typing bursts and quick tools) ----

export const HISTORY_LIMIT = 100;
export interface HistoryEntry {
  content: string;
  label: string;
}
export interface EditHistory {
  past: HistoryEntry[];
  future: HistoryEntry[];
}
export const emptyHistory = (): EditHistory => ({ past: [], future: [] });

/** Remembers the text as it was before an edit; a new edit clears what could be redone. */
export function recordEdit(history: EditHistory, before: string, label: string): EditHistory {
  const past = [...history.past, { content: before, label }];
  return { past: past.slice(-HISTORY_LIMIT), future: [] };
}

/** Steps back one edit; returns null when there is nothing to undo. */
export function undoEdit(history: EditHistory, current: string): { history: EditHistory; content: string; label: string } | null {
  const entry = history.past[history.past.length - 1];
  if (!entry) return null;
  return {
    content: entry.content,
    label: entry.label,
    history: { past: history.past.slice(0, -1), future: [...history.future, { content: current, label: entry.label }] },
  };
}

/** Re-applies the last undone edit; returns null when there is nothing to redo. */
export function redoEdit(history: EditHistory, current: string): { history: EditHistory; content: string; label: string } | null {
  const entry = history.future[history.future.length - 1];
  if (!entry) return null;
  return {
    content: entry.content,
    label: entry.label,
    history: { past: [...history.past, { content: current, label: entry.label }], future: history.future.slice(0, -1) },
  };
}

/** Index of the first character where two texts differ (where to put the cursor after undo/redo). */
export function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Part of the text past the doctor's character goal (to select and trim it); null when within the goal. */
export function excessRange(length: number, limit: number | null): { start: number; end: number; over: number } | null {
  if (!limit || limit <= 0 || length <= limit) return null;
  return { start: limit, end: length, over: length - limit };
}
