import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Authentication failed");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    if (action === "list") {
      const { data: rows, error } = await supabase
        .from("courtesy_access")
        .select("id, user_id, reason, expires_at, created_at, updated_at, referral_id, source")
        .eq("source", "referral")
        .order("expires_at", { ascending: true, nullsFirst: false })
        .limit(300);
      if (error) throw error;

      const ids = (rows || []).map((r: any) => r.user_id);
      const nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        (profs || []).forEach((p: any) => nameMap.set(p.id, p.full_name || ""));
      }

      const enriched = await Promise.all(
        (rows || []).map(async (r: any) => {
          let email = "";
          try {
            const { data } = await supabase.auth.admin.getUserById(r.user_id);
            email = data.user?.email || "";
          } catch {
            /* ignore */
          }
          const expires = r.expires_at ? new Date(r.expires_at).getTime() : null;
          return {
            ...r,
            email,
            full_name: nameMap.get(r.user_id) || "",
            days_left:
              expires === null
                ? null
                : Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000)),
            active: expires === null || expires > Date.now(),
          };
        })
      );

      return json({ rows: enriched });
    }

    const targetUserId: string | undefined = body.target_user_id;
    if (!targetUserId) throw new Error("target_user_id required");

    if (action === "extend") {
      const days = Number(body.days ?? 30);
      if (!Number.isFinite(days) || days <= 0 || days > 365) throw new Error("invalid days");

      const { data: existing } = await supabase
        .from("courtesy_access")
        .select("expires_at")
        .eq("user_id", targetUserId)
        .maybeSingle();

      const now = Date.now();
      const base =
        existing?.expires_at && new Date(existing.expires_at).getTime() > now
          ? new Date(existing.expires_at).getTime()
          : now;
      const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("courtesy_access").upsert(
        {
          user_id: targetUserId,
          granted_by: userData.user.id,
          reason: body.reason || "Extensão manual (indicação)",
          expires_at: expiresAt,
          source: "referral",
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      return json({ ok: true, expires_at: expiresAt });
    }

    if (action === "revoke") {
      const { error } = await supabase
        .from("courtesy_access")
        .delete()
        .eq("user_id", targetUserId);
      if (error) throw error;
      return json({ ok: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-REFERRAL-ACCESS]", msg);
    return json({ error: msg }, 500);
  }
});
