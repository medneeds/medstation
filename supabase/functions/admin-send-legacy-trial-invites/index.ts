import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://medstation-ai.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u.user) throw new Error("Not authenticated");

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mode = "stats";
    let resend = false;
    try {
      const body = await req.json();
      if (body?.mode === "send") mode = "send";
      resend = body?.resend === true;
    } catch {
      /* body opcional */
    }

    const { data: invites, error } = await admin
      .from("legacy_trial_invites")
      .select("user_id, email, email_sent_at, claimed_at, dismissed_at");
    if (error) throw error;

    const total = invites?.length ?? 0;
    const claimed = invites?.filter((i) => i.claimed_at).length ?? 0;
    const sent = invites?.filter((i) => i.email_sent_at).length ?? 0;

    // Excluir quem já tem acesso completo liberado (cortesia/trial vigente)
    const nowIso = new Date().toISOString();
    const { data: courtesy } = await admin
      .from("courtesy_access")
      .select("user_id, expires_at");
    const withAccess = new Set(
      (courtesy ?? [])
        .filter((c) => !c.expires_at || c.expires_at > nowIso)
        .map((c) => c.user_id),
    );

    // Excluir assinantes ativos no Stripe
    const activeEmails = new Set<string>();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
          if (!["active", "trialing", "past_due"].includes(sub.status)) continue;
          const customer = await stripe.customers.retrieve(sub.customer as string);
          const email = (customer as { email?: string })?.email;
          if (email) activeEmails.add(email.toLowerCase());
        }
      } catch (e) {
        console.error("[admin-send-legacy-trial-invites] stripe lookup falhou", e);
      }
    }

    const eligible = (invites ?? []).filter(
      (i) =>
        !i.claimed_at &&
        !i.dismissed_at &&
        !withAccess.has(i.user_id) &&
        !(i.email && activeEmails.has(i.email.toLowerCase())),
    );

    const pending = eligible.filter((i) => resend || !i.email_sent_at);

    if (mode === "stats") {
      return new Response(
        JSON.stringify({
          total,
          claimed,
          sent,
          pending: pending.length,
          eligible: eligible.length,
          skipped_subscribers: activeEmails.size,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Nomes para personalizar a saudação
    const ids = pending.map((p) => p.user_id);
    const nameById: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of profiles ?? []) {
        if (p.full_name) nameById[p.id] = String(p.full_name).split(" ")[0];
      }
    }

    let ok = 0;
    let failed = 0;

    for (const invite of pending) {
      if (!invite.email) {
        failed++;
        continue;
      }
      try {
        const sendResult = await sendTemplateEmailWithLog(
          "legacy-trial-invite",
          invite.email,
          {
            idempotencyKey: `legacy-trial-invite-${invite.user_id}${resend ? `-${Date.now()}` : ""}`,
            templateData: {
              name: nameById[invite.user_id] ?? undefined,
              claimUrl: `${APP_URL}/dashboard?convite=7dias`,
            },
          },
        );
        if (!sendResult.sent) {
          console.warn("[admin-send-legacy-trial-invites] destinatario suprimido");
        }
        await admin
          .from("legacy_trial_invites")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("user_id", invite.user_id);
        ok++;
      } catch (e) {
        console.error("[admin-send-legacy-trial-invites] falha", invite.email, e);
        failed++;
      }
    }

    await admin.from("audit_log").insert({
      admin_id: u.user.id,
      action: "send_legacy_trial_invites",
      metadata: { sent: ok, failed, resend },
    });

    return new Response(JSON.stringify({ sent: ok, failed, total, claimed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin-send-legacy-trial-invites]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
