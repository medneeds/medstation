// Registro da TENTATIVA de compra avulsa no momento em que o checkout é criado.
// Isso é o que viabiliza a fila de recuperação (checkout abandonado / expirado).
// Nunca concede acesso: a linha nasce como pending/started.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { OneTimePlan } from "./one-time-purchase.ts";

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type AttemptInput = {
  checkoutSessionId: string;
  plan: OneTimePlan;
  paymentMethodTypes: string[];
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  metadata?: Record<string, string> | null;
};

/**
 * Idempotente por `checkout_session_id`. Falha aqui NUNCA derruba o checkout:
 * o webhook ainda consegue criar/atualizar a linha depois.
 */
export async function recordPurchaseAttempt(input: AttemptInput): Promise<boolean> {
  const supabase = serviceClient();
  if (!supabase) return false;
  const m = input.metadata ?? {};
  try {
    const { error } = await supabase.from("stripe_one_time_purchases").upsert({
      checkout_session_id: input.checkoutSessionId,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      stripe_customer_id: input.stripeCustomerId ?? null,
      plan: input.plan.slug,
      amount_cents: input.plan.amountCents,
      currency: input.plan.currency,
      status: "pending",
      checkout_status: "started",
      payment_category: input.plan.category,
      access_period: input.plan.accessPeriod,
      payment_method: input.paymentMethodTypes.length === 1
        ? (input.paymentMethodTypes[0] === "pix" ? "pix" : "card")
        : "unknown",
      recovery_status: "not_needed",
      acquisition_source: m.acquisition ?? null,
      campaign: m.campaign ?? null,
      utm_source: m.utm_source ?? null,
      utm_campaign: m.utm_campaign ?? null,
    }, { onConflict: "checkout_session_id", ignoreDuplicates: true });
    if (error) {
      console.error("[purchase-attempt] persist failed", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[purchase-attempt] unexpected failure", (error as Error)?.message);
    return false;
  }
}
