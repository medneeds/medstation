import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Internal endpoint — chamado pelo check-subscription quando detecta primeira assinatura paga
// de um usuário indicado.
// - Indicador COM assinatura ativa: 30 dias de crédito via trial_end.
// - Indicador SEM assinatura (lead): 30 dias de acesso liberado (cortesia), renovável a cada
//   nova indicação. Ao expirar, o acesso cai automaticamente.

async function notify(
  _supabase: any,
  email: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
) {
  try {
    await sendTemplateEmailWithLog("referral-reward-granted", email, {
      idempotencyKey,
      templateData: payload,
    });
  } catch (e) {
    console.error("[REFERRAL-REWARD] email failed", e);
  }
}

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
      .select("active, referrer_reward_days, max_rewards_per_referrer, lead_reward_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (settings && settings.active === false) {
      return new Response(JSON.stringify({ ok: false, reason: "program_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rewardDays = settings?.referrer_reward_days ?? 30;
    const maxRewards = settings?.max_rewards_per_referrer ?? 3;
    const leadRewardEnabled = settings?.lead_reward_enabled !== false;

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

    // Enforce the per-referrer reward cap (default: 3 free months)
    const { count: rewardedCount } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", ref.referrer_id)
      .eq("status", "rewarded");

    if ((rewardedCount ?? 0) >= maxRewards) {
      await supabase
        .from("referrals")
        .update({ status: "blocked", blocked_reason: "reward_limit_reached" })
        .eq("id", ref.id);
      return new Response(
        JSON.stringify({ ok: false, reason: "reward_limit_reached", max: maxRewards }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as qualified first to avoid double-processing race
    await supabase.from("referrals").update({ status: "qualified" }).eq("id", ref.id);

    // Get referrer email via admin
    const { data: referrerData, error: refErr } = await supabase.auth.admin.getUserById(
      ref.referrer_id
    );
    if (refErr || !referrerData.user?.email) {
      console.error("[REFERRAL-REWARD] referrer not found", ref.referrer_id);
      return new Response(JSON.stringify({ ok: false, reason: "referrer_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const referrerEmail = referrerData.user.email;
    const referrerName =
      (referrerData.user.user_metadata?.full_name as string | undefined) || undefined;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Does the referrer have an active subscription?
    let sub: any = null;
    const customers = await stripe.customers.list({ email: referrerEmail, limit: 1 });
    if (customers.data.length > 0) {
      const subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 5,
      });
      sub = subs.data[0] || null;
    }

    // ---------- Lead path: grant/extend courtesy access ----------
    if (!sub) {
      if (!leadRewardEnabled) {
        await supabase
          .from("referrals")
          .update({ status: "blocked", blocked_reason: "lead_reward_disabled" })
          .eq("id", ref.id);
        return new Response(JSON.stringify({ ok: false, reason: "lead_reward_disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("courtesy_access")
        .select("expires_at")
        .eq("user_id", ref.referrer_id)
        .maybeSingle();

      const now = Date.now();
      const base =
        existing?.expires_at && new Date(existing.expires_at).getTime() > now
          ? new Date(existing.expires_at).getTime()
          : now;
      const expiresAt = new Date(base + rewardDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: courtesyErr } = await supabase.from("courtesy_access").upsert(
        {
          user_id: ref.referrer_id,
          granted_by: ref.referrer_id,
          reason: `Indicação confirmada (${ref.code})`,
          expires_at: expiresAt,
          source: "referral",
          referral_id: ref.id,
        },
        { onConflict: "user_id" }
      );
      if (courtesyErr) throw courtesyErr;

      await supabase
        .from("referrals")
        .update({
          status: "rewarded",
          reward_type: "courtesy_days",
          reward_credit_days: rewardDays,
          reward_applied_at: new Date().toISOString(),
        })
        .eq("id", ref.id);

      await notify(
        supabase,
        referrerEmail,
        { name: referrerName, days: rewardDays, expiresAt, mode: "courtesy" },
        `referral-reward-${ref.id}`
      );

      console.log("[REFERRAL-REWARD] courtesy granted", { referralId: ref.id, expiresAt });
      return new Response(JSON.stringify({ ok: true, mode: "courtesy", expires_at: expiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Subscriber path: extend billing period ----------
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
        reward_type: "stripe_credit",
        reward_credit_days: rewardDays,
        reward_applied_at: new Date().toISOString(),
      })
      .eq("id", ref.id);

    await notify(
      supabase,
      referrerEmail,
      {
        name: referrerName,
        days: rewardDays,
        expiresAt: new Date(newTrialEnd * 1000).toISOString(),
        mode: "credit",
      },
      `referral-reward-${ref.id}`
    );

    console.log("[REFERRAL-REWARD] success", { referralId: ref.id, subId: sub.id });
    return new Response(JSON.stringify({ ok: true, mode: "credit", sub_id: sub.id }), {
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
