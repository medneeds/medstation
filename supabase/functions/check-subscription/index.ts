import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getAuthenticatedUserAndAccess } from "../_shared/access-control.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

function computeAvailableUpgrade(hasAgents: boolean, hasConsultorio: boolean): string | null {
  if (hasAgents && !hasConsultorio) return "consultorio_upgrade";
  if (hasConsultorio && !hasAgents) return "agents_upgrade";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");
    const { user, access } = await getAuthenticatedUserAndAccess(req);

    logStep("Access resolved", {
      userId: user.id,
      accessStatus: access.status,
      paid: access.isPaidSubscriber,
      trial: access.isTrial,
    });

    // Preserve referral reward behavior, but only for real Stripe subscribers.
    if (access.isPaidSubscriber) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } },
        );
        const { data: pendingRef } = await supabaseAdmin
          .from("referrals")
          .select("id")
          .eq("referred_user_id", user.id)
          .eq("status", "pending")
          .maybeSingle();

        if (pendingRef) {
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

    const legacyTrialSource = access.trialSource === "legacy" ? "legacy" : access.isTrial ? "signup" : null;
    const availableUpgrade = access.isPaidSubscriber
      ? computeAvailableUpgrade(access.hasAgents, access.hasConsultorio)
      : null;

    return new Response(
      JSON.stringify({
        // Transitional compatibility: existing UI uses `subscribed` as "may use".
        // New code should prefer access_active + access_status + is_paid_subscriber.
        subscribed: access.canUsePlatform,
        access_active: access.canUsePlatform,
        access_status: access.status,
        is_paid_subscriber: access.isPaidSubscriber,
        trial: access.isTrial,
        trial_source: legacyTrialSource,
        trial_started_at: access.trialStartedAt,
        trial_ends_at: access.trialEndsAt,
        product_ids: access.productIds.length
          ? access.productIds
          : access.isTrial
            ? ["trial"]
            : access.status === "admin"
              ? ["admin"]
              : access.status === "courtesy_active"
                ? ["courtesy"]
                : [],
        product_id: access.productIds[0]
          ?? (access.isTrial ? "trial" : access.status === "admin" ? "admin" : access.status === "courtesy_active" ? "courtesy" : null),
        subscription_end: access.isTrial ? access.trialEndsAt : access.subscriptionEnd,
        has_agents: access.hasAgents,
        has_consultorio: access.hasConsultorio,
        available_upgrade: availableUpgrade,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "UNAUTHENTICATED" ? 401 : 500;
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
