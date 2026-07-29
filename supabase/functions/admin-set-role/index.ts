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

    const { action, target_user_id, role } = await req.json();
    if (!action || !target_user_id || !role) throw new Error("Missing fields");
    if (!["admin", "support", "user"].includes(role)) throw new Error("Invalid role");

    if (action === "grant") {
      const { error } = await admin
        .from("user_roles")
        .upsert({ user_id: target_user_id, role }, { onConflict: "user_id,role" });
      if (error) throw error;
      await admin.from("audit_log").insert({
        admin_id: u.user.id,
        action: "role_grant",
        target_user_id,
        metadata: { role },
      });
    } else if (action === "revoke") {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", target_user_id)
        .eq("role", role);
      if (error) throw error;
      await admin.from("audit_log").insert({
        admin_id: u.user.id,
        action: "role_revoke",
        target_user_id,
        metadata: { role },
      });
    } else {
      throw new Error("Unknown action");
    }

    return new Response(JSON.stringify({ success: true }), {
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
