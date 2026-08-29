import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-METRICS] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: staff access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const nowIso = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

    // Run every query in parallel — service role bypasses RLS so counts are true globals.
    const [
      courtesyAll,
      courtesyActive,
      feedbackAll,
      feedbackAssistants,
      referralsAll,
      referralCodes,
      ticketsAll,
      ticketsOpen,
      ticketsAssigned,
      ticketsWaiting,
      ticketsResolvedTotal,
      ticketsResolved24h,
      aiTokens24h,
      aiTokens30d,
      aiCalls24h,
      aiAssistants30d,
      auditEvents24h,
      auditEvents7d,
      secEvents24h,
      secEvents7d,
    ] = await Promise.all([
      supabase.from("courtesy_access").select("id", { count: "exact", head: true }),
      supabase.from("courtesy_access").select("id", { count: "exact", head: true })
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      supabase.from("user_feedback").select("rating, assistant"),
      supabase.from("user_feedback").select("assistant, rating"),
      supabase.from("referrals").select("status, reward_credit_days"),
      supabase.from("referral_codes").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "assigned"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "waiting_user"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true })
        .eq("status", "resolved").gte("resolved_at", dayAgo),
      supabase.from("ai_usage_logs").select("total_tokens, cost_usd").gte("created_at", dayAgo),
      supabase.from("ai_usage_logs").select("total_tokens, cost_usd").gte("created_at", monthAgo),
      supabase.from("ai_usage_logs").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      supabase.from("ai_usage_logs").select("assistant, total_tokens, cost_usd").gte("created_at", monthAgo),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      supabase.from("audit_log").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("security_events").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      supabase.from("security_events").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);

    // Feedback aggregations
    const fbRows = feedbackAll.data || [];
    const fbTotal = fbRows.length;
    const fbAvg = fbTotal ? fbRows.reduce((a, r: any) => a + (r.rating || 0), 0) / fbTotal : 0;
    const byAssistantMap = new Map<string, { sum: number; n: number }>();
    for (const r of feedbackAssistants.data || []) {
      const k = (r as any).assistant || "geral";
      const cur = byAssistantMap.get(k) || { sum: 0, n: 0 };
      cur.sum += (r as any).rating || 0;
      cur.n += 1;
      byAssistantMap.set(k, cur);
    }
    const byAssistant = [...byAssistantMap.entries()]
      .map(([assistant, v]) => ({ assistant, count: v.n, avg: v.n ? v.sum / v.n : 0 }))
      .sort((a, b) => b.count - a.count);

    // Referrals
    const refRows = referralsAll.data || [];
    const refTotal = refRows.length;
    const refPending = refRows.filter((r: any) => r.status === "pending").length;
    const refQualified = refRows.filter((r: any) => r.status === "qualified").length;
    const refRewarded = refRows.filter((r: any) => r.status === "rewarded").length;
    const refBlocked = refRows.filter((r: any) => r.status === "blocked").length;
    const refDays = refRows.reduce((s: number, r: any) => s + (r.reward_credit_days || 0), 0);
    const refConverted = refQualified + refRewarded;
    // Sem indicações registradas não existe taxa: 0% daria a impressão falsa de
    // um programa ativo com desempenho ruim.
    const refConversion = refTotal > 0 ? Math.round((refConverted / refTotal) * 1000) / 10 : null;


    // AI
    const tokens24h = (aiTokens24h.data || []).reduce((a: number, r: any) => a + (r.total_tokens || 0), 0);
    const cost24h = (aiTokens24h.data || []).reduce((a: number, r: any) => a + Number(r.cost_usd || 0), 0);
    const tokens30d = (aiTokens30d.data || []).reduce((a: number, r: any) => a + (r.total_tokens || 0), 0);
    const cost30d = (aiTokens30d.data || []).reduce((a: number, r: any) => a + Number(r.cost_usd || 0), 0);

    const asstMap = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const r of aiAssistants30d.data || []) {
      const k = (r as any).assistant || "outros";
      const cur = asstMap.get(k) || { calls: 0, tokens: 0, cost: 0 };
      cur.calls += 1;
      cur.tokens += (r as any).total_tokens || 0;
      cur.cost += Number((r as any).cost_usd || 0);
      asstMap.set(k, cur);
    }
    const topAssistants = [...asstMap.entries()]
      .map(([assistant, v]) => ({ assistant, calls: v.calls, tokens: v.tokens, cost_usd: Math.round(v.cost * 10000) / 10000 }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    const metrics = {
      generated_at: nowIso,
      courtesy: {
        total: courtesyAll.count ?? 0,
        active: courtesyActive.count ?? 0,
        expired: (courtesyAll.count ?? 0) - (courtesyActive.count ?? 0),
      },
      feedback: {
        total: fbTotal,
        avg_rating: Math.round(fbAvg * 100) / 100,
        by_assistant: byAssistant,
      },
      referrals: {
        total: refTotal,
        pending: refPending,
        qualified: refQualified,
        rewarded: refRewarded,
        blocked: refBlocked,
        codes_generated: referralCodes.count ?? 0,
        reward_days_total: refDays,
        conversion_rate: refConversion,
      },
      support: {
        open: ticketsOpen.count ?? 0,
        assigned: ticketsAssigned.count ?? 0,
        waiting_user: ticketsWaiting.count ?? 0,
        resolved_total: ticketsResolvedTotal.count ?? 0,
        resolved_24h: ticketsResolved24h.count ?? 0,
        total: ticketsAll.count ?? 0,
      },
      ai: {
        tokens_24h: tokens24h,
        tokens_30d: tokens30d,
        cost_24h_usd: Math.round(cost24h * 10000) / 10000,
        cost_30d_usd: Math.round(cost30d * 10000) / 10000,
        calls_24h: aiCalls24h.count ?? 0,
        top_assistants_30d: topAssistants,
      },
      audit: {
        events_24h: auditEvents24h.count ?? 0,
        events_7d: auditEvents7d.count ?? 0,
        security_events_24h: secEvents24h.count ?? 0,
        security_events_7d: secEvents7d.count ?? 0,
      },
    };

    log("Metrics computed", { generated_at: nowIso });

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
