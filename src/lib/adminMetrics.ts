/**
 * Helpers canônicos das métricas do painel admin.
 *
 * Este arquivo é a fonte da verdade da lógica de agregação e é espelhado
 * dentro da Edge Function `admin-posthog` (view=product), que executa os
 * mesmos cálculos no servidor com service role. Qualquer mudança aqui deve
 * ser replicada lá.
 *
 * Regras gerais:
 * - Nenhuma função inventa dado: denominador zero devolve `null`, nunca 0%.
 * - Nenhuma função recebe ou devolve PII.
 */

/** Ferramentas genéricas que não devem aparecer como "ferramenta" no ranking. */
const GENERIC_SLUGS = new Set(["clinical_assistant", "agent", "assistant", "", "null", "undefined"]);

/** Nome de função de edge -> ferramenta real, para linhas sem `assistant`. */
const FUNCTION_TO_TOOL: Record<string, string> = {
  "examinus-chat": "examinus",
  "public-examinus": "examinus",
  "agent-chat": "clinicus",
  "consultation-transcribe": "consultorio",
  "transcribe-audio": "consultorio",
  "transcribe-case": "consultorio",
  "transcribe-prescription": "prescriptus",
  "structure-anamnesis": "clinicus",
  "generate-medical-document": "medical_document",
  "extract-file-text": "ocr",
  "public-extract-text": "ocr",
  "radiograph-interpret": "examinus",
  "ecg-interpret": "clinicus",
  "process-document": "ocr",
  "extract-case-from-document": "ocr",
  "carpe-diem-round": "modo_rotineiro",
  "support-chat": "suporte",
  "public-assistants-chat": "guia-publico",
};

/**
 * Normaliza o slug da ferramenta. Prefere sempre o assistente real; só cai no
 * nome da função quando o assistente está ausente ou é genérico.
 */
export function normalizeToolSlug(
  assistant: string | null | undefined,
  functionName?: string | null,
): string {
  const a = (assistant ?? "").trim().toLowerCase();
  if (a && !GENERIC_SLUGS.has(a)) return a;
  const fn = (functionName ?? "").trim().toLowerCase();
  if (fn && FUNCTION_TO_TOOL[fn]) return FUNCTION_TO_TOOL[fn];
  if (fn) return fn;
  return "não identificado";
}

/** Percentil por interpolação linear. Devolve null para lista vazia. */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface TimeToValueSummary {
  users: number;
  medianMinutes: number | null;
  p75Minutes: number | null;
  p90Minutes: number | null;
  under10Minutes: number;
  under10Percent: number | null;
}

const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

/** Resume o tempo (em minutos) até o primeiro valor entregue. */
export function summarizeTimeToValue(minutes: number[]): TimeToValueSummary {
  const valid = minutes.filter((m) => Number.isFinite(m) && m >= 0);
  const under10 = valid.filter((m) => m <= 10).length;
  return {
    users: valid.length,
    medianMinutes: round1(percentile(valid, 0.5)),
    p75Minutes: round1(percentile(valid, 0.75)),
    p90Minutes: round1(percentile(valid, 0.9)),
    under10Minutes: under10,
    under10Percent: valid.length ? Math.round((under10 / valid.length) * 1000) / 10 : null,
  };
}

/**
 * Taxa segura: devolve null (e não 0) quando o denominador é zero, para que a
 * interface possa mostrar "sem dados" em vez de um zero falso.
 */
export function safeRate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Conversão de checkout. Denominador explícito: checkouts iniciados no mesmo
 * período. Devolve null quando ninguém iniciou checkout.
 */
export function checkoutConversion(paid: number, started: number): number | null {
  return safeRate(paid, started);
}

export interface RetentionSummary {
  usersWithActivity: number;
  twoPlusDays: number;
  threePlusDays: number;
  sevenPlusDays: number;
}

/** Conta usuários por número de dias distintos com atividade na janela. */
export function summarizeRetention(activeDaysByUser: Map<string, Set<string>>): RetentionSummary {
  let two = 0, three = 0, seven = 0;
  for (const days of activeDaysByUser.values()) {
    const n = days.size;
    if (n >= 2) two++;
    if (n >= 3) three++;
    if (n >= 7) seven++;
  }
  return {
    usersWithActivity: activeDaysByUser.size,
    twoPlusDays: two,
    threePlusDays: three,
    sevenPlusDays: seven,
  };
}

/**
 * Normaliza um preço recorrente do Stripe para centavos por mês.
 * Anual é dividido por 12; semanal e diário são convertidos proporcionalmente.
 */
export function normalizeMonthlyCents(
  unitAmountCents: number | null | undefined,
  interval: string | null | undefined,
  intervalCount = 1,
  quantity = 1,
): number {
  const unit = Number(unitAmountCents ?? 0);
  if (!unit || unit < 0) return 0;
  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  const amount = unit * (quantity && quantity > 0 ? quantity : 1);
  switch ((interval ?? "month").toLowerCase()) {
    case "year":
      return Math.round(amount / (12 * count));
    case "week":
      return Math.round((amount * 52) / (12 * count));
    case "day":
      return Math.round((amount * 365) / (12 * count));
    default:
      return Math.round(amount / count);
  }
}

/**
 * Distingue resposta vazia de fonte indisponível.
 * `rows === null` significa erro/fonte fora do ar; `[]` significa zero real.
 */
export function sourceState(rows: unknown[] | null | undefined): "unavailable" | "empty" | "ok" {
  if (rows === null || rows === undefined) return "unavailable";
  return rows.length === 0 ? "empty" : "ok";
}
