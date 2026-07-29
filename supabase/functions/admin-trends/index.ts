// Séries temporais para o dashboard admin.
// Retorna cadastros/dia, custo IA/dia, curva cumulativa de assinantes pagantes
// e MRR estimado ao longo do tempo (Stripe). Só staff pode consultar.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dayKey(d: Date | string | number): string {
  const dt = typeof d === "string" ? new Date(d) : d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
}

function fillDays(from: Date, days: number): string[] {
  const out: string[] = [];
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

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
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const days = Math.max(7, Math.min(365, Number(url.searchParams.get("days") ?? "30")));
    const from = new Date(Date.now() - days * 86_400_000);
    const fromIso = from.toISOString();
    const dayList = fillDays(from, days);

    // Paralelo: DB
    const [signupsRes, aiRes, viewsRes] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", fromIso),
      supabase.from("ai_usage_logs").select("created_at, cost_usd, total_tokens").gte("created_at", fromIso),
      supabase.from("page_views").select("created_at, session_id").gte("created_at", fromIso),
    ]);

    // Séries base (bucket por dia)
    const signupsMap = new Map<string, number>();
    for (const r of signupsRes.data ?? []) {
      const k = dayKey((r as { created_at: string }).created_at);
      signupsMap.set(k, (signupsMap.get(k) ?? 0) + 1);
    }

    const aiMap = new Map<string, { cost: number; tokens: number }>();
    for (const r of aiRes.data ?? []) {
      const row = r as { created_at: string; cost_usd: number | null; total_tokens: number | null };
      const k = dayKey(row.created_at);
      const cur = aiMap.get(k) ?? { cost: 0, tokens: 0 };
      cur.cost += Number(row.cost_usd ?? 0);
      cur.tokens += Number(row.total_tokens ?? 0);
      aiMap.set(k, cur);
    }

    // Stripe: curva cumulativa de assinantes pagantes + MRR
    let subsGrowth: { date: string; count: number }[] = [];
    let mrrCurve: { date: string; mrr_cents: number }[] = [];
    let currency = "brl";

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        // Coleta paginada de assinaturas ativas — cap 500 para não travar
        const events: { day: string; monthly_cents: number }[] = [];
        let starting_after: string | undefined;
        let fetched = 0;
        while (fetched < 500) {
          const page = await stripe.subscriptions.list({
            status: "all",
            limit: 100,
            starting_after,
          });
          for (const s of page.data) {
            // Considera apenas assinaturas que já contribuíram (active/past_due/trialing)
            if (!["active", "past_due", "trialing"].includes(s.status)) continue;
            const startTs = s.start_date ?? s.created;
            if (!startTs) continue;
            const day = dayKey(new Date(startTs * 1000));
            const item = s.items?.data?.[0];
            const price = item?.price;
            if (!price) continue;
            currency = price.currency || currency;
            const unit = Number(price.unit_amount ?? 0);
            const interval = price.recurring?.interval ?? "month";
            const intervalCount = price.recurring?.interval_count ?? 1;
            // Normaliza pra mensal
            const perMonth = interval === "year"
              ? Math.round(unit / (12 * intervalCount))
              : interval === "week"
                ? Math.round(unit * (52 / 12) / intervalCount)
                : Math.round(unit / intervalCount);
            events.push({ day, monthly_cents: perMonth });
            fetched++;
          }
          if (!page.has_more) break;
          starting_after = page.data[page.data.length - 1]?.id;
          if (!starting_after) break;
        }

        // Agrupa por dia
        const dailyCount = new Map<string, number>();
        const dailyMrr = new Map<string, number>();
        for (const e of events) {
          dailyCount.set(e.day, (dailyCount.get(e.day) ?? 0) + 1);
          dailyMrr.set(e.day, (dailyMrr.get(e.day) ?? 0) + e.monthly_cents);
        }

        // Baseline: quantas assinaturas já existiam antes do início do período (fromIso)?
        const beforePeriodDays = [...new Set(events.map((e) => e.day))].filter((d) => d < dayList[0]);
        let baseCount = 0;
        let baseMrr = 0;
        for (const d of beforePeriodDays) {
          baseCount += dailyCount.get(d) ?? 0;
          baseMrr += dailyMrr.get(d) ?? 0;
        }

        // Curvas cumulativas dentro do período
        let cCount = baseCount;
        let cMrr = baseMrr;
        subsGrowth = dayList.map((d) => {
          cCount += dailyCount.get(d) ?? 0;
          return { date: d, count: cCount };
        });
        mrrCurve = dayList.map((d) => {
          cMrr += dailyMrr.get(d) ?? 0;
          return { date: d, mrr_cents: cMrr };
        });
      } catch (e) {
        console.error("[admin-trends] Stripe error:", (e as Error).message);
        subsGrowth = dayList.map((d) => ({ date: d, count: 0 }));
        mrrCurve = dayList.map((d) => ({ date: d, mrr_cents: 0 }));
      }
    } else {
      subsGrowth = dayList.map((d) => ({ date: d, count: 0 }));
      mrrCurve = dayList.map((d) => ({ date: d, mrr_cents: 0 }));
    }

    const signups = dayList.map((d) => ({ date: d, count: signupsMap.get(d) ?? 0 }));
    const aiDaily = dayList.map((d) => {
      const v = aiMap.get(d) ?? { cost: 0, tokens: 0 };
      return { date: d, cost_usd: Math.round(v.cost * 10000) / 10000, tokens: v.tokens };
    });

    return new Response(
      JSON.stringify({
        window: { days, from: fromIso },
        currency,
        signups,
        subs_growth: subsGrowth,
        mrr_curve: mrrCurve,
        ai_daily: aiDaily,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin-trends] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
