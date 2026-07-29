// Leitura de métricas do PostHog (Query API / HogQL) para o painel admin.
// Somente staff. A Personal API Key nunca sai do backend.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGION = (Deno.env.get("POSTHOG_REGION") ?? "eu").toLowerCase();
const API_HOST = REGION === "us" ? "https://us.posthog.com" : "https://eu.posthog.com";

type Row = (string | number | null)[];

async function hogql(query: string, projectId: string, key: string): Promise<Row[]> {
  const res = await fetch(`${API_HOST}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[admin-posthog] query failed [${res.status}]: ${body}`);
    throw new Error(`PostHog ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = await res.json();
  return (json.results ?? []) as Row[];
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
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("POSTHOG_PERSONAL_API_KEY");
    const projectId = Deno.env.get("POSTHOG_PROJECT_ID");
    if (!key || !projectId) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: "PostHog não configurado (chave pessoal ou project id ausente).",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") ?? "30")));
    const since = `now() - INTERVAL ${days} DAY`;

    const pv = `event = '$pageview' AND timestamp > ${since}`;

    const [sources, devices, browsers, pages, countries, funnelRows, daily] = await Promise.all([
      hogql(
        `SELECT coalesce(nullIf(properties.$referring_domain, ''), 'direto') AS src, count() AS c
         FROM events WHERE ${pv} GROUP BY src ORDER BY c DESC LIMIT 10`,
        projectId, key,
      ),
      hogql(
        `SELECT coalesce(nullIf(properties.$device_type, ''), 'desconhecido') AS d, count() AS c
         FROM events WHERE ${pv} GROUP BY d ORDER BY c DESC LIMIT 6`,
        projectId, key,
      ),
      hogql(
        `SELECT coalesce(nullIf(properties.$browser, ''), 'desconhecido') AS b, count() AS c
         FROM events WHERE ${pv} GROUP BY b ORDER BY c DESC LIMIT 8`,
        projectId, key,
      ),
      hogql(
        `SELECT coalesce(nullIf(properties.$pathname, ''), '/') AS p, count() AS c,
                count(DISTINCT person_id) AS u
         FROM events WHERE ${pv} GROUP BY p ORDER BY c DESC LIMIT 12`,
        projectId, key,
      ),
      hogql(
        `SELECT coalesce(nullIf(properties.$geoip_country_name, ''), 'desconhecido') AS country,
                count(DISTINCT person_id) AS u
         FROM events WHERE ${pv} GROUP BY country ORDER BY u DESC LIMIT 10`,
        projectId, key,
      ),
      hogql(
        `SELECT event, count(DISTINCT person_id) AS u
         FROM events
         WHERE timestamp > ${since}
           AND event IN ('$pageview','cta_click','checkout_started','subscription_completed')
         GROUP BY event`,
        projectId, key,
      ),
      hogql(
        `SELECT toDate(timestamp) AS d, count() AS views, count(DISTINCT person_id) AS uniques
         FROM events WHERE ${pv} GROUP BY d ORDER BY d ASC`,
        projectId, key,
      ),
    ]);

    const funnelMap = new Map<string, number>();
    for (const r of funnelRows) funnelMap.set(String(r[0]), Number(r[1] ?? 0));

    const funnel = [
      { step: "Visitou a landing", event: "$pageview" },
      { step: "Clicou em um CTA", event: "cta_click" },
      { step: "Iniciou checkout", event: "checkout_started" },
      { step: "Assinou", event: "subscription_completed" },
    ].map((s) => ({ step: s.step, users: funnelMap.get(s.event) ?? 0 }));

    return new Response(
      JSON.stringify({
        configured: true,
        window: { days },
        sources: sources.map((r) => ({ name: String(r[0]), count: Number(r[1] ?? 0) })),
        devices: devices.map((r) => ({ name: String(r[0]), count: Number(r[1] ?? 0) })),
        browsers: browsers.map((r) => ({ name: String(r[0]), count: Number(r[1] ?? 0) })),
        pages: pages.map((r) => ({
          path: String(r[0]),
          views: Number(r[1] ?? 0),
          uniques: Number(r[2] ?? 0),
        })),
        countries: countries.map((r) => ({ name: String(r[0]), uniques: Number(r[1] ?? 0) })),
        funnel,
        daily: daily.map((r) => ({
          date: String(r[0]),
          views: Number(r[1] ?? 0),
          uniques: Number(r[2] ?? 0),
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin-posthog] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
