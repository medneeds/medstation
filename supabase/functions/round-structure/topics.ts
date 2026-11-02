// Round multiprofissional por setor: regras puras (sem dependências) para que
// o vitest consiga testar e comparar com o espelho do app (src/lib/wardRound.ts).

/** Limite total de gravação de um round: 90 minutos. */
export const ROUND_MAX_SECONDS = 90 * 60;
/** Cada parte da gravação tem ~10 minutos (bem abaixo do limite de 24 MiB da transcrição). */
export const ROUND_PART_SECONDS = 10 * 60;
/** Contagem regressiva aparece nos últimos 10 minutos. */
export const ROUND_COUNTDOWN_SECONDS = 10 * 60;
/** Teto de texto transcrito aceito para estruturar (90 min de fala com folga). */
export const ROUND_MAX_TRANSCRIPT_CHARS = 200_000;

export const ROUND_TOPICS = [
  { key: "intervencoes", title: "INTERVENÇÕES CLÍNICAS" },
  { key: "dispositivos", title: "REVISÃO DE DISPOSITIVOS" },
  { key: "culturas", title: "CHECAGEM DE CULTURAS" },
  { key: "antibioticos", title: "ANTIBIÓTICOS E CONTAGEM DE DIAS" },
  { key: "enfermagem_fisio", title: "ENFERMAGEM E FISIOTERAPIA" },
  { key: "alta_transferencia", title: "ALTA E TRANSFERÊNCIA" },
  { key: "familia_metas", title: "FAMÍLIA E METAS DE CUIDADO" },
  { key: "pendencias", title: "PENDÊNCIAS E PROGRAMAÇÕES" },
  { key: "outros", title: "OUTROS PONTOS DISCUTIDOS" },
] as const;

export type RoundTopicKey = typeof ROUND_TOPICS[number]["key"];
export type RoundTopics = Partial<Record<RoundTopicKey, string[]>>;

export const UNIDENTIFIED_REF = "NI";

export interface RoundPatientRef {
  ref: string;
  admissionId: string;
  bed: string;
  name: string;
  diagnosis?: string | null;
  dayOfStay?: number | null;
}

export interface StructuredRoundItem {
  admissionId: string | null;
  bedLabel: string | null;
  patientLabel: string | null;
  topics: RoundTopics;
}

const TOPIC_KEYS = new Set<string>(ROUND_TOPICS.map((t) => t.key));
const MAX_ITEMS_PER_TOPIC = 40;
const MAX_ITEM_CHARS = 600;

/** Remove marcações proibidas (#, **, *, _) e marcadores iniciais repetidos. */
export function cleanRoundLine(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\*\*|__/g, "")
    .replace(/^[\s#>*•\-–—]+/, "")
    .replace(/(^|\s)[*_](\S)/g, "$1$2")
    .replace(/(\S)[*_](\s|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ITEM_CHARS);
}

function cleanTopics(raw: unknown): RoundTopics {
  const out: RoundTopics = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!TOPIC_KEYS.has(key)) continue;
    const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    const lines = list.map(cleanRoundLine).filter((l) => l && !/^(não discutido|nao discutido|não informado|nao informado|n\/a|-)$/i.test(l));
    if (lines.length) out[key as RoundTopicKey] = lines.slice(0, MAX_ITEMS_PER_TOPIC);
  }
  return out;
}

function hasTopics(t: RoundTopics) {
  return Object.values(t).some((v) => v && v.length > 0);
}

function mergeTopics(a: RoundTopics, b: RoundTopics): RoundTopics {
  const out: RoundTopics = { ...a };
  for (const [k, v] of Object.entries(b) as [RoundTopicKey, string[]][]) {
    const seen = new Set(out[k] ?? []);
    out[k] = [...(out[k] ?? []), ...v.filter((x) => !seen.has(x))].slice(0, MAX_ITEMS_PER_TOPIC);
  }
  return out;
}

