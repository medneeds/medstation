import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("No authorization");
    const token = auth.replace("Bearer ", "");
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u.user) throw new Error("Not authenticated");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emails, reason, expires_days } = await req.json();
    if (!Array.isArray(emails) || emails.length === 0) throw new Error("No emails provided");

    const expiresAt = expires_days
      ? new Date(Date.now() + Number(expires_days) * 86400000).toISOString()
      : null;

    const results: { email: string; status: string; error?: string }[] = [];

    // Lista todos os usuários (paginado) para mapear email -> id
    const emailToId: Record<string, string> = {};
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const usr of data.users) {
        if (usr.email) emailToId[usr.email.toLowerCase()] = usr.id;
      }
      if (data.users.length < perPage) break;
      page++;
      if (page > 20) break; // safety
    }

    for (const raw of emails) {
      const email = String(raw).trim().toLowerCase();
      if (!email) continue;
      const uid = emailToId[email];
      if (!uid) {
        results.push({ email, status: "not_found" });
        continue;
      }
      const { error } = await admin
        .from("courtesy_access")
        .upsert(
          {
            user_id: uid,
            granted_by: u.user.id,
            reason: reason || "Cortesia em massa via /admin",
            expires_at: expiresAt,
          },
          { onConflict: "user_id" },
        );
      if (error) {
        results.push({ email, status: "error", error: error.message });
      } else {
        results.push({ email, status: "granted" });
        await admin.from("audit_log").insert({
          admin_id: u.user.id,
          action: "courtesy_bulk_grant",
          target_user_id: uid,
          metadata: { reason, expires_days },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
