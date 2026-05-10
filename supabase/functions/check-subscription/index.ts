import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has admin role
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (isAdmin) {
      logStep("User is admin, granting full access");
      return new Response(JSON.stringify({
        subscribed: true,
        product_ids: ['admin'],
        subscription_end: null,
        has_agents: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: hasCourtesy } = await supabaseClient.rpc('has_active_courtesy', {
      _user_id: user.id,
    });

    if (hasCourtesy) {
      logStep("User has active courtesy access, granting full access");
      const { data: courtesyData } = await supabaseClient
        .from('courtesy_access')
        .select('expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        subscribed: true,
        product_ids: ['courtesy'],
        subscription_end: courtesyData?.expires_at || null,
        has_agents: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      return new Response(JSON.stringify({
        subscribed: false,
        product_ids: [],
        has_agents: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get ALL subscriptions (active, trialing, past_due) to be more lenient
    // past_due users are typically given a grace period to update payment
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    
    // Consider these statuses as "subscribed" (with grace for payment issues)
    const validStatuses = ["active", "trialing", "past_due"];
    const validSubs = subscriptions.data.filter((s) => validStatuses.includes(s.status));
    
    const hasActiveSub = validSubs.length > 0;
    const productIds: string[] = [];
    let subscriptionEnd: string | null = null;

    // Product IDs - LIVE MODE (Produção)
    const AGENTS_PRODUCT_ID = "prod_TgR7u5urUle7om"; // MedStation AI

    if (hasActiveSub) {
      logStep("Processing valid subscriptions", {
        count: validSubs.length,
        statuses: validSubs.map(s => s.status)
      });

      for (const subscription of validSubs) {
        for (const item of subscription.items.data) {
          const productId = item.price.product as string;
          if (productId && !productIds.includes(productId)) {
            productIds.push(productId);
          }
        }
        if (subscription.current_period_end) {
          try {
            const endDate = new Date(subscription.current_period_end * 1000).toISOString();
            if (!subscriptionEnd || endDate > subscriptionEnd) {
              subscriptionEnd = endDate;
            }
          } catch (dateError) {
            logStep("Date parsing error, skipping", { current_period_end: subscription.current_period_end });
          }
        }
      }
      logStep("Valid subscriptions processed", { productIds, subscriptionEnd });
    }

    const hasAgents = productIds.includes(AGENTS_PRODUCT_ID);
    logStep("Access levels determined", { hasAgents });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_ids: productIds,
      product_id: productIds[0] || null,
      subscription_end: subscriptionEnd,
      has_agents: hasAgents,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
