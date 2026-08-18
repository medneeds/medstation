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

// Product IDs - LIVE MODE (Produção)
const AGENTS_PRODUCT_IDS = [
  "prod_TgR7u5urUle7om", // Agents standalone
  "prod_UUfvAeta3d1Rn5", // Agents upgrade
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle
  "prod_V4BACwTTBf5tBk", // Pro Completo (legado)
  "prod_V4jGKeBPH2hGYg", // MedStation Completo (plano único)
];
const CONSULTORIO_PRODUCT_IDS = [
  "prod_UUfuDkH9yfcfb3", // Consultório standalone
  "prod_UUfu9AzBtaGsCW", // Consultório upgrade
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle
  "prod_V4BACwTTBf5tBk", // Pro Completo (legado)
  "prod_V4jGKeBPH2hGYg", // MedStation Completo (plano único)
];

const TRIAL_DAYS = 7;

async function getTrialInfo(supabaseClient: any, userId: string) {
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle();
    if (!data?.created_at) return null;
    const start = new Date(data.created_at).getTime();
    const end = start + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() >= end) return null;
    return { trial_end: new Date(end).toISOString() };
  } catch (_e) {
    return null;
  }
}

function trialResponse(trialEnd: string, corsHeaders: Record<string, string>, source: "signup" | "legacy" = "signup") {
  return new Response(JSON.stringify({
    subscribed: true,
    trial: true,
    trial_source: source,
    product_ids: ["trial"],
    product_id: "trial",
    subscription_end: trialEnd,
    has_agents: true,
    has_consultorio: true,
    available_upgrade: null,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function computeAvailableUpgrade(hasAgents: boolean, hasConsultorio: boolean): string | null {
  if (hasAgents && !hasConsultorio) return "consultorio_upgrade";
  if (hasConsultorio && !hasAgents) return "agents_upgrade";
  return null;
}

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Admin
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
        has_consultorio: true,
        available_upgrade: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Cortesia / teste estendido: só vale quando não há assinatura ativa,
    // por isso é avaliada depois da consulta ao Stripe.
    const courtesyFallback = async () => {
      const { data: hasCourtesy } = await supabaseClient.rpc('has_active_courtesy', {
        _user_id: user.id,
      });
      if (!hasCourtesy) return null;

      const { data: courtesyData } = await supabaseClient
        .from('courtesy_access')
        .select('expires_at, source')
        .eq('user_id', user.id)
        .order('expires_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (courtesyData?.expires_at) {
        logStep("Teste estendido por cortesia", courtesyData);
        return trialResponse(
          courtesyData.expires_at,
          corsHeaders,
          courtesyData.source === "legacy_trial" ? "legacy" : "signup",
        );
      }

      return new Response(JSON.stringify({
        subscribed: true,
        product_ids: ['courtesy'],
        subscription_end: null,
        has_agents: true,
        has_consultorio: true,
        available_upgrade: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    };


    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      const courtesy = await courtesyFallback();
      if (courtesy) return courtesy;
      const trial = await getTrialInfo(supabaseClient, user.id);
      if (trial) {
        logStep("Trial ativo (sem cliente Stripe)", trial);
        return trialResponse(trial.trial_end, corsHeaders);
      }
      return new Response(JSON.stringify({
        subscribed: false,
        product_ids: [],
        has_agents: false,
        has_consultorio: false,
        available_upgrade: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    const validStatuses = ["active", "trialing", "past_due"];
    const validSubs = subscriptions.data.filter((s) => validStatuses.includes(s.status));

    const hasActiveSub = validSubs.length > 0;
    const productIds: string[] = [];
    let subscriptionEnd: string | null = null;

    for (const subscription of validSubs) {
      for (const item of subscription.items.data) {
        const pid = item.price.product as string;
        if (pid && !productIds.includes(pid)) productIds.push(pid);
      }
      if (subscription.current_period_end) {
        try {
          const endDate = new Date(subscription.current_period_end * 1000).toISOString();
          if (!subscriptionEnd || endDate > subscriptionEnd) subscriptionEnd = endDate;
        } catch {
          /* skip */
        }
      }
    }

    if (!hasActiveSub) {
      const courtesy = await courtesyFallback();
      if (courtesy) return courtesy;
      const trial = await getTrialInfo(supabaseClient, user.id);
      if (trial) {
        logStep("Trial ativo", trial);
        return trialResponse(trial.trial_end, corsHeaders);
      }
    }

    const hasAgents = productIds.some((id) => AGENTS_PRODUCT_IDS.includes(id));
    const hasConsultorio = productIds.some((id) => CONSULTORIO_PRODUCT_IDS.includes(id));
    const availableUpgrade = computeAvailableUpgrade(hasAgents, hasConsultorio);

    logStep("Access levels determined", { hasAgents, hasConsultorio, availableUpgrade });

    // Trigger referral reward if this user was referred and is now a paying subscriber
    if (hasActiveSub) {
      try {
        const { data: pendingRef } = await supabaseClient
          .from("referrals")
          .select("id")
          .eq("referred_user_id", user.id)
          .eq("status", "pending")
          .maybeSingle();
        if (pendingRef) {
          logStep("Triggering referral reward", { referralId: pendingRef.id });
          // Fire-and-forget: don't block subscription check
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/referral-reward`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ referred_user_id: user.id }),
          }).catch((e) => console.error("[CHECK-SUBSCRIPTION] reward dispatch failed", e));
        }
      } catch (e) {
        console.error("[CHECK-SUBSCRIPTION] referral check failed", e);
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_ids: productIds,
      product_id: productIds[0] || null,
      subscription_end: subscriptionEnd,
      has_agents: hasAgents,
      has_consultorio: hasConsultorio,
      available_upgrade: availableUpgrade,
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
