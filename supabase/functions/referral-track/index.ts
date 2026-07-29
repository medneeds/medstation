import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("Not authenticated");

    const body = await req.json().catch(() => ({}));
    const code = (body.code || "").toString().trim().toUpperCase();
    if (!code || code.length < 4 || code.length > 12) {
      return new Response(JSON.stringify({ ok: false, reason: "invalid_code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("referral_settings")
      .select("active, require_crm, block_existing_referrers")
      .eq("id", 1)
      .maybeSingle();

    if (settings && settings.active === false) {
      return new Response(JSON.stringify({ ok: false, reason: "program_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the referrer
    const { data: refRow } = await supabase
      .from("referral_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();

    if (!refRow) {
      return new Response(JSON.stringify({ ok: false, reason: "code_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (refRow.user_id === user.id) {
      return new Response(JSON.stringify({ ok: false, reason: "self_referral" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-fraud: whoever already referred someone cannot be referred (no 50% off)
    if (settings?.block_existing_referrers !== false) {
      const { count: ownReferrals } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id);
      if ((ownReferrals ?? 0) > 0) {
        return new Response(JSON.stringify({ ok: false, reason: "already_referrer" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Already tracked?
    const { data: alreadyTracked } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();
    if (alreadyTracked) {
      return new Response(JSON.stringify({ ok: false, reason: "already_tracked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the referred user's CRM (anti-fraud)
    const { data: profile } = await supabase
      .from("profiles")
      .select("crm")
      .eq("id", user.id)
      .maybeSingle();
    const crm = profile?.crm?.toString().trim() || null;

    // CRM uniqueness check
    if (crm) {
      const { data: crmTaken } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_crm", crm)
        .maybeSingle();
      if (crmTaken) {
        return new Response(JSON.stringify({ ok: false, reason: "crm_already_referred" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;

    const { error: insErr } = await supabase.from("referrals").insert({
      referrer_id: refRow.user_id,
      referred_user_id: user.id,
      referred_email: user.email,
      referred_crm: crm,
      code,
      status: "pending",
      ip_address: ip,
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[REFERRAL-TRACK]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
