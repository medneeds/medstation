import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const pending = (invites ?? []).filter(
      (i) => !i.claimed_at && (resend || !i.email_sent_at),
    );

    if (mode === "stats") {
      return new Response(
        JSON.stringify({ total, claimed, sent, pending: pending.length }),
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
        const { error: sendError } = await admin.functions.invoke(
          "send-transactional-email",
          {
            body: {
              templateName: "legacy-trial-invite",
              recipientEmail: invite.email,
              idempotencyKey: `legacy-trial-invite-${invite.user_id}${resend ? `-${Date.now()}` : ""}`,
              templateData: {
                name: nameById[invite.user_id] ?? undefined,
                claimUrl: `${APP_URL}/dashboard?convite=7dias`,
              },
            },
          },
        );
        if (sendError) throw sendError;
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
