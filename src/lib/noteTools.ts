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
