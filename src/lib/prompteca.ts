// Prompteca: biblioteca de prompts e assistentes publicados por médicos.
// Regras puras (categorias, validação e bloqueio de dados pessoais) para ficarem testáveis.

export type PromptecaKind = "assistant" | "prompt";

export const PROMPTECA_CATEGORIES = [
  { id: "documentacao", label: "Documentação" },
  { id: "discussao", label: "Discussão clínica" },
  { id: "prescricao", label: "Prescrição" },
  { id: "exames", label: "Exames" },
  { id: "pareceres", label: "Pareceres e laudos" },
  { id: "ensino", label: "Ensino" },
  { id: "rotina", label: "Gestão e rotina" },
  { id: "outros", label: "Outros" },
] as const;
export type PromptecaCategory = (typeof PROMPTECA_CATEGORIES)[number]["id"];

export const categoryLabel = (id: string) => PROMPTECA_CATEGORIES.find((c) => c.id === id)?.label ?? "Outros";

export const PROMPTECA_LIMITS = { titleMin: 3, title: 80, description: 300, contentMin: 20, content: 8000 } as const;

/** Chave para abrir uma conversa do Studio já com um prompt no campo de texto. */
export const STUDIO_PREFILL_KEY = "ms_studio_prefill";

const PATTERNS: { label: string; re: RegExp }[] = [
  { label: "CPF", re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/ },
  { label: "Cartão SUS", re: /\b[1-2789]\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/ },
  { label: "telefone", re: /\(\d{2}\)\s?9?\d{4}-?\d{4}|\b9\d{4}-\d{4}\b|\+55\s?\d{2}\s?9?\d{4}-?\d{4}/ },
  { label: "e-mail", re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
];

/** Dados pessoais que não podem ir para um prompt público. */
export function findPersonalData(text: string): string[] {
  return PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

export interface PromptecaDraft {
  kind: PromptecaKind;
  title: string;
  description: string;
  content: string;
  category: string;
}

/** Lista o que falta ou impede a publicação. Vazia = pode publicar. */
export function validatePromptecaDraft(d: PromptecaDraft): string[] {
  const errors: string[] = [];
  const title = d.title.trim();
  const content = d.content.trim();
  if (title.length < PROMPTECA_LIMITS.titleMin) errors.push("Dê um título com pelo menos 3 letras.");
  if (title.length > PROMPTECA_LIMITS.title) errors.push("O título pode ter até 80 caracteres.");
  if (d.description.length > PROMPTECA_LIMITS.description) errors.push("A descrição pode ter até 300 caracteres.");
  if (content.length < PROMPTECA_LIMITS.contentMin) errors.push("Escreva o prompt com pelo menos 20 caracteres.");
  if (content.length > PROMPTECA_LIMITS.content) errors.push("O prompt pode ter até 8.000 caracteres.");
  if (!PROMPTECA_CATEGORIES.some((c) => c.id === d.category)) errors.push("Escolha uma categoria.");
  const found = findPersonalData(`${d.title}\n${d.description}\n${d.content}`);
  if (found.length) errors.push(`Tire os dados pessoais antes de publicar (${found.join(", ")}).`);
  return errors;
}

/** "4,7" para a média; vazio quando ninguém avaliou. */
export function formatRating(avg: number, count: number): string {
  if (!count) return "";
  return avg.toFixed(1).replace(".", ",");
}

export function matchesSearch(item: { title: string; description: string; content: string; author_name: string }, q: string): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = norm(`${item.title} ${item.description} ${item.author_name} ${item.content}`);
  return terms.every((t) => hay.includes(t));
}
