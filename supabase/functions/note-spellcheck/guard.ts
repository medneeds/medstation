// Import-free safety check for the note spelling correction: the AI may only fix spelling,
// so numbers (doses, values, dates), line structure and overall size must stay the same.

export const MAX_SPELLCHECK_CHARS = 20000;

const numbersOf = (text: string) => text.match(/\d+(?:[.,]\d+)*/g) ?? [];
const linesOf = (text: string) => text.replace(/\r\n?/g, "\n").replace(/\s+$/, "").split("\n").length;

export type GuardResult = { ok: true } | { ok: false; reason: "numbers" | "lines" | "size" | "empty" };

export function checkSpellingOnly(original: string, corrected: string): GuardResult {
  if (!corrected.trim()) return { ok: false, reason: "empty" };
  const a = numbersOf(original);
  const b = numbersOf(corrected);
  if (a.length !== b.length || a.some((n, i) => n !== b[i])) return { ok: false, reason: "numbers" };
  if (linesOf(original) !== linesOf(corrected)) return { ok: false, reason: "lines" };
  const diff = Math.abs(corrected.length - original.length);
  if (diff > Math.max(40, original.length * 0.1)) return { ok: false, reason: "size" };
  return { ok: true };
}
