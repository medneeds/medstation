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

    // ------------------------------------------------------------------
    // View "funnel": validação e visualização detalhada do funil de venda
    // (cta_click -> checkout_started -> subscription_completed), incluindo
    // qualidade dos metadados e detecção de eventos duplicados.
    // ------------------------------------------------------------------
    if (url.searchParams.get("view") === "funnel") {
      const EV = "('lead_created','signup_started','signup_completed','trial_started','first_login','trial_expired','paywall_viewed','cta_click','checkout_started','subscription_completed')";
      const QUALITY_EV = "('cta_click','checkout_started','subscription_completed')";
      const win = `timestamp > ${since}`;

      const [totals, pageviews, dupRows, metaRows, bySection, byCta, byPlan, byOrigin, daily, sample] =
        await Promise.all([
          hogql(
            `SELECT event, count() AS total, count(DISTINCT person_id) AS users,
                    count(DISTINCT properties.$session_id) AS sessions
             FROM events WHERE ${win} AND event IN ${EV}
             GROUP BY event`,
            projectId, key,
          ),
          hogql(
            `SELECT count() AS total, count(DISTINCT person_id) AS users
             FROM events WHERE ${win} AND event = '$pageview'
               AND coalesce(nullIf(toString(properties.$pathname), ''), '/') = '/'`,
            projectId, key,
          ),
          // Duplicatas: mesmo usuário, mesmo evento, mesmo segundo.
          hogql(
            `SELECT event, sum(c - 1) AS extras, count() AS groups FROM (
               SELECT event, person_id, toStartOfSecond(timestamp) AS s, count() AS c
               FROM events WHERE ${win} AND event IN ${EV}
               GROUP BY event, person_id, s HAVING c > 1
             ) GROUP BY event`,
            projectId, key,
          ),
          // Qualidade dos metadados por evento.
          hogql(
            `SELECT event,
                    count() AS total,
                    countIf(coalesce(nullIf(toString(properties.plan), ''), '') != '') AS with_plan,
                    countIf(coalesce(nullIf(toString(properties.cta), ''), '') != '') AS with_cta,
                    countIf(coalesce(nullIf(toString(properties.cta_section), ''), '') != '') AS with_section,
                    countIf(coalesce(nullIf(toString(properties.origin), ''), '') != '') AS with_origin
             FROM events WHERE ${win} AND event IN ${QUALITY_EV}
             GROUP BY event`,
            projectId, key,
          ),
          hogql(
            `SELECT coalesce(nullIf(toString(properties.cta_section), ''), 'sem seção') AS s,
                    countIf(event = 'cta_click') AS clicks,
                    countIf(event = 'checkout_started') AS checkouts,
                    countIf(event = 'subscription_completed') AS subs
             FROM events WHERE ${win} AND event IN ${EV}
             GROUP BY s ORDER BY clicks DESC LIMIT 12`,
            projectId, key,
          ),
          hogql(
            `SELECT coalesce(nullIf(toString(properties.cta), ''), 'sem identificador') AS c,
                    count() AS clicks, count(DISTINCT person_id) AS users
             FROM events WHERE ${win} AND event = 'cta_click'
             GROUP BY c ORDER BY clicks DESC LIMIT 12`,
            projectId, key,
          ),
          hogql(
            `SELECT coalesce(nullIf(toString(properties.plan), ''), 'sem plano') AS p,
                    countIf(event = 'checkout_started') AS checkouts,
                    countIf(event = 'subscription_completed') AS subs
             FROM events WHERE ${win} AND event IN ('checkout_started','subscription_completed')
             GROUP BY p ORDER BY checkouts DESC LIMIT 12`,
            projectId, key,
          ),
          hogql(
            `SELECT coalesce(nullIf(toString(properties.origin), ''), 'não informado') AS o,
                    count() AS checkouts
             FROM events WHERE ${win} AND event = 'checkout_started'
             GROUP BY o ORDER BY checkouts DESC LIMIT 10`,
            projectId, key,
          ),
          hogql(
            `SELECT toDate(timestamp) AS d,
                    countIf(event = 'lead_created') AS leads,
                    countIf(event = 'signup_completed') AS signups,
                    countIf(event = 'trial_started') AS trials,
                    countIf(event = 'first_login') AS first_logins,
                    countIf(event = 'trial_expired') AS expired,
                    countIf(event = 'paywall_viewed') AS paywalls,
                    countIf(event = 'checkout_started') AS checkout,
                    countIf(event = 'subscription_completed') AS subs
             FROM events WHERE ${win} AND event IN ${EV}
             GROUP BY d ORDER BY d ASC`,
            projectId, key,
          ),
          hogql(
            `SELECT timestamp, event,
                    coalesce(nullIf(toString(properties.cta), ''), '') AS cta,
                    coalesce(nullIf(toString(properties.cta_section), ''), '') AS section,
                    coalesce(nullIf(toString(properties.plan), ''), '') AS plan,
                    coalesce(nullIf(toString(properties.origin), ''), '') AS origin
             FROM events WHERE ${win} AND event IN ${EV}
             ORDER BY timestamp DESC LIMIT 40`,
            projectId, key,
          ),
        ]);

      const num = (v: unknown) => Number(v ?? 0);
      const tMap = new Map<string, { total: number; users: number; sessions: number }>();
      for (const r of totals) {
        tMap.set(String(r[0]), { total: num(r[1]), users: num(r[2]), sessions: num(r[3]) });
      }
      const dMap = new Map<string, number>();
      for (const r of dupRows) dMap.set(String(r[0]), num(r[1]));
      const mMap = new Map<string, Row>();
      for (const r of metaRows) mMap.set(String(r[0]), r);

      const STEPS = [
        { event: "$pageview", label: "Visitou a landing" },
        { event: "lead_created", label: "Lead capturado" },
        { event: "signup_completed", label: "Cadastro concluído" },
        { event: "trial_started", label: "Trial iniciado" },
        { event: "first_login", label: "Primeiro login" },
        { event: "checkout_started", label: "Iniciou checkout" },
        { event: "subscription_completed", label: "Assinou" },
      ];

      const pvTotal = num(pageviews[0]?.[0]);
      const pvUsers = num(pageviews[0]?.[1]);

      const steps = STEPS.map((s) => {
        const t = s.event === "$pageview"
          ? { total: pvTotal, users: pvUsers, sessions: 0 }
          : tMap.get(s.event) ?? { total: 0, users: 0, sessions: 0 };
        return {
          event: s.event,
          label: s.label,
          total: t.total,
          users: t.users,
          duplicates: dMap.get(s.event) ?? 0,
        };
      });

      const QUALITY_STEPS = [
        { event: "cta_click", label: "Clicou em um CTA" },
        { event: "checkout_started", label: "Iniciou checkout" },
        { event: "subscription_completed", label: "Assinou" },
      ];

      const quality = QUALITY_STEPS.map((s) => {
        const r = mMap.get(s.event);
        const total = num(r?.[1]);
        const expected =
          s.event === "cta_click"
            ? ["cta", "cta_section"]
            : s.event === "checkout_started"
              ? ["plan", "origin"]
              : ["plan"];
        const got: Record<string, number> = {
          plan: num(r?.[2]),
          cta: num(r?.[3]),
          cta_section: num(r?.[4]),
          origin: num(r?.[5]),
        };
        return {
          event: s.event,
          label: s.label,
          total,
          expected,
          coverage: expected.map((k) => ({ key: k, count: got[k] ?? 0, total })),
          duplicates: dMap.get(s.event) ?? 0,
        };
      });

      return new Response(
        JSON.stringify({
          configured: true,
          window: { days },
          steps,
          trialHealth: {
            expiredUsers: tMap.get("trial_expired")?.users ?? 0,
            paywallUsers: tMap.get("paywall_viewed")?.users ?? 0,
            expiredEvents: tMap.get("trial_expired")?.total ?? 0,
            paywallEvents: tMap.get("paywall_viewed")?.total ?? 0,
          },
          quality,
          bySection: bySection.map((r) => ({
            name: String(r[0]), clicks: num(r[1]), checkouts: num(r[2]), subs: num(r[3]),
          })),
          byCta: byCta.map((r) => ({ name: String(r[0]), clicks: num(r[1]), users: num(r[2]) })),
          byPlan: byPlan.map((r) => ({ name: String(r[0]), checkouts: num(r[1]), subs: num(r[2]) })),
          byOrigin: byOrigin.map((r) => ({ name: String(r[0]), checkouts: num(r[1]) })),
          daily: daily.map((r) => ({
            date: String(r[0]),
            leads: num(r[1]), signups: num(r[2]), trials: num(r[3]), firstLogins: num(r[4]),
            expired: num(r[5]), paywalls: num(r[6]), checkout: num(r[7]), subs: num(r[8]),
          })),
          sample: sample.map((r) => ({
            timestamp: String(r[0]), event: String(r[1]), cta: String(r[2] ?? ""),
            section: String(r[3] ?? ""), plan: String(r[4] ?? ""), origin: String(r[5] ?? ""),
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
