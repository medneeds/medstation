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
        has_studius: true,
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
        has_studius: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get ALL active subscriptions (user can have multiple)
    // Note: Cannot use deep expand (>4 levels), so product will be a string ID
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    const productIds: string[] = [];
    let subscriptionEnd: string | null = null;

    // Product IDs - LIVE MODE (Produção)
    const AGENTS_PRODUCT_ID = "prod_TgR7u5urUle7om"; // MedStation AI
    const STUDIUS_PRODUCT_ID = "prod_TgR45WSvugMwLt"; // Studius AI

    if (hasActiveSub) {
      logStep("Processing active subscriptions", { count: subscriptions.data.length });
      
      // Collect all product IDs from all active subscriptions
      for (const subscription of subscriptions.data) {
        logStep("Processing subscription", { subscriptionId: subscription.id, itemsCount: subscription.items.data.length });
        
        for (const item of subscription.items.data) {
          // item.price.product is always a string ID when not using expand
          const productId = item.price.product as string;
          
          logStep("Found product in subscription", { productId, priceId: item.price.id });
          
          if (productId && !productIds.includes(productId)) {
            productIds.push(productId);
          }
        }
        
        // Get the latest subscription end date (handle potential undefined/null)
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
      logStep("Active subscriptions processed", { productIds, subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    // Determine access levels
    const hasAgents = productIds.includes(AGENTS_PRODUCT_ID);
    const hasStudius = productIds.includes(STUDIUS_PRODUCT_ID);

    logStep("Access levels determined", { hasAgents, hasStudius });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_ids: productIds,
      product_id: productIds[0] || null, // Backwards compatibility
      subscription_end: subscriptionEnd,
      has_agents: hasAgents,
      has_studius: hasStudius,
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
