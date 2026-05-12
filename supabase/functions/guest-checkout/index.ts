import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GUEST-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs - LIVE MODE (Produção)
const PRICES: Record<string, string> = {
  agents_monthly: "price_1Sj4FbACiwQRloW42xp6WqYH",
  agents_yearly: "price_1TVe5RACiwQRloW4KsjZ5QsK",
  consultorio_monthly: "price_1TVgYdACiwQRloW4w2R2GJ2i",
  consultorio_yearly: "price_1TVgq1ACiwQRloW4w3EKIaBC",
  pro2_bundle: "price_1TVga8ACiwQRloW4fPGUzAF9",
  pro2_bundle_yearly: "price_1TVgqWACiwQRloW4BwMkM74x",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const billingPeriod = body.billingPeriod || "monthly";
    const couponCode = body.couponCode?.trim();
    let plan: string | undefined = body.plan;

    if (!plan) {
      plan = billingPeriod === "yearly" ? "agents_yearly" : "agents_monthly";
    }

    if (!PRICES[plan]) {
      throw new Error(`Plano inválido para guest checkout: ${plan}`);
    }

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    logStep("Request parameters", { email, plan, couponCode: couponCode || "none" });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil"
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://medstation.ai";

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      // Senha agora é OPCIONAL: Apple Pay / Google Pay / Link não preenchem
      // custom_fields. Se o usuário pagar via wallet, criamos a conta sem
      // senha e oferecemos definir depois pelo fluxo de recuperação.
      custom_fields: [
        {
          key: "password",
          label: { type: "custom", custom: "Crie sua senha (opcional — pode definir depois)" },
          type: "text",
          optional: true,
        },
      ],
      // Maximiza disponibilidade de wallets (Apple Pay, Google Pay, Link).
      payment_method_collection: "always",
      phone_number_collection: { enabled: false },
      billing_address_collection: "auto",
      allow_promotion_codes: !couponCode,
      metadata: { plan, billingPeriod },
    };

    if (couponCode) {
      sessionConfig.discounts = [{ coupon: couponCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id, plan });

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
