// Mapa de uso para o painel admin: onde a MedStation tem contas e onde é usada,
// somado por estado e por cidade. Só staff consulta e só contagens saem daqui
// (regras em _shared/usage-map.ts).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildUsageMap, type UsageMapProfile } from "../_shared/usage-map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE = 1000;
const MAX_PAGES = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) return json({ error: "Forbidden" }, 403);

    // Perfis: só os campos de localização (o telefone serve apenas para o DDD).
    const profiles: UsageMapProfile[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, city, state, crm_state, phone")
        .order("id", { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      profiles.push(...((data ?? []) as UsageMapProfile[]));
      if (!data || data.length < PAGE) break;
    }

    // Último uso de IA por conta. Do mais recente para o mais antigo: a primeira
    // linha de cada conta já é o último uso.
    const lastUse = new Map<string, string>();
    let usageComplete = false;
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await supabase
        .from("ai_usage_logs")
        .select("user_id, created_at")
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      for (const row of (data ?? []) as { user_id: string; created_at: string }[]) {
        if (!lastUse.has(row.user_id)) lastUse.set(row.user_id, row.created_at);
      }
      if (!data || data.length < PAGE) { usageComplete = true; break; }
    }

    const result = buildUsageMap(profiles, lastUse, Date.now());
    return json({ ...result, usageComplete, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[admin-usage-map]", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
