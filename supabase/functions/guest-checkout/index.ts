import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  buildOneTimeLineItem,
  BLACK_ANNUAL_PLAN_SLUG,
  getOneTimePlan,
  isAnnualPlan,
  isAsyncMethodUnavailableError,
  isOfferedOneTimePlan,
  MONTHLY_PIX_PLAN_SLUG,
  oneTimePaymentMethodOptions,
  oneTimePaymentMethodTypes,
  oneTimePriceIdFromEnv,
  resolveOneTimePlan,
} from "../_shared/one-time-purchase.ts";
import { monthlySubscriptionLineItem, pricingCohort } from "../_shared/pricing-schedule.ts";
import { recordPurchaseAttempt } from "../_shared/purchase-attempts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GUEST-CHECKOUT] ${step}${detailsStr}`);
};

const CURRENT_PRICES: Record<string, string> = {
  pro_completo: "price_1U4Zo7ACiwQRloW4cJIn0jYn",
  pro_completo_yearly: "price_1U4ZoTACiwQRloW4f30FmEPb",
  [MONTHLY_PIX_PLAN_SLUG]: "one_time",
  [BLACK_ANNUAL_PLAN_SLUG]: "one_time",
};


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const billingPeriod = body.billingPeriod || "monthly";
    let couponCode: string | undefined = body.couponCode?.trim();
    const requestedPlan: string | undefined = body.plan;
    const plan = requestedPlan || (billingPeriod === "yearly" ? "pro_completo_yearly" : "pro_completo");

    if (!CURRENT_PRICES[plan]) {
      return new Response(
        JSON.stringify({
          error: "Este plano legado não está mais disponível para novas contratações. Escolha o plano único MedStation Completo.",
          code: "LEGACY_PLAN_RETIRED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Black MedStation: só dentro da janela de novembro (horário de Brasília).
    if (plan === BLACK_ANNUAL_PLAN_SLUG && !isOfferedOneTimePlan(plan)) {
      return new Response(
        JSON.stringify({
          error: "A oferta Black MedStation vale só de 1 a 30 de novembro. Confira os planos na página inicial.",
          code: "OFFER_NOT_ACTIVE",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pix retirado das opções: o plano Pix mensal não é mais vendido.
    if (getOneTimePlan(plan) && !isOfferedOneTimePlan(plan)) {
      return new Response(
        JSON.stringify({
          error: "O pagamento via Pix não está mais disponível. Assine no cartão ou escolha o plano anual no cartão ou boleto.",
          code: "PAYMENT_OPTION_RETIRED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!email) throw new Error("Email é obrigatório");

    logStep("Checkout requested", { plan, coupon: Boolean(couponCode) });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email, limit: 10 });
    let reusableCustomerId: string | undefined;

    for (const customer of customers.data) {
      reusableCustomerId ??= customer.id;
      const existingSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 20,
      });
      const existingActive = existingSubs.data.find((subscription) =>
        ["active", "trialing", "past_due"].includes(subscription.status),
      );
      if (existingActive) {
        return new Response(
          JSON.stringify({
            error: "Já existe uma assinatura para este e-mail. Entre na sua conta para continuar.",
            code: "EXISTING_SUBSCRIPTION",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const origin = req.headers.get("origin") || "https://medstation-ai.com.br";
    const annual = isAnnualPlan(plan);
    const oneTimePlan = resolveOneTimePlan(plan);
    // Oferta fechada não acumula cupom nem desconto de indicação.
    if (oneTimePlan?.offer) couponCode = undefined;

    const baseMetadata: Record<string, string> = {
      plan,
      billing_period: billingPeriod,
      pricing_cohort: oneTimePlan?.offer ?? pricingCohort(),
      acquisition: "guest_checkout",
    };

    const oneTimeMetadata: Record<string, string> = oneTimePlan
      ? {
        ...baseMetadata,
        purpose: oneTimePlan.purpose,
        payment_category: oneTimePlan.category,
        access_period: oneTimePlan.accessPeriod,
        access_days: String(oneTimePlan.accessDays),
        ...(oneTimePlan.offer ? { offer: oneTimePlan.offer } : {}),
      }
      : baseMetadata;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = oneTimePlan
      ? {
        customer: reusableCustomerId,
        customer_email: reusableCustomerId ? undefined : email,
        line_items: [buildOneTimeLineItem(oneTimePlan, oneTimePriceIdFromEnv(oneTimePlan, (k) => Deno.env.get(k)))] as
          Stripe.Checkout.SessionCreateParams.LineItem[],
        mode: "payment",
        currency: oneTimePlan.currency,
        payment_method_types: oneTimePaymentMethodTypes(oneTimePlan, true) as
          Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        payment_method_options: oneTimePaymentMethodOptions(oneTimePaymentMethodTypes(oneTimePlan, true)) as
          Stripe.Checkout.SessionCreateParams.PaymentMethodOptions | undefined,
        success_url: `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: oneTimePlan.offer ? `${origin}/black?canceled=true` : `${origin}/?canceled=true`,
        billing_address_collection: "auto",
        metadata: oneTimeMetadata,
        payment_intent_data: { metadata: oneTimeMetadata },
      }
      : {
        customer: reusableCustomerId,
        customer_email: reusableCustomerId ? undefined : email,
        line_items: [monthlySubscriptionLineItem(CURRENT_PRICES[plan])] as
          Stripe.Checkout.SessionCreateParams.LineItem[],
        mode: "subscription",
        success_url: `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?canceled=true`,
        payment_method_collection: "always",
        phone_number_collection: { enabled: false },
        billing_address_collection: "auto",
        allow_promotion_codes: !couponCode,
        metadata: baseMetadata,
        subscription_data: { metadata: baseMetadata },
      };

    if (couponCode) sessionConfig.discounts = [{ coupon: couponCode }];

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(sessionConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (oneTimePlan && isAsyncMethodUnavailableError(message)) {
        if (!oneTimePlan.allowCardFallback) {
          logStep("PIX_UNAVAILABLE_NO_FALLBACK", { plan });
          return new Response(
            JSON.stringify({
              error: "O pagamento via Pix ainda não está disponível. Use a assinatura mensal no cartão.",
              code: "PIX_UNAVAILABLE",
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        logStep("ASYNC_METHOD_UNAVAILABLE_FALLBACK_CARD", { plan, message });
        sessionConfig.payment_method_types = oneTimePaymentMethodTypes(oneTimePlan, false) as
          Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
        delete sessionConfig.payment_method_options;
        session = await stripe.checkout.sessions.create(sessionConfig);
      } else {
        throw error;
      }
    }
    logStep("Checkout session created", { sessionId: session.id, plan, mode: sessionConfig.mode, annual });

    if (oneTimePlan) {
      await recordPurchaseAttempt({
        checkoutSessionId: session.id,
        plan: oneTimePlan,
        paymentMethodTypes: (sessionConfig.payment_method_types as string[]) ?? [],
        email,
        stripeCustomerId: reusableCustomerId ?? null,
        metadata: oneTimeMetadata,
      });
    }



    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
