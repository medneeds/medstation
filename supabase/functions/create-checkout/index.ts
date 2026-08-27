import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// New acquisition is intentionally limited to the unified MedStation plan.
// Legacy price/product IDs remain recognized by entitlement code for existing subscribers,
// but can no longer be sold by this endpoint.
const CURRENT_PRICES: Record<string, string> = {
  pro_completo: "price_1U4Zo7ACiwQRloW4cJIn0jYn",
  pro_completo_yearly: "price_1U4ZoTACiwQRloW4f30FmEPb",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json().catch(() => ({}));
    let couponCode = body.couponCode?.trim();
    const billingPeriod = body.billingPeriod || "monthly";

    if (!couponCode) {
      try {
        const { data: settings } = await supabaseClient
          .from("referral_settings")
          .select("active, referred_stripe_coupon")
          .eq("id", 1)
          .maybeSingle();
        const programActive = settings?.active !== false;
        const referralCoupon = settings?.referred_stripe_coupon || "XzP9db0s";

        if (programActive) {
          const { data: pendingRef } = await supabaseClient
            .from("referrals")
            .select("id")
            .eq("referred_user_id", user.id)
            .eq("status", "pending")
            .maybeSingle();
          if (pendingRef) {
            couponCode = referralCoupon;
            logStep("Auto-applying referral coupon", { coupon: referralCoupon });
          }
        }
      } catch (e) {
        console.error("[CREATE-CHECKOUT] referral lookup failed", e);
      }
    }

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

    logStep("Unified plan resolved", { plan, couponCode: couponCode || "none" });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil"
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    if (customerId) {
      const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
      const existingActive = existingSubs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
      if (existingActive) {
        return new Response(
          JSON.stringify({
            error: "Sua conta já possui uma assinatura ativa.",
            code: "EXISTING_SUBSCRIPTION",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: CURRENT_PRICES[plan], quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/obrigado?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      payment_method_collection: "always",
      phone_number_collection: { enabled: false },
      billing_address_collection: "auto",
      metadata: { plan, user_id: user.id, pricing_cohort: "current_unified" },
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
