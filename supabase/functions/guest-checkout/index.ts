import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  ANNUAL_ACCESS_DAYS,
  ANNUAL_PURPOSE,
  annualPaymentMethodTypes,
  buildAnnualLineItem,
  isAnnualPlan,
  isPixUnavailableError,
} from "../_shared/annual-purchase.ts";

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
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const billingPeriod = body.billingPeriod || "monthly";
    const couponCode = body.couponCode?.trim();
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

    const baseMetadata: Record<string, string> = {
      plan,
      billing_period: billingPeriod,
      pricing_cohort: "current_unified",
      acquisition: "guest_checkout",
    };

    const annualMetadata: Record<string, string> = {
      ...baseMetadata,
      purpose: ANNUAL_PURPOSE,
      access_days: String(ANNUAL_ACCESS_DAYS),
    };

    const sessionConfig: Stripe.Checkout.SessionCreateParams = annual
      ? {
        customer: reusableCustomerId,
        customer_email: reusableCustomerId ? undefined : email,
        line_items: [buildAnnualLineItem(Deno.env.get("STRIPE_ANNUAL_ONETIME_PRICE_ID"))] as
          Stripe.Checkout.SessionCreateParams.LineItem[],
        mode: "payment",
        currency: "brl",
        payment_method_types: annualPaymentMethodTypes(true) as
          Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        success_url: `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?canceled=true`,
        billing_address_collection: "auto",
        metadata: annualMetadata,
        payment_intent_data: { metadata: annualMetadata },
      }
      : {
        customer: reusableCustomerId,
        customer_email: reusableCustomerId ? undefined : email,
        line_items: [{ price: CURRENT_PRICES[plan], quantity: 1 }],
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
      if (annual && isPixUnavailableError(message)) {
        logStep("PIX_UNAVAILABLE_FALLBACK_CARD", { plan });
        sessionConfig.payment_method_types = annualPaymentMethodTypes(false) as
          Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
        session = await stripe.checkout.sessions.create(sessionConfig);
      } else {
        throw error;
      }
    }
    logStep("Checkout session created", { sessionId: session.id, plan, mode: sessionConfig.mode });

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
