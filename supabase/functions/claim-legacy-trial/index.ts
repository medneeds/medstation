import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 7;

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
    const user = u.user;

    let action = "claim";
    try {
      const body = await req.json();
      if (body?.action === "dismiss") action = "dismiss";
    } catch {
      /* body opcional */
    }

    // Só usuários com convite pendente
    const { data: invite } = await admin
      .from("legacy_trial_invites")
      .select("user_id, claimed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!invite) {
      return new Response(JSON.stringify({ eligible: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "dismiss") {
      await admin
        .from("legacy_trial_invites")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return new Response(JSON.stringify({ dismissed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.claimed_at) {
      const { data: existing } = await admin
        .from("courtesy_access")
        .select("expires_at")
        .eq("user_id", user.id)
        .eq("source", "legacy_trial")
        .maybeSingle();
      return new Response(
        JSON.stringify({ claimed: true, already: true, expires_at: existing?.expires_at ?? null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expiresAt = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();

    const { error: courtesyError } = await admin
      .from("courtesy_access")
      .upsert(
        {
          user_id: user.id,
          granted_by: user.id,
          reason: "Convite de 7 dias — acesso completo (usuários antigos)",
          source: "legacy_trial",
          expires_at: expiresAt,
        },
        { onConflict: "user_id" },
      );
    if (courtesyError) throw courtesyError;

    await admin
      .from("legacy_trial_invites")
      .update({ claimed_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ claimed: true, expires_at: expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[claim-legacy-trial]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
