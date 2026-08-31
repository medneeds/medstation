// Catálogo único de compras avulsas (one-time) da MedStation.
// Mensal no cartão continua sendo ASSINATURA RECORRENTE e não passa por aqui.
// Aqui vivem: Pix mensal (30 dias, sem renovação) e Anual à vista (12 meses).

export type PaymentCategory =
  | "recurring_card_monthly"
  | "pix_monthly_one_time"
  | "annual_one_time";

export type AccessPeriod = "monthly_30d" | "annual_12m";
export type PaymentMethod = "card" | "pix" | "unknown";
export type CheckoutStatus = "started" | "completed" | "expired";
export type PurchaseStatus = "pending" | "paid" | "failed" | "expired";
export type RecoveryStatus = "not_needed" | "eligible" | "contacted" | "recovered" | "dismissed";

export const ANNUAL_PLAN_SLUG = "pro_completo_yearly";
export const MONTHLY_PIX_PLAN_SLUG = "pix_monthly_30d";

export const ANNUAL_PURPOSE = "annual_one_time_access";
export const MONTHLY_PIX_PURPOSE = "monthly_pix_one_time_access";

export const ANNUAL_PRODUCT_ID = "prod_V4jGKeBPH2hGYg";
export const ONE_TIME_CURRENCY = "brl";

export type OneTimePlan = {
  slug: string;
  purpose: string;
  amountCents: number;
  currency: string;
  productId: string;
  category: Exclude<PaymentCategory, "recurring_card_monthly">;
  accessPeriod: AccessPeriod;
  accessDays: number;
  /** Pix mensal é experimento Pix-first: não cai para cartão silenciosamente. */
  allowCardFallback: boolean;
  paymentMethodTypes: string[];
  /** Env var opcional com um Price one-time dedicado. */
  priceEnvVar: string;
  label: string;
};

export const ONE_TIME_PLANS: Record<string, OneTimePlan> = {
  [ANNUAL_PLAN_SLUG]: {
    slug: ANNUAL_PLAN_SLUG,
    purpose: ANNUAL_PURPOSE,
    amountCents: 49990,
    currency: ONE_TIME_CURRENCY,
    productId: ANNUAL_PRODUCT_ID,
    category: "annual_one_time",
    accessPeriod: "annual_12m",
    accessDays: 365,
    allowCardFallback: true,
    paymentMethodTypes: ["card", "pix"],
    priceEnvVar: "STRIPE_ANNUAL_ONETIME_PRICE_ID",
    label: "MedStation Completo — 12 meses à vista",
  },
  [MONTHLY_PIX_PLAN_SLUG]: {
    slug: MONTHLY_PIX_PLAN_SLUG,
    purpose: MONTHLY_PIX_PURPOSE,
    amountCents: 5990,
    currency: ONE_TIME_CURRENCY,
    productId: ANNUAL_PRODUCT_ID,
    category: "pix_monthly_one_time",
    accessPeriod: "monthly_30d",
    accessDays: 30,
    allowCardFallback: false,
    paymentMethodTypes: ["pix"],
    // Decisão: Pix mensal usa SEMPRE price_data (5990 BRL). Um Price dedicado
    // legado de 4990 causaria divergência silenciosa de valor, então nenhum
    // price por env é aceito para este plano.
    priceEnvVar: "",
    label: "MedStation Completo — 30 dias via Pix",
  },
};

export function getOneTimePlan(plan: string | undefined | null): OneTimePlan | null {
  if (!plan) return null;
  return ONE_TIME_PLANS[plan] ?? null;
}

export function isOneTimePlan(plan: string | undefined | null): boolean {
  return getOneTimePlan(plan) !== null;
}

export function isAnnualPlan(plan: string | undefined | null): boolean {
  return plan === ANNUAL_PLAN_SLUG;
}

export function isMonthlyPixPlan(plan: string | undefined | null): boolean {
  return plan === MONTHLY_PIX_PLAN_SLUG;
}

export type OneTimeLineItem =
  | { price: string; quantity: number }
  | {
      quantity: number;
      price_data: {
        currency: string;
        unit_amount: number;
        product: string;
      };
    };

