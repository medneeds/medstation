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
const PRICES = {
  agents_monthly: "price_1Sj4FbACiwQRloW42xp6WqYH",
  agents_yearly: "price_1Sj4GKACiwQRloW4QCtEvley",
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

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    logStep("Request parameters", { email, billingPeriod, couponCode: couponCode || "none" });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil"
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const priceId = billingPeriod === "yearly" ? PRICES.agents_yearly : PRICES.agents_monthly;
    logStep("Price selected", { priceId, billingPeriod });

    const origin = req.headers.get("origin") || "https://medstation.ai";
    
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      // Collect password for account creation
      custom_fields: [
        {
          key: "password",
          label: {
            type: "custom",
            custom: "Crie sua senha de acesso",
          },
          type: "text",
        },
      ],
      // Allow promo codes
      allow_promotion_codes: !couponCode,
      metadata: {
        product: "agents",
        billingPeriod,
      },
    };

    // Add specific coupon if provided
    if (couponCode) {
      sessionConfig.discounts = [{ coupon: couponCode }];
      logStep("Applying coupon", { coupon: couponCode });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id });

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