/** Tira o primeiro objeto JSON de uma resposta (tolera cercas ``` e texto em volta). */
export function extractJsonObject(text: string): unknown {
  if (typeof text !== "string") return null;
  const fenced = text.replace(/```(?:json)?/gi, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Valida a saída da IA: só aceita referências de pacientes da unidade enviada;
 * qualquer outra vai para "Não identificado". Tópicos fora da lista são
 * descartados, e pacientes sem nenhum tópico não aparecem.
 */
export function validateRoundStructure(raw: unknown, patients: RoundPatientRef[]): StructuredRoundItem[] {
  const byRef = new Map(patients.map((p) => [p.ref.toUpperCase(), p]));
  const list = raw && typeof raw === "object" && Array.isArray((raw as any).pacientes)
    ? (raw as any).pacientes as unknown[]
    : Array.isArray(raw) ? raw as unknown[] : [];

  const known = new Map<string, StructuredRoundItem>();
  const unknown: StructuredRoundItem[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const topics = cleanTopics(e.topicos ?? e.topics);
    if (!hasTopics(topics)) continue;
    const ref = typeof e.ref === "string" ? e.ref.trim().toUpperCase() : "";
    const patient = ref && ref !== UNIDENTIFIED_REF ? byRef.get(ref) : undefined;
    if (patient) {
      const prev = known.get(patient.admissionId);
      known.set(patient.admissionId, {
        admissionId: patient.admissionId,
        bedLabel: patient.bed,
        patientLabel: patient.name,
        topics: prev ? mergeTopics(prev.topics, topics) : topics,
      });
    } else {
      const hint = cleanRoundLine(e.identificacao ?? e.leito ?? e.nome ?? "").slice(0, 120);
      unknown.push({ admissionId: null, bedLabel: null, patientLabel: hint || "Não identificado", topics });
    }
  }

  // Ordem do mapa de leitos, depois os não identificados.
  const ordered = patients
    .map((p) => known.get(p.admissionId))
    .filter((x): x is StructuredRoundItem => !!x);
  return [...ordered, ...unknown];
}

/** Texto pronto para copiar: títulos em CAIXA ALTA e marcadores "-", sem markdown. */
export function formatRoundTopics(topics: RoundTopics): string {
  return ROUND_TOPICS
    .filter((t) => topics[t.key]?.length)
    .map((t) => `${t.title}\n${(topics[t.key] ?? []).map((l) => `- ${l}`).join("\n")}`)
    .join("\n\n");
}

export const ROUND_SYSTEM_PROMPT = `Você organiza a gravação de um round multiprofissional de enfermaria ou UTI da MedStation.

Você recebe a lista de pacientes da unidade (com uma referência P1, P2...) e a transcrição integral do round, em que médicos, enfermagem, fisioterapia, farmácia, nutrição e outros profissionais discutem os pacientes.

TAREFA
- Para cada paciente discutido, separe o que foi dito nos tópicos abaixo.
- Identifique o paciente pelo leito, pelo nome ou por dados claramente ditos. Se não houver como ter certeza, use ref "NI" e escreva em "identificacao" o que foi dito para identificar (ex.: "leito 12?", "senhora da cama da janela").

TÓPICOS (chaves do JSON)
- intervencoes: intervenções e condutas clínicas decididas ou realizadas (drogas, ajustes de dose, procedimentos, exames pedidos)
- dispositivos: revisão de dispositivos (cateteres, sondas, tubos, drenos, acesso venoso), com dia de uso quando dito, e decisão de manter, trocar ou retirar
- culturas: culturas coletadas, pendentes e resultados citados
- antibioticos: antimicrobiano, dia (D) e data ou previsão de término quando ditos
- enfermagem_fisio: ventilação e desmame, mobilização, dieta, lesões e prevenção de lesão por pressão, cuidados de enfermagem
- alta_transferencia: previsão de alta, transferência, step-down
- familia_metas: boletim e conversas com a família, metas de cuidado, cuidados paliativos
- pendencias: pendências e programações (o que ficou para fazer, a quem e quando, se dito)
- outros: outros pontos relevantes do paciente que não cabem acima

REGRAS DE FIDELIDADE
- Escreva SOMENTE o que foi dito no round. Nunca invente exames, doses, dias, resultados, diagnósticos ou decisões.
- O que foi levantado como hipótese ou sugestão fica como sugestão ("sugerido", "a discutir"), nunca como decisão tomada.
- Pedido não é realizado: "solicitar hemocultura" não vira "hemocultura coletada".
- Tópico não discutido: simplesmente não inclua a chave. Não escreva "não discutido".
- Cada item é uma frase curta e objetiva, em português, sem markdown (nada de #, **, *, _).
- Ignore conversas que não sejam sobre pacientes.

FORMATO DA RESPOSTA
Responda apenas com JSON válido, sem texto em volta:
{"pacientes":[{"ref":"P1","identificacao":"","topicos":{"intervencoes":["..."],"pendencias":["..."]}}]}`;

export function buildRoundUserPrompt(input: {
  unitName: string;
  roundDate: string;
  patients: RoundPatientRef[];
  transcript: string;
}): string {
  const list = input.patients.length
    ? input.patients
      .map((p) => [
        `${p.ref} · Leito ${p.bed} · ${p.name}`,
        p.diagnosis ? `diagnóstico: ${p.diagnosis}` : "",
        p.dayOfStay ? `D${p.dayOfStay} de internação` : "",
      ].filter(Boolean).join(" · "))
      .join("\n")
    : "Nenhum paciente cadastrado nesta unidade.";
  return `UNIDADE: ${input.unitName || "Não informada"}
DATA DO ROUND: ${input.roundDate}

PACIENTES DA UNIDADE
${list}

TRANSCRIÇÃO INTEGRAL DO ROUND
${input.transcript}

Organize o round por paciente no JSON pedido.`;
}
