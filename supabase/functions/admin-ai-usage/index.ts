// Endpoint agregador de custos/uso de IA para o painel /admin.
// Retorna KPIs globais, séries temporais e rankings, com filtros por período,
// usuário, provider e assistente. Somente admin/support podem consultar.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  created_at: string;
  user_id: string | null;
  assistant: string | null;
  function_name: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
}

function providerOf(row: Row): string {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const p = typeof meta.provider === "string" ? (meta.provider as string) : null;
  if (p) return p;
  const m = row.model ?? "";
  if (m.startsWith("openai/whisper")) return "openai";
  if (m.startsWith("elevenlabs/")) return "elevenlabs";
  if (m.startsWith("openai/") || m.startsWith("google/") || m.startsWith("anthropic/")) return "lovable_ai";
  return "unknown";
}

function bucketDay(iso: string): string {
  return iso.slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supaAuth = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supaAuth.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: staff } = await admin.rpc("is_staff", { _user_id: user.id });
    if (!staff) return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const days = Number.isFinite(body?.days) ? Math.max(1, Math.min(365, Number(body.days))) : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const filterUserId: string | null = body?.userId ?? null;
    const filterProvider: string | null = body?.provider ?? null;
    const filterAssistant: string | null = body?.assistant ?? null;

    let q = admin.from("ai_usage_logs")
      .select("created_at, user_id, assistant, function_name, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, status, metadata")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (filterUserId) q = q.eq("user_id", filterUserId);
    if (filterAssistant) q = q.eq("assistant", filterAssistant);

    const { data: rows, error } = await q;
    if (error) throw error;
    const all = (rows || []) as Row[];
    const filtered = filterProvider ? all.filter((r) => providerOf(r) === filterProvider) : all;

    // KPIs
    let totalCost = 0, totalTokens = 0, errors = 0, latencySum = 0, latencyCount = 0;
    const byProvider: Record<string, { cost: number; tokens: number; calls: number }> = {};
    const byAssistant: Record<string, { cost: number; tokens: number; calls: number }> = {};
    const byModel: Record<string, { cost: number; tokens: number; calls: number }> = {};
    const byUser: Record<string, { cost: number; tokens: number; calls: number }> = {};
    const series: Record<string, { cost: number; tokens: number; calls: number }> = {};

    for (const r of filtered) {
      const cost = Number(r.cost_usd ?? 0);
      const tokens = Number(r.total_tokens ?? 0);
      totalCost += cost;
      totalTokens += tokens;
      if (r.status && r.status !== "ok") errors++;
      if (r.latency_ms != null) { latencySum += r.latency_ms; latencyCount++; }

      const prov = providerOf(r);
      const ass = r.assistant ?? "—";
      const model = r.model ?? "—";
      const uid = r.user_id ?? "anônimo";
      const day = bucketDay(r.created_at);

      (byProvider[prov] ??= { cost: 0, tokens: 0, calls: 0 });
      byProvider[prov].cost += cost; byProvider[prov].tokens += tokens; byProvider[prov].calls++;
      (byAssistant[ass] ??= { cost: 0, tokens: 0, calls: 0 });
      byAssistant[ass].cost += cost; byAssistant[ass].tokens += tokens; byAssistant[ass].calls++;
      (byModel[model] ??= { cost: 0, tokens: 0, calls: 0 });
      byModel[model].cost += cost; byModel[model].tokens += tokens; byModel[model].calls++;
      (byUser[uid] ??= { cost: 0, tokens: 0, calls: 0 });
      byUser[uid].cost += cost; byUser[uid].tokens += tokens; byUser[uid].calls++;
      (series[day] ??= { cost: 0, tokens: 0, calls: 0 });
      series[day].cost += cost; series[day].tokens += tokens; series[day].calls++;
    }

    // Resolver nomes dos top users
    const topUserIds = Object.entries(byUser)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([id]) => id)
      .filter((id) => id !== "anônimo");
    let userNames: Record<string, string> = {};
    if (topUserIds.length) {
      const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", topUserIds);
      userNames = Object.fromEntries((profs || []).map((p) => [p.id, p.full_name || p.id]));
    }

    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([id, v]) => ({ user_id: id, name: userNames[id] || id, ...v }));

    const timeSeries = Object.entries(series)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return new Response(JSON.stringify({
      window: { days, from },
      kpis: {
        total_cost_usd: totalCost,
        total_tokens: totalTokens,
        total_calls: filtered.length,
        error_rate: filtered.length ? errors / filtered.length : 0,
        avg_latency_ms: latencyCount ? Math.round(latencySum / latencyCount) : 0,
      },
      by_provider: Object.entries(byProvider).map(([k, v]) => ({ provider: k, ...v })),
      by_assistant: Object.entries(byAssistant).sort((a, b) => b[1].cost - a[1].cost).map(([k, v]) => ({ assistant: k, ...v })),
      by_model: Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost).slice(0, 15).map(([k, v]) => ({ model: k, ...v })),
      top_users: topUsers,
      time_series: timeSeries,
      recent: filtered.slice(0, 50),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("[admin-ai-usage] error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
