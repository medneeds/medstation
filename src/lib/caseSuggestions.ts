/**
 * Parser das "Sugestões para o caso" do Clínicus.
 *
 * A Edge Function devolve blocos com títulos em CAIXA ALTA e itens iniciados
 * por hífen. Aqui transformamos esse texto em blocos estruturados para o painel
 * lateral, sem alterar o conteúdo clínico.
 */

export interface CaseSuggestionBlock {
  /** Título do bloco, como veio do assistente (caixa alta). */
  title: string;
  /** Itens acionáveis do bloco (sem o hífen inicial). */
  items: string[];
  /** Texto solto do bloco que não está em formato de item. */
  notes: string[];
}

export interface ParsedCaseSuggestions {
  blocks: CaseSuggestionBlock[];
  /** Linha de encerramento / disclaimer, quando presente. */
  footer: string | null;
}

const KNOWN_TITLES = [
  "LACUNAS DA HISTÓRIA",
  "DADOS OBJETIVOS AUSENTES",
  "HIPÓTESES DIAGNÓSTICAS",
  "RED FLAGS A AFASTAR",
  "SUGESTÕES DE CONDUTA E INVESTIGAÇÃO",
  "COMO MELHORAR O REGISTRO",
];

/** Um título é uma linha curta, em caixa alta, sem terminar em pontuação de frase. */
function isHeading(line: string): boolean {
  const clean = line.trim();
  if (!clean) return false;
  if (KNOWN_TITLES.includes(clean)) return true;
  if (clean.length > 60) return false;
  if (/^[-•*\d]/.test(clean)) return false;
  if (/[.:;,?]$/.test(clean)) return false;
  const letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase();
}

function isFooter(line: string): boolean {
  return /DECIS(Ã|A)O FINAL/i.test(line);
}

export function parseCaseSuggestions(raw: string): ParsedCaseSuggestions {
  const blocks: CaseSuggestionBlock[] = [];
  let footer: string | null = null;
  let current: CaseSuggestionBlock | null = null;

  const lines = (raw || "").replace(/\*\*/g, "").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isFooter(line)) {
      footer = line;
      continue;
    }

    if (isHeading(line)) {
      current = { title: line, items: [], notes: [] };
      blocks.push(current);
      continue;
    }

    if (!current) {
      current = { title: "SUGESTÕES", items: [], notes: [] };
      blocks.push(current);
    }

    const itemMatch = line.match(/^[-•*]\s*(.+)$/) || line.match(/^\d+[.)]\s*(.+)$/);
    if (itemMatch) {
      current.items.push(itemMatch[1].trim());
    } else {
      current.notes.push(line);
    }
  }

  return { blocks, footer };
}

/** Texto completo de um bloco, pronto para a área de transferência. */
export function blockToText(block: CaseSuggestionBlock): string {
  const body = [...block.notes, ...block.items.map((i) => `- ${i}`)].join("\n");
  return `${block.title}\n\n${body}`.trim();
}

/** Pergunta pronta a ser enviada ao Clínicus a partir de um item sugerido. */
export function itemToFollowUpQuestion(item: string, blockTitle: string): string {
  return `Sobre a sugestão "${item}" (${blockTitle}): aprofunde este ponto no contexto do caso já enviado, sem inventar dados.`;
}
