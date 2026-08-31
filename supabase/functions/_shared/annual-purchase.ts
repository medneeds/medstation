// Plano anual MedStation: pagamento único (one-time) em BRL, cartão ou Pix.
// O mensal continua sendo assinatura recorrente e NÃO passa por aqui.

export const ANNUAL_PLAN_SLUG = "pro_completo_yearly";
export const ANNUAL_AMOUNT_CENTS = 49990;
export const ANNUAL_CURRENCY = "brl";
export const ANNUAL_ACCESS_DAYS = 365;
export const ANNUAL_PRODUCT_ID = "prod_V4jGKeBPH2hGYg";
export const ANNUAL_PURPOSE = "annual_one_time_access";

export function isAnnualPlan(plan: string | undefined | null): boolean {
  return plan === ANNUAL_PLAN_SLUG;
}

export type AnnualLineItem =
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
export function buildAnnualLineItem(oneTimePriceId?: string | null): AnnualLineItem {
  if (oneTimePriceId && oneTimePriceId.startsWith("price_")) {
    return { price: oneTimePriceId, quantity: 1 };
  }
  return {
    quantity: 1,
    price_data: {
      currency: ANNUAL_CURRENCY,
      unit_amount: ANNUAL_AMOUNT_CENTS,
      product: ANNUAL_PRODUCT_ID,
    },
  };
}

export function annualPaymentMethodTypes(pixEnabled: boolean): string[] {
  return pixEnabled ? ["card", "pix"] : ["card"];
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

/**
 * Só concede acesso quando o pagamento foi de fato confirmado.
 * `checkout.session.completed` com Pix chega como `unpaid`/`processing`.
 */
export function shouldGrantAnnualAccess(
  eventType: string,
  session: MinimalCheckoutSession,
): boolean {
  if (session.mode !== "payment") return false;
  if (session.metadata?.purpose !== ANNUAL_PURPOSE) return false;
  if (eventType === "checkout.session.async_payment_succeeded") return true;
  if (eventType === "checkout.session.completed") return session.payment_status === "paid";
  return false;
}

export type AccessWindow = { accessStart: string; accessEnd: string };

/**
 * Nova compra legítima começa em max(agora, fim do acesso atual) e soma 12 meses.
 * A idempotência (mesmo pagamento reentregue) é garantida pela unicidade da
 * checkout session no banco — esta função só é chamada para compras novas.
 */
export function computeAnnualAccessWindow(
  paidAt: Date,
  currentAccessEnd?: string | Date | null,
): AccessWindow {
  const current = currentAccessEnd ? new Date(currentAccessEnd) : null;
  const startMs = current && current.getTime() > paidAt.getTime()
    ? current.getTime()
    : paidAt.getTime();
  const start = new Date(startMs);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { accessStart: start.toISOString(), accessEnd: end.toISOString() };
}
