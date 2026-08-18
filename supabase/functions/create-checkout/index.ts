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

// Price IDs - LIVE MODE (Produção)
const PRICES: Record<string, string> = {
  agents_monthly: "price_1Sj4FbACiwQRloW42xp6WqYH",
  agents_yearly: "price_1TVe5RACiwQRloW4KsjZ5QsK",
  agents_upgrade: "price_1TVgZWACiwQRloW4VxjohmIG",
  consultorio_monthly: "price_1TVgYdACiwQRloW4w2R2GJ2i",
  consultorio_yearly: "price_1TVgq1ACiwQRloW4w3EKIaBC",
  consultorio_upgrade: "price_1TVgZ8ACiwQRloW4WfmIx87N",
  pro2_bundle: "price_1TVga8ACiwQRloW4fPGUzAF9",
  pro2_bundle_yearly: "price_1TVgqWACiwQRloW4BwMkM74x",
  pro_completo: "price_1U4Zo7ACiwQRloW4cJIn0jYn",
  pro_completo_yearly: "price_1U4ZoTACiwQRloW4f30FmEPb",
};

const AGENTS_PRODUCT_IDS = [
  "prod_TgR7u5urUle7om",
  "prod_UUfvAeta3d1Rn5",
  "prod_UUfw2uz4UPwkco",
  "prod_V4BACwTTBf5tBk",
  "prod_V4jGKeBPH2hGYg",
];
const CONSULTORIO_PRODUCT_IDS = [
  "prod_UUfuDkH9yfcfb3",
  "prod_UUfu9AzBtaGsCW",
  "prod_UUfw2uz4UPwkco",
  "prod_V4BACwTTBf5tBk",
  "prod_V4jGKeBPH2hGYg",
];

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

    // Auto-apply referral coupon if this user has a pending referral and no other coupon was provided
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
    // New: explicit plan slug. Falls back to legacy product/billingPeriod mapping for backward compat.
    let plan: string | undefined = body.plan;

    if (!plan) {
      // Legacy compat: existing UI calls with billingPeriod only → agents
      plan = billingPeriod === "yearly" ? "agents_yearly" : "agents_monthly";
    }

    if (!PRICES[plan]) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    logStep("Plan resolved", { plan, couponCode: couponCode || "none" });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil"
    });

    // Eligibility check for upgrade SKUs
    if (plan === "consultorio_upgrade" || plan === "agents_upgrade") {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("Plano de upgrade indisponível: nenhuma assinatura ativa encontrada.");
      }
      const subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "all",
        limit: 20,
      });
      const validSubs = subs.data.filter((s) =>
        ["active", "trialing", "past_due"].includes(s.status)
      );
      const productIds: string[] = [];
      for (const s of validSubs) {
        for (const it of s.items.data) {
          const pid = it.price.product as string;
          if (pid && !productIds.includes(pid)) productIds.push(pid);
        }
      }
      const hasAgents = productIds.some((id) => AGENTS_PRODUCT_IDS.includes(id));
      const hasConsultorio = productIds.some((id) => CONSULTORIO_PRODUCT_IDS.includes(id));

      if (plan === "consultorio_upgrade" && !hasAgents) {
        throw new Error("Upgrade do Consultório requer assinatura ativa dos Assistentes.");
      }
      if (plan === "agents_upgrade" && !hasConsultorio) {
        throw new Error("Upgrade dos Assistentes requer assinatura ativa do Modo Escuta.");
      }
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/obrigado?success=true&plan=${plan}`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      // Maximiza disponibilidade de Apple Pay / Google Pay / Link
      payment_method_collection: "always",
      phone_number_collection: { enabled: false },
      billing_address_collection: "auto",
      metadata: { plan, user_id: user.id },
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
