/**
 * Parser de apresentação para respostas estruturadas do Clínicus.
 * Puro e sem efeitos: recebe o texto cru e devolve blocos para renderização.
 * NÃO altera o conteúdo — apenas classifica linhas para dar hierarquia visual.
 */

export type ClinicalBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "keyValue"; label: string; value: string };

export type ClinicalSection = {
  /** Título da seção (vazio quando o conteúdo vem antes de qualquer título). */
  title: string;
  blocks: ClinicalBlock[];
  /** Texto original da seção, usado para copiar apenas esse bloco. */
  raw: string;
};

const BULLET_RE = /^\s*(?:[-•*–—]|\d+[.)])\s+/;
const KEY_VALUE_RE = /^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9][^:\n]{1,48}):\s+(.+)$/;

/** Remove resíduos de markdown (negrito/itálico/títulos) sem mexer no restante. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "");
}

function isHeading(line: string): boolean {
  const t = line.trim().replace(/[:：]\s*$/, "");
  if (t.length < 3 || t.length > 60) return false;
  if (BULLET_RE.test(line)) return false;
  const letters = t.replace(/[^A-Za-zÁ-Úá-ú]/g, "");
  if (letters.length < 3) return false;
  // Considera título quando não há letras minúsculas (permite números/símbolos).
  return letters === letters.toUpperCase();
}

/**
 * Indica se vale a pena renderizar como documento estruturado.
 * Respostas curtas ou de conversa continuam no render simples.
 */
export function isStructuredClinicalText(text: string): boolean {
  const clean = stripMarkdown(text ?? "");
  if (clean.trim().length < 160) return false;
  const lines = clean.split("\n");
  const headings = lines.filter((l) => isHeading(l)).length;
  const bullets = lines.filter((l) => BULLET_RE.test(l)).length;
  return headings >= 2 || (headings >= 1 && bullets >= 2);
}

/** Converte o texto em seções com blocos tipados. */
export function parseClinicalResponse(text: string): ClinicalSection[] {
  const clean = stripMarkdown(text ?? "").replace(/\r\n/g, "\n");
  const lines = clean.split("\n");

  const sections: ClinicalSection[] = [];
  let current: ClinicalSection | null = null;
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const ensureSection = () => {
    if (!current) {
      current = { title: "", blocks: [], raw: "" };
      sections.push(current);
    }
    return current;
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const joined = paragraph.join("\n").trim();
    paragraph = [];
    if (!joined) return;
    const kv = joined.includes("\n") ? null : joined.match(KEY_VALUE_RE);
    if (kv) {
      ensureSection().blocks.push({ type: "keyValue", label: kv[1].trim(), value: kv[2].trim() });
    } else {
      ensureSection().blocks.push({ type: "paragraph", text: joined });
    }
  };

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets.slice();
    bullets = [];
    ensureSection().blocks.push({ type: "bullets", items });
  };

  const flushAll = () => {
    flushParagraph();
    flushBullets();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    if (isHeading(trimmed)) {
      flushAll();
      current = { title: trimmed.replace(/[:：]\s*$/, ""), blocks: [], raw: "" };
      sections.push(current);
      continue;
    }

    if (BULLET_RE.test(line)) {
      flushParagraph();
      bullets.push(trimmed.replace(BULLET_RE, "").trim());
      continue;
    }

    flushBullets();
    paragraph.push(trimmed);
  }

  flushAll();

  const withContent = sections.filter((s) => s.title || s.blocks.length);

  for (const section of withContent) {
    const parts: string[] = [];
    if (section.title) parts.push(section.title);
    for (const block of section.blocks) {
      if (block.type === "paragraph") parts.push(block.text);
      else if (block.type === "keyValue") parts.push(`${block.label}: ${block.value}`);
      else if (block.type === "bullets") parts.push(block.items.map((i) => `- ${i}`).join("\n"));
    }
    section.raw = parts.join("\n").trim();
  }

  return withContent;
}

/** Nomes de seções para o índice rápido (só títulos reais). */
export function clinicalSectionTitles(sections: ClinicalSection[]): string[] {
  return sections.map((s) => s.title).filter(Boolean);
}