/**
 * Usa um Price one-time configurado por env quando existir (preferido, mantém
 * relatórios do Stripe limpos). Sem env, cai para price_data one-time sobre o
 * produto existente — nunca cria produtos novos.
 */
export function buildOneTimeLineItem(
  planOrConfig: OneTimePlan,
  oneTimePriceId?: string | null,
): OneTimeLineItem {
  if (oneTimePriceId && oneTimePriceId.startsWith("price_")) {
    return { price: oneTimePriceId, quantity: 1 };
  }
  return {
    quantity: 1,
    price_data: {
      currency: planOrConfig.currency,
      unit_amount: planOrConfig.amountCents,
      product: planOrConfig.productId,
    },
  };
}

export function oneTimePaymentMethodTypes(plan: OneTimePlan, pixEnabled: boolean): string[] {
  if (pixEnabled) return [...plan.paymentMethodTypes];
  if (!plan.allowCardFallback) return [];
  return plan.paymentMethodTypes.filter((m) => m !== "pix");
}

export function isPixUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("pix") && (
    lower.includes("invalid") ||
    lower.includes("not activated") ||
    lower.includes("not available") ||
    lower.includes("not enabled") ||
    lower.includes("does not support")
  );
}

export type MinimalCheckoutSession = {
  id: string;
  mode?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
};

const ONE_TIME_PURPOSES = new Set(
  Object.values(ONE_TIME_PLANS).map((p) => p.purpose),
);

export function purposeOf(session: MinimalCheckoutSession): string | null {
  return session.metadata?.purpose ?? null;
}

export function planFromSession(session: MinimalCheckoutSession): OneTimePlan | null {
  const purpose = purposeOf(session);
  if (!purpose) return null;
  return Object.values(ONE_TIME_PLANS).find((p) => p.purpose === purpose) ?? null;
}

/**
 * Só concede acesso quando o pagamento foi de fato confirmado.
 * `checkout.session.completed` com Pix chega como `unpaid`/`processing`.
 */
export function shouldGrantOneTimeAccess(
  eventType: string,
  session: MinimalCheckoutSession,
): boolean {
  if (session.mode !== "payment") return false;
  const purpose = purposeOf(session);
  if (!purpose || !ONE_TIME_PURPOSES.has(purpose)) return false;
  if (eventType === "checkout.session.async_payment_succeeded") return true;
  if (eventType === "checkout.session.completed") return session.payment_status === "paid";
  return false;
}

export type AccessWindow = { accessStart: string; accessEnd: string };

/**
 * Nova compra legítima começa em max(agora, fim do acesso atual) e soma o
 * período do plano. A idempotência (mesmo pagamento reentregue) é garantida
 * pela unicidade da checkout session no banco — esta função só é chamada para
 * compras novas.
 */
export function computeAccessWindow(
  paidAt: Date,
  currentAccessEnd: string | Date | null | undefined,
  period: AccessPeriod,
): AccessWindow {
  const current = currentAccessEnd ? new Date(currentAccessEnd) : null;
  const startMs = current && current.getTime() > paidAt.getTime()
    ? current.getTime()
    : paidAt.getTime();
  const start = new Date(startMs);
  const end = new Date(start);
  if (period === "annual_12m") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCDate(end.getUTCDate() + 30);
  }
  return { accessStart: start.toISOString(), accessEnd: end.toISOString() };
}

/** Método de pagamento real observado na sessão/payment intent. */
export function normalizePaymentMethod(value: unknown): PaymentMethod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "unknown";
  const lower = raw.toLowerCase();
  if (lower === "pix") return "pix";
  if (lower === "card") return "card";
  return "unknown";
}

/** Falha/expiração vira oportunidade de recuperação comercial. */
export function recoveryStatusForOutcome(status: PurchaseStatus): RecoveryStatus {
  return status === "failed" || status === "expired" ? "eligible" : "not_needed";
}

export function utmFromMetadata(metadata: Record<string, string> | null | undefined) {
  const m = metadata ?? {};
  return {
    acquisition_source: m.acquisition ?? null,
    campaign: m.campaign ?? null,
    utm_source: m.utm_source ?? null,
    utm_campaign: m.utm_campaign ?? null,
  };
}
