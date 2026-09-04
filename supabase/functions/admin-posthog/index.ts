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

    // ------------------------------------------------------------------
    // View "onboarding": distribuição agregada das respostas do onboarding.
    // Lê apenas colunas não pessoais de public.user_onboarding com service role
    // e devolve somente contagens. Nenhum dado vai para o PostHog.
    // Espelha a lógica de src/lib/onboardingInsights.ts (fonte testada).
    // ------------------------------------------------------------------
    if (new URL(req.url).searchParams.get("view") === "onboarding") {
      const { data: rows, error: obError } = await supabase
        .from("user_onboarding")
        .select("completed_at, routine_pains, work_settings, primary_goals, primary_path, recommended_tools");
      if (obError) throw obError;

      type OB = {
        completed_at: string | null;
        routine_pains: string[] | null;
        work_settings: string[] | null;
        primary_goals: string[] | null;
        primary_path: string | null;
        recommended_tools: string[] | null;
      };
      const all = (rows ?? []) as OB[];
      const completed = all.filter((r) => !!r.completed_at);
      const respondentsRows = completed.filter(
        (r) =>
          (r.routine_pains?.length ?? 0) > 0 ||
          (r.work_settings?.length ?? 0) > 0 ||
          (r.primary_goals?.length ?? 0) > 0,
      );
      const respondents = respondentsRows.length;

      const distribution = (lists: (string[] | null)[], limit?: number) => {
        const counts = new Map<string, number>();
        for (const list of lists) {
          if (!list) continue;
          for (const k of new Set(list.filter((v) => typeof v === "string" && v.length > 0))) {
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
        }
        const items = [...counts.entries()]
          .map(([k, count]) => ({
            key: k,
            count,
            percent: respondents ? Math.round((count / respondents) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
        return limit ? items.slice(0, limit) : items;
      };

      return new Response(
        JSON.stringify({
          configured: true,
          completedTotal: completed.length,
          pendingTotal: all.length - completed.length,
          completionPercent: all.length
            ? Math.round((completed.length / all.length) * 1000) / 10
            : null,
          surveyRespondents: respondents,
          legacyCompletedWithoutSurvey: completed.length - respondents,
          routinePains: distribution(respondentsRows.map((r) => r.routine_pains)),
          workSettings: distribution(respondentsRows.map((r) => r.work_settings)),
          primaryGoals: distribution(respondentsRows.map((r) => r.primary_goals)),
          primaryPaths: distribution(
            respondentsRows.map((r) => (r.primary_path ? [r.primary_path] : [])),
          ),
          recommendedTools: distribution(respondentsRows.map((r) => r.recommended_tools), 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ------------------------------------------------------------------
    // View "product": métricas de produto calculadas no BANCO (fonte da
    // verdade), não em eventos de navegador. Espelha src/lib/adminMetrics.ts.
    // Aquisição, ativação, retenção de uso e onboarding, sem PII.
    // ------------------------------------------------------------------
    if (new URL(req.url).searchParams.get("view") === "product") {
      const pdays = Math.max(1, Math.min(365, Number(new URL(req.url).searchParams.get("days") ?? "30")));
      const fromIso = new Date(Date.now() - pdays * 86_400_000).toISOString();

      const GENERIC = new Set(["clinical_assistant", "agent", "assistant", "", "null", "undefined"]);
      const FN_TOOL: Record<string, string> = {
        "examinus-chat": "examinus",
        "public-examinus": "examinus",
        "agent-chat": "clinicus",
        "consultation-transcribe": "consultorio",
        "transcribe-audio": "consultorio",
        "transcribe-case": "consultorio",
        "transcribe-prescription": "prescriptus",
        "structure-anamnesis": "clinicus",
        "generate-medical-document": "medical_document",
        "extract-file-text": "ocr",
        "public-extract-text": "ocr",
        "radiograph-interpret": "examinus",
        "process-document": "ocr",
        "extract-case-from-document": "ocr",
        "carpe-diem-round": "modo_rotineiro",
        "support-chat": "suporte",
        "public-assistants-chat": "guia-publico",
      };
      const toolSlug = (assistant: string | null, fn: string | null) => {
        const a = (assistant ?? "").trim().toLowerCase();
        if (a && !GENERIC.has(a)) return a;
        const f = (fn ?? "").trim().toLowerCase();
        if (f && FN_TOOL[f]) return FN_TOOL[f];
        return f || "não identificado";
      };
      const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
      const quant = (arr: number[], p: number): number | null => {
        if (!arr.length) return null;
        const s = [...arr].sort((a, b) => a - b);
        if (s.length === 1) return s[0];
        const pos = (s.length - 1) * p;
        const lo = Math.floor(pos), hi = Math.ceil(pos);
        const v = lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
        return Math.round(v * 10) / 10;
      };

      const [profilesRes, accessRes, usageRes, onboardingRes, usersRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("user_access").select("user_id, trial_started_at, trial_ends_at, trial_source"),
        supabase
          .from("ai_usage_logs")
          .select("user_id, created_at, assistant, function_name, status")
          .gte("created_at", fromIso)
          .limit(100000),
        supabase.from("user_onboarding").select("user_id, completed_at"),
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (usageRes.error) throw usageRes.error;

      type P = { id: string; created_at: string };
      const profiles = (profilesRes.data ?? []) as P[];
      const signupAt = new Map<string, number>();
      for (const p of profiles) signupAt.set(p.id, new Date(p.created_at).getTime());
      const cohort = profiles.filter((p) => p.created_at >= fromIso);
      const cohortIds = new Set(cohort.map((p) => p.id));

      // Provider de cadastro (Google x e-mail) — vem do auth admin, sem PII.
      const providerOf = new Map<string, string>();
      for (const u of usersRes.data?.users ?? []) {
        const meta = (u.app_metadata ?? {}) as { provider?: string };
        providerOf.set(u.id, meta.provider === "google" ? "google" : "email");
      }
      const signupsByProvider: Record<string, number> = {};
      for (const p of cohort) {
        const k = providerOf.get(p.id) ?? "desconhecido";
        signupsByProvider[k] = (signupsByProvider[k] ?? 0) + 1;
      }

      type U = {
        user_id: string | null;
        created_at: string;
        assistant: string | null;
        function_name: string | null;
        status: string | null;
      };
      const usage = ((usageRes.data ?? []) as U[]).filter(
        (r) => !!r.user_id && (r.status === null || r.status === "ok"),
      );

      const firstUse = new Map<string, number>();
      const activeDays = new Map<string, Set<string>>();
      const byTool = new Map<string, { actions: number; users: Set<string> }>();
      for (const r of usage) {
        const uid = r.user_id as string;
        const ts = new Date(r.created_at).getTime();
        if (!firstUse.has(uid) || ts < (firstUse.get(uid) as number)) firstUse.set(uid, ts);
        const day = r.created_at.slice(0, 10);
        if (!activeDays.has(uid)) activeDays.set(uid, new Set());
        activeDays.get(uid)!.add(day);
        const slug = toolSlug(r.assistant, r.function_name);
        if (!byTool.has(slug)) byTool.set(slug, { actions: 0, users: new Set() });
        const t = byTool.get(slug)!;
        t.actions++;
        t.users.add(uid);
      }

      const activatedUsers = firstUse.size;
      const cohortActivated = [...cohortIds].filter((id) => firstUse.has(id));
      const ttfvMinutes: number[] = [];
      const firstToolCohort = new Map<string, number>();
      for (const id of cohortActivated) {
        const s = signupAt.get(id);
        const v = firstUse.get(id);
        if (s === undefined || v === undefined || v < s) continue;
        ttfvMinutes.push((v - s) / 60000);
      }
      for (const r of usage) {
        const uid = r.user_id as string;
        if (!cohortIds.has(uid)) continue;
        if (new Date(r.created_at).getTime() !== firstUse.get(uid)) continue;
        const slug = toolSlug(r.assistant, r.function_name);
        firstToolCohort.set(slug, (firstToolCohort.get(slug) ?? 0) + 1);
      }
      const under10 = ttfvMinutes.filter((m) => m <= 10).length;

      // Ativação <=10 min por método de cadastro.
      const under10ByProvider: Record<string, number> = {};
      for (const id of cohortActivated) {
        const s = signupAt.get(id), v = firstUse.get(id);
        if (s === undefined || v === undefined || v < s) continue;
        if ((v - s) / 60000 > 10) continue;
        const k = providerOf.get(id) ?? "desconhecido";
        under10ByProvider[k] = (under10ByProvider[k] ?? 0) + 1;
      }

      let two = 0, three = 0, seven = 0;
      for (const d of activeDays.values()) {
        if (d.size >= 2) two++;
        if (d.size >= 3) three++;
        if (d.size >= 7) seven++;
      }

      type A = { user_id: string; trial_started_at: string; trial_ends_at: string; trial_source: string };
      const access = (accessRes.data ?? []) as A[];
      const now = Date.now();
      const trialsActive = access.filter((a) => new Date(a.trial_ends_at).getTime() > now).length;
      const trialsStartedWindow = access.filter((a) => a.trial_started_at >= fromIso).length;

      type OB = { user_id: string; completed_at: string | null };
      const ob = (onboardingRes.data ?? []) as OB[];

      return new Response(
        JSON.stringify({
          configured: true,
          window: { days: pdays, from: fromIso },
          generatedAt: new Date().toISOString(),
          acquisition: {
            signupsWindow: cohort.length,
            signupsTotal: profiles.length,
            signupsByProvider,
            authProviderCoverage: providerOf.size,
          },
          activation: {
            activatedUsersWindow: activatedUsers,
            cohortSignups: cohort.length,
            cohortActivated: cohortActivated.length,
            cohortActivationRate: pct(cohortActivated.length, cohort.length),
            zeroActionSignups: cohort.length - cohortActivated.length,
            timeToFirstValue: {
              users: ttfvMinutes.length,
              medianMinutes: quant(ttfvMinutes, 0.5),
              p75Minutes: quant(ttfvMinutes, 0.75),
              p90Minutes: quant(ttfvMinutes, 0.9),
              under10Minutes: under10,
              under10Percent: pct(under10, ttfvMinutes.length),
            },
            under10ByProvider,
            firstTool: [...firstToolCohort.entries()]
              .map(([tool, users]) => ({ tool, users }))
              .sort((a, b) => b.users - a.users),
          },
          usage: {
            actionsTotal: usage.length,
            uniqueUsers: activatedUsers,
            retention: {
              usersWithActivity: activeDays.size,
              twoPlusDays: two,
              threePlusDays: three,
              sevenPlusDays: seven,
            },
            byTool: [...byTool.entries()]
              .map(([tool, v]) => ({ tool, actions: v.actions, users: v.users.size }))
              .sort((a, b) => b.users - a.users || b.actions - a.actions),
          },
          trials: {
            activeNow: trialsActive,
            startedWindow: trialsStartedWindow,
            totalRecords: access.length,
          },
          onboarding: {
            rows: ob.length,
            completed: ob.filter((r) => !!r.completed_at).length,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
    // (landing -> trial -> primeiro valor -> checkout -> assinatura), incluindo
    // qualidade dos metadados e detecção de eventos duplicados.
    // ------------------------------------------------------------------
    if (url.searchParams.get("view") === "funnel") {
      const EV = "('lead_created','signup_started','signup_completed','trial_started','first_login','first_value_action','trial_expired','paywall_viewed','cta_click','checkout_started','subscription_completed')";
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
                    countIf(event = 'first_value_action') AS first_value,
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

      // Ativação: valor entregue por ferramenta e tempo até o primeiro valor.
      // Consultas isoladas — falha aqui não derruba o funil principal.
      let activationRows: Row[] = [];
      let ttfvRows: Row[] = [];
      try {
        [activationRows, ttfvRows] = await Promise.all([
          hogql(
            `SELECT coalesce(nullIf(toString(properties.feature), ''), 'não informado') AS f,
                    count() AS actions, count(DISTINCT person_id) AS users
             FROM events WHERE ${win} AND event = 'value_action_completed'
             GROUP BY f ORDER BY users DESC, actions DESC LIMIT 20`,
            projectId, key,
          ),
          hogql(
            `SELECT count() AS users,
                    quantile(0.5)(m) AS p50,
                    quantile(0.75)(m) AS p75,
                    quantile(0.9)(m) AS p90,
                    countIf(m <= 10) AS under10
             FROM (
               SELECT dateDiff('minute', s, v) AS m FROM (
                 SELECT person_id,
                        minIf(timestamp, event = 'signup_completed') AS s,
                        minIf(timestamp, event = 'first_value_action') AS v
                 FROM events
                 WHERE ${win} AND event IN ('signup_completed','first_value_action')
                 GROUP BY person_id
                 HAVING countIf(event = 'signup_completed') > 0
                    AND countIf(event = 'first_value_action') > 0
                    AND v >= s
               )
             )`,
            projectId, key,
          ),
        ]);
      } catch (e) {
        console.error("[admin-posthog] activation metrics failed:", e instanceof Error ? e.message : e);
      }



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
        { event: "first_value_action", label: "Primeiro valor percebido" },
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

      const activatedUsers = tMap.get("first_value_action")?.users ?? 0;
      const activationByFeature = activationRows.map((r) => {
        const users = num(r[2]);
        return {
          feature: String(r[0]),
          actions: num(r[1]),
          users,
          percentOfActivated: activatedUsers > 0 ? (users / activatedUsers) * 100 : null,
        };
      });

      const ttfv = ttfvRows[0];
      const ttfvUsers = num(ttfv?.[0]);
      const under10 = num(ttfv?.[4]);
      const round1 = (v: unknown) => (ttfvUsers > 0 ? Math.round(Number(v ?? 0) * 10) / 10 : null);
      const timeToFirstValue = {
        users: ttfvUsers,
        medianMinutes: round1(ttfv?.[1]),
        p75Minutes: round1(ttfv?.[2]),
        p90Minutes: round1(ttfv?.[3]),
        under10Minutes: under10,
        under10Percent: ttfvUsers > 0 ? (under10 / ttfvUsers) * 100 : null,
      };



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
          activationByFeature,
          timeToFirstValue,
          bySection: bySection.map((r) => ({

            name: String(r[0]), clicks: num(r[1]), checkouts: num(r[2]), subs: num(r[3]),
          })),
          byCta: byCta.map((r) => ({ name: String(r[0]), clicks: num(r[1]), users: num(r[2]) })),
          byPlan: byPlan.map((r) => ({ name: String(r[0]), checkouts: num(r[1]), subs: num(r[2]) })),
          byOrigin: byOrigin.map((r) => ({ name: String(r[0]), checkouts: num(r[1]) })),
          daily: daily.map((r) => ({
            date: String(r[0]),
            leads: num(r[1]), signups: num(r[2]), trials: num(r[3]), firstLogins: num(r[4]),
            firstValue: num(r[5]), expired: num(r[6]), paywalls: num(r[7]), checkout: num(r[8]), subs: num(r[9]),
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

    const [sources, devices, browsers, pages, countries, funnelRows, daily, totals] = await Promise.all([
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
      // Totais da janela: visitante único precisa ser distinto na janela inteira,
      // não a soma dos únicos diários (que conta o mesmo visitante várias vezes).
      hogql(
        `SELECT count() AS views, count(DISTINCT person_id) AS uniques
         FROM events WHERE ${pv}`,
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
        totals: {
          views: Number(totals[0]?.[0] ?? 0),
          uniqueVisitors: Number(totals[0]?.[1] ?? 0),
        },

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
