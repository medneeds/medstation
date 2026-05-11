import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guarda de vocabulário: garante que jargão técnico proibido não volte
 * para textos visíveis ao médico. Ver mem://style/medical-friendly-language.
 *
 * Regras:
 * - Varremos arquivos .tsx das páginas/componentes (camada de UI).
 * - Ignoramos linhas de import, comentários de linha (// ...) e identificadores
 *   internos (nomes de variáveis, props, chaves de objeto). Só procuramos os
 *   termos quando aparecem como texto literal exibido (entre aspas, crases ou
 *   diretamente no JSX).
 * - Arquivos opt-out: este teste e quaisquer arquivos *.test.tsx.
 */

const ROOTS = ["src/pages", "src/components"];

// Termos que NUNCA devem aparecer em UI voltada ao médico.
// Use regex insensível a caixa. Whole-word para evitar falsos positivos.
const FORBIDDEN: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bScribe(\s*v?\d)?\b/i, replacement: "transcrição em tempo real" },
  { pattern: /\bWhisper(\s*-?\s*1)?\b/i, replacement: "reconhecimento de voz médico" },
  { pattern: /\bAHE\b/, replacement: "anamnese estruturada automaticamente" },
  { pattern: /\bcooldown\b/i, replacement: "espera entre mensagens" },
  { pattern: /\bVAD\b/, replacement: "detecção de fala" },
  { pattern: /\bstreaming\b/i, replacement: "tempo real" },
  { pattern: /\bcota\b/i, replacement: "limite de uso" },
  { pattern: /\banti-?aluc\w*/i, replacement: "sem invenções" },
];

const ALLOWED_FILES = new Set<string>([
  "src/test/forbidden-vocabulary.test.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

// Atributos JSX/objetos cujo valor é exibido ao usuário
const USER_FACING_ATTRS = [
  "title",
  "placeholder",
  "alt",
  "aria-label",
  "label",
  "description",
  "headline",
  "subline",
  "tooltip",
  "message",
  "text",
  "content",
];

/**
 * Extrai apenas trechos visíveis ao usuário de uma linha:
 * - texto JSX entre `>` e `<`
 * - valores de atributos visíveis (title="..." / label: "...")
 * Retorna string vazia se nada visível na linha.
 */
function extractUserFacing(line: string): string {
  // descarta imports e comentários de linha
  if (/^\s*(import|export)\s.+from\s+['"]/.test(line)) return "";
  const c = line.indexOf("//");
  const noComment = c >= 0 ? line.slice(0, c) : line;

  const parts: string[] = [];

  // JSX text: >texto<
  for (const m of noComment.matchAll(/>([^<>{}\n]+)</g)) parts.push(m[1]);

  // Atributos JSX: attr="..." ou attr={"..."}
  const attrRe = new RegExp(
    `\\b(${USER_FACING_ATTRS.join("|")})\\s*[=:]\\s*\\{?\\s*["'\`]([^"'\`]+)["'\`]`,
    "gi",
  );
  for (const m of noComment.matchAll(attrRe)) parts.push(m[2]);

  return parts.join(" \u0000 ");
}

describe("vocabulário médico-amigável (UI)", () => {
  const files = ROOTS.flatMap((r) => walk(r));

  it("não contém jargão técnico proibido", () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(process.cwd(), file);
      if (ALLOWED_FILES.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((rawLine, idx) => {
        const line = extractUserFacing(rawLine);
        if (!line.trim()) return;
        for (const { pattern, replacement } of FORBIDDEN) {
          if (pattern.test(line)) {
            violations.push(
              `${rel}:${idx + 1}  →  "${rawLine.trim()}"\n    use: ${replacement}`,
            );
          }
        }
      });
    }

    if (violations.length) {
      throw new Error(
        `Encontrado vocabulário proibido em UI (${violations.length}):\n\n` +
          violations.join("\n\n") +
          "\n\nVer mem://style/medical-friendly-language.",
      );
    }
    expect(violations).toEqual([]);
  });
});
