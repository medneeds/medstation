// Pool de conteúdo rotativo para os pop-ups do demo público.
// 3 categorias: assistentes, produtividade, oferta.

export type PromoCategory = "assistant" | "productivity" | "offer";

export interface PromoItem {
  id: string;
  category: PromoCategory;
  title: string;
  description: string;
  cta?: string;
}

export const ASSISTANT_PROMOS: PromoItem[] = [
  {
    id: "a-clinicus",
    category: "assistant",
    title: "Clínicus — Anamnese estruturada em 30s",
    description: "Transforma queixa livre em AHE pronta para o prontuário.",
    cta: "Ver todos os assistentes",
  },
  {
    id: "a-prescriptus",
    category: "assistant",
    title: "Prescriptus — Prescrição com Bula Inteligente",
    description: "Interações, doses e ajustes renais em segundos.",
    cta: "Conhecer Prescriptus",
  },
  {
    id: "a-gasometrus",
    category: "assistant",
    title: "Gasometrus — Análise de gasometria à beira-leito",
    description: "Distúrbio ácido-base com impressão clínica completa.",
    cta: "Conhecer Gasometrus",
  },
  {
    id: "a-atestus",
    category: "assistant",
    title: "Atestus — Atestados prontos com CID",
    description: "Sem digitar repetições, sem retrabalho.",
    cta: "Conhecer Atestus",
  },
  {
    id: "a-orientus",
    category: "assistant",
    title: "Orientus — Orientações de alta para o paciente",
    description: "Linguagem leiga, claras, com sinais de alerta.",
    cta: "Conhecer Orientus",
  },
  {
    id: "a-protocolus",
    category: "assistant",
    title: "Protocolus — Protocolos globais (AHA, ESC, WHO)",
    description: "Conduta baseada em diretrizes em segundos.",
    cta: "Conhecer Protocolus",
  },
  {
    id: "a-scorius",
    category: "assistant",
    title: "Scorius — Scores clínicos calculados",
    description: "qSOFA, CHA₂DS₂-VASc, GRACE e dezenas de outros.",
    cta: "Conhecer Scorius",
  },
  {
    id: "a-numerus",
    category: "assistant",
    title: "Numerus — Cálculos médicos rápidos",
    description: "Doses, depuração, balanço hídrico, conversões.",
    cta: "Conhecer Numerus",
  },
  {
    id: "a-codexus",
    category: "assistant",
    title: "Codexus — CID-10 inteligente",
    description: "Encontre o código certo a partir do diagnóstico.",
    cta: "Conhecer Codexus",
  },
];

export const PRODUCTIVITY_PROMOS: PromoItem[] = [
  {
    id: "p-time",
    category: "productivity",
    title: "Médicos economizam ~2h por dia",
    description: "Menos digitação, mais tempo com o paciente.",
    cta: "Quero economizar tempo",
  },
  {
    id: "p-anamnese",
    category: "productivity",
    title: "Anamnese pronta em 30 segundos",
    description: "Clínicus monta a AHE enquanto você examina o paciente.",
    cta: "Quero testar Clínicus",
  },
  {
    id: "p-no-repeat",
    category: "productivity",
    title: "Pare de redigitar a mesma coisa",
    description: "10 assistentes que padronizam tudo o que você escreve no plantão.",
    cta: "Conhecer assinatura",
  },
  {
    id: "p-bula",
    category: "productivity",
    title: "Bula inteligente integrada",
    description: "Posologia, ajuste renal e interações sem sair do fluxo.",
    cta: "Ver Prescriptus",
  },
];

export const OFFER_PROMOS: PromoItem[] = [
  {
    id: "o-price",
    category: "offer",
    title: "Pro a partir de R$ 29,90/mês",
    description: "Acesso a todos os 10 assistentes médicos. Cancele quando quiser.",
    cta: "Assinar agora",
  },
  {
    id: "o-guarantee",
    category: "offer",
    title: "7 dias de garantia incondicional",
    description: "Não gostou? Devolvemos 100% do valor, sem perguntas.",
    cta: "Quero testar com garantia",
  },
  {
    id: "o-no-card",
    category: "offer",
    title: "Crie sua conta sem cartão",
    description: "Examinus grátis para experimentar (com limite de uso, espera entre mensagens e pop-ups). Pro libera os 10 assistentes sem restrições.",
    cta: "Criar conta grátis",
  },
  {
    id: "o-no-ads",
    category: "offer",
    title: "Interface fluida, sem anúncios",
    description: "Foco total no que importa: cuidar do paciente.",
    cta: "Ver planos",
  },
];

export const ALL_PROMOS = [
  ...ASSISTANT_PROMOS,
  ...PRODUCTIVITY_PROMOS,
  ...OFFER_PROMOS,
];

export function pickRandom<T>(arr: T[], excludeIds: string[] = []): T | null {
  const pool = arr.filter((it: any) => !excludeIds.includes(it.id));
  if (pool.length === 0) return arr[Math.floor(Math.random() * arr.length)] ?? null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const ASSISTANTS_GRID = [
  { name: "Examinus", desc: "Exames laboratoriais e imagem", free: true },
  { name: "Clínicus", desc: "Anamnese estruturada", free: false },
  { name: "Prescriptus", desc: "Prescrição com bula", free: false },
  { name: "Gasometrus", desc: "Análise de gasometria", free: false },
  { name: "Atestus", desc: "Atestados com CID", free: false },
  { name: "Orientus", desc: "Orientações de alta", free: false },
  { name: "Protocolus", desc: "Protocolos globais", free: false },
  { name: "Scorius", desc: "Scores clínicos", free: false },
  { name: "Numerus", desc: "Cálculos médicos", free: false },
  { name: "Codexus", desc: "CID-10 inteligente", free: false },
];
