import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { authenticated: true });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let customerId: string | null = null;

    // Prefer the persisted subscription-to-user mapping when the billing state
    // table exists. Fall back to Stripe lookup while rollout/backfill completes.
    try {
      const { data: persisted } = await supabaseClient
        .from("stripe_subscriptions")
        .select("stripe_customer_id, status, updated_at")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due", "unpaid"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      customerId = persisted?.stripe_customer_id ?? null;
    } catch {
      customerId = null;
    }

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      let fallbackCustomerId: string | null = customers.data[0]?.id ?? null;

      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 20,
        });
        if (subscriptions.data.some((subscription) =>
          ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
        )) {
          fallbackCustomerId = customer.id;
          break;
        }
      }
      customerId = fallbackCustomerId;
    }

    if (!customerId) throw new Error("No Stripe customer found for this user");

    const origin = req.headers.get("origin") || "https://medstation-ai.com.br";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
    logStep("Customer portal session created", { created: true });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
