/**
 * Bônus Arsenal Med do plano anual.
 *
 * O site do Arsenal Med só cria acesso para quem tem uma compra registrada lá.
 * A MedStation avisa o Arsenal Med (push) com a referência do pagamento anual,
 * e o Arsenal Med confirma essa referência chamando a função pública
 * arsenal-bonus-verify antes de registrar o bônus. Assim nenhum segredo precisa
 * ser compartilhado entre os dois sites: só quem conhece uma referência real de
 * pagamento anual (id da sessão de checkout ou da assinatura) consegue liberar.
 */

import { planExcludesArsenalBonus } from "./one-time-purchase.ts";
import {
  ARSENAL_BONUS_LIVE_ENDPOINT,
  type EnvGetter,
  resolveArsenalBonusTarget,
  runtimeEnv,
} from "./deploy-environment.ts";

/** Endereço real do Arsenal Med; só é chamado no projeto de produção. */
export const ARSENAL_BONUS_ENDPOINT = ARSENAL_BONUS_LIVE_ENDPOINT;

/**
 * Endereço que o site do Arsenal Med chama para confirmar a referência.
 * POST { reference } -> { eligible: true, email, access_until } | { eligible: false }
 */
export const ARSENAL_VERIFY_URL =
  "https://rwiovxyftfbkvzbepfqi.supabase.co/functions/v1/arsenal-bonus-verify";

const REFERENCE_RE = /^(cs_(live|test)_[A-Za-z0-9]{10,200}|sub_[A-Za-z0-9]{10,100})$/;

export function isBonusReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_RE.test(value);
}

export type BonusPurchaseRow = {
  email: string | null;
  /** Slug do plano comprado; compras da Black não dão direito ao bônus. */
  plan?: string | null;
  status: string;
  access_period: string | null;
  access_end: string | null;
};

export type BonusSubscriptionRow = {
  status: string;
  billing_interval: string | null;
  current_period_end: string | null;
};

export type BonusEligibility =
  | { eligible: true; email: string; access_until: string }
  | { eligible: false };

const NOT_ELIGIBLE: BonusEligibility = { eligible: false };

function futureIso(value: string | null, now: number): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) && t > now ? new Date(t).toISOString() : null;
}

function cleanEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

/** Compra anual à vista: paga, período anual e ainda vigente. */
export function purchaseEligibility(row: BonusPurchaseRow | null, now = Date.now()): BonusEligibility {
  if (!row || row.status !== "paid" || row.access_period !== "annual_12m") return NOT_ELIGIBLE;
  if (planExcludesArsenalBonus(row.plan)) return NOT_ELIGIBLE;
  const email = cleanEmail(row.email);
  const until = futureIso(row.access_end, now);
  return email && until ? { eligible: true, email, access_until: until } : NOT_ELIGIBLE;
}

/** Assinatura anual recorrente: ativa (ou em teste), intervalo anual e vigente. */
export function subscriptionEligibility(
  row: BonusSubscriptionRow | null,
  accountEmail: string | null,
  now = Date.now(),
): BonusEligibility {
  if (!row || row.billing_interval !== "year") return NOT_ELIGIBLE;
  if (row.status !== "active" && row.status !== "trialing") return NOT_ELIGIBLE;
  const email = cleanEmail(accountEmail);
  const until = futureIso(row.current_period_end, now);
  return email && until ? { eligible: true, email, access_until: until } : NOT_ELIGIBLE;
}

export type ArsenalBonusOutcome = "registered" | "not_registered" | "blocked_outside_production";

/**
 * Avisa o Arsenal Med e diz o que aconteceu. Nunca lança erro.
 * Fora do projeto de produção devolve "blocked_outside_production" SEM fazer
 * requisição nenhuma (ver deploy-environment.ts): um pagamento de teste não
 * pode registrar bônus no site real.
 */
export async function notifyArsenalBonusOutcome(
  reference: string,
  fetchImpl: typeof fetch = fetch,
  getEnv: EnvGetter = runtimeEnv,
): Promise<ArsenalBonusOutcome> {
  const target = resolveArsenalBonusTarget(getEnv);
  if (!target.enabled) return "blocked_outside_production";
  if (!isBonusReference(reference)) return "not_registered";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetchImpl(target.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
      signal: controller.signal,
    });
    return res.ok ? "registered" : "not_registered";
  } catch {
    return "not_registered";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Avisa o Arsenal Med. Nunca lança erro: devolve false quando o aviso não foi
 * aceito, para quem chamou registrar a pendência sem derrubar o pagamento.
 */
export async function notifyArsenalBonus(
  reference: string,
  fetchImpl: typeof fetch = fetch,
  getEnv: EnvGetter = runtimeEnv,
): Promise<boolean> {
  return (await notifyArsenalBonusOutcome(reference, fetchImpl, getEnv)) === "registered";
}
