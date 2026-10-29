/**
 * CODexus · Modo D.A. (Dias & Afastamento). Os títulos precisam bater com
 * supabase/functions/agent-chat/codexus-afastamento.ts (um teste garante).
 */
export const AFASTAMENTO_HEADER = "DIAS & AFASTAMENTO";
export const AFASTAMENTO_ATESTUS_HEADER = "PARA O ATESTUS";
export const ATESTUS_PATH = "/atestus";

/** A resposta é do modo D.A. quando abre com o cabeçalho fixo. */
export function isAfastamentoResponse(content: string): boolean {
  return content.trimStart().toUpperCase().startsWith(AFASTAMENTO_HEADER);
}

/** Linhas do bloco "PARA O ATESTUS" (CID e dias), sem marcadores. */
export function extractAtestusBlock(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toUpperCase() === AFASTAMENTO_ATESTUS_HEADER);
  if (start < 0) return [];
  const out: string[] = [];
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    if (!line) {
      if (out.length > 0) break;
      continue;
    }
    if (!/^[-•]/.test(line)) break;
    out.push(line.replace(/^[-•]\s*/, ""));
  }
  return out;
}

/** Texto que chega pronto no campo do Atestus. */
export function buildAtestusPrefill(caseText: string, content: string): string {
  const block = extractAtestusBlock(content);
  const parts = ["Emitir atestado de afastamento."];
  const caso = caseText.trim();
  if (caso) parts.push(`Caso: ${caso}`);
  if (block.length > 0) parts.push(`Sugestão do CODexus (D.A.):\n${block.map((l) => `• ${l}`).join("\n")}`);
  parts.push("Use os dias do tipo de trabalho do paciente. Nome e CPF: [preencher].");
  return parts.join("\n\n");
}
