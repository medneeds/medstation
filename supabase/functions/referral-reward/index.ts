import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Internal endpoint — chamado pelo check-subscription quando detecta primeira assinatura paga
// de um usuário indicado. Aplica 30 dias de crédito ao indicador via trial_end na sub ativa dele.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const referredUserId: string | undefined = body.referred_user_id;
    if (!referredUserId) throw new Error("referred_user_id required");

    // Load configurable settings
    const { data: settings } = await supabase
      .from("referral_settings")
      .select("active, referrer_reward_days")
      .eq("id", 1)
      .maybeSingle();
    if (settings && settings.active === false) {
      return new Response(JSON.stringify({ ok: false, reason: "program_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rewardDays = settings?.referrer_reward_days ?? 30;

    // Find pending referral for this user
    const { data: ref } = await supabase
      .from("referrals")
      .select("*")
      .eq("referred_user_id", referredUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (!ref) {
      return new Response(JSON.stringify({ ok: false, reason: "no_pending_referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as qualified first to avoid double-processing race
    await supabase
      .from("referrals")
      .update({ status: "qualified" })
      .eq("id", ref.id);

    // Get referrer email via admin
    const { data: referrerData, error: refErr } = await supabase.auth.admin.getUserById(ref.referrer_id);
    if (refErr || !referrerData.user?.email) {
      console.error("[REFERRAL-REWARD] referrer not found", ref.referrer_id);
      return new Response(JSON.stringify({ ok: false, reason: "referrer_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const referrerEmail = referrerData.user.email;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find referrer's active subscription
    const customers = await stripe.customers.list({ email: referrerEmail, limit: 1 });
    if (customers.data.length === 0) {
      console.log("[REFERRAL-REWARD] referrer has no Stripe customer yet");
      return new Response(JSON.stringify({ ok: false, reason: "referrer_no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 5,
    });
    if (subs.data.length === 0) {
      console.log("[REFERRAL-REWARD] referrer has no active subscription");
      return new Response(JSON.stringify({ ok: false, reason: "referrer_no_active_sub" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sub = subs.data[0];

    // Extend by 30 days using trial_end (postpones next invoice)
    const currentEnd = sub.current_period_end || Math.floor(Date.now() / 1000);
    const newTrialEnd = currentEnd + rewardDays * 24 * 60 * 60;

    await stripe.subscriptions.update(sub.id, {
      trial_end: newTrialEnd,
      proration_behavior: "none",
      metadata: {
        ...(sub.metadata || {}),
        referral_credit_applied: new Date().toISOString(),
        referral_id: ref.id,
      },
    });

    await supabase
      .from("referrals")
      .update({
        status: "rewarded",
        reward_applied_at: new Date().toISOString(),
      })
      .eq("id", ref.id);

    console.log("[REFERRAL-REWARD] success", { referralId: ref.id, subId: sub.id });
    return new Response(JSON.stringify({ ok: true, sub_id: sub.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[REFERRAL-REWARD]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
