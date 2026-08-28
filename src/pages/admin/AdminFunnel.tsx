import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

/* -------------------------------------------------------------------------
 * Aba dedicada ao ciclo de aquisição e conversão:
 * landing → lead → cadastro → trial → primeiro login → checkout → assinatura.
 * Trial expirado e paywall aparecem separadamente porque não são etapas obrigatórias
 * para quem converte antes do fim do teste.
 * ---------------------------------------------------------------------- */

interface Step {
  event: string;
  label: string;
  total: number;
  users: number;
  duplicates: number;
}
interface Quality {
  event: string;
  label: string;
  total: number;
  expected: string[];
  coverage: { key: string; count: number; total: number }[];
  duplicates: number;
}
interface FunnelResponse {
  configured: boolean;
  error?: string;
  window?: { days: number };
  steps?: Step[];
  trialHealth?: { expiredUsers: number; paywallUsers: number; expiredEvents: number; paywallEvents: number };
  quality?: Quality[];
  activationByFeature?: { feature: string; actions: number; users: number; percentOfActivated: number | null }[];
  timeToFirstValue?: {
    users: number;
    medianMinutes: number | null;
    p75Minutes: number | null;
    p90Minutes: number | null;
    under10Minutes: number;
    under10Percent: number | null;
  };

  bySection?: { name: string; clicks: number; checkouts: number; subs: number }[];
  byCta?: { name: string; clicks: number; users: number }[];
  byPlan?: { name: string; checkouts: number; subs: number }[];
  byOrigin?: { name: string; checkouts: number }[];
  daily?: {
    date: string; leads: number; signups: number; trials: number; firstLogins: number;
    expired: number; paywalls: number; checkout: number; subs: number;
  }[];
  sample?: {
    timestamp: string;
    event: string;
    cta: string;
    section: string;
    plan: string;
    origin: string;
  }[];
}

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const META_LABEL: Record<string, string> = {
  cta: "identificador do CTA",
  cta_section: "seção do CTA",
  plan: "plano",
  origin: "origem do checkout",
};

const FEATURE_LABEL: Record<string, string> = {
  examinus: "Examinus",
  clinicus: "Clínicus",
  prescriptus: "Prescriptus",
  gasometrus: "Gasometrus",
  codexus: "Codexus",
  mediscuss: "Mediscuss",
  legalis: "Legalis",
  protocolus: "Protocolus",
  atestus: "Atestus",
  orientus: "Orientus",
  numerus: "Numerus",
  scorius: "Scorius",
  modo_escuta: "Modo Escuta",
  modo_rotineiro: "Modo Rotineiro",
  medical_document: "Documentos médicos",
  clinical_assistant: "Assistente clínico",
};

const featureLabel = (f: string) => FEATURE_LABEL[f] ?? f;

const minutes = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${v.toLocaleString("pt-BR")} min`;


const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 8px 24px -12px hsl(var(--foreground) / 0.15)",
};
const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });

const nf = (n: number) => n.toLocaleString("pt-BR");

function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-5 relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-40 bg-gradient-to-b from-primary/8 to-transparent blur-3xl opacity-70" />
      <div className="relative flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="relative">{children}</div>
    </Card>
  );
}

export default function AdminFunnel() {
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        `admin-posthog?view=funnel&days=${days}`,
        { method: "GET" },
      );
      if (error) throw error;
      const r = res as FunnelResponse;
      if (r?.error) setErr(r.error);
      setData(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const steps = data?.steps ?? [];
  const base = steps[0]?.users ?? 0;

  const rows = useMemo(
    () =>
      steps.map((s, i) => {
        const prev = i === 0 ? s.users : steps[i - 1].users;
        return {
          ...s,
          pctOfBase: base ? (s.users / base) * 100 : 0,
          pctOfPrev: prev ? (s.users / prev) * 100 : 0,
          dropoff: i === 0 ? 0 : Math.max(0, prev - s.users),
        };
      }),
    [steps, base],
  );

  const totalDuplicates = steps.reduce((a, s) => a + s.duplicates, 0);

  const metaIssues = useMemo(() => {
    const out: string[] = [];
    for (const q of data?.quality ?? []) {
      if (!q.total) continue;
      for (const c of q.coverage) {
        const pct = c.total ? (c.count / c.total) * 100 : 0;
        if (pct < 95) {
          out.push(
            `${q.label}: ${META_LABEL[c.key] ?? c.key} presente em apenas ${pct.toFixed(0)}% dos eventos`,
          );
        }
      }
    }
    return out;
  }, [data]);

  const healthy = !err && data?.configured && metaIssues.length === 0 && totalDuplicates === 0;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Da chegada à landing até a assinatura, incluindo cadastro, trial e recuperação pós-expiração.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/60 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  days === r.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {err && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Não foi possível carregar os dados</p>
            <p className="text-muted-foreground text-xs mt-1 break-all">{err}</p>
          </div>
        </Card>
      )}

      {loading && !data ? (
        <div className="h-72 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Diagnóstico de qualidade dos dados */}
          <Card
            className={`p-4 flex items-start gap-3 ${
              healthy ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            {healthy ? (
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="text-sm min-w-0">
              <p className="font-medium">
                {healthy
                  ? "Rastreamento saudável — todos os eventos chegam com plano e origem, sem duplicidade."
                  : "Pontos de atenção no rastreamento"}
              </p>
              {!healthy && (
                <ul className="text-xs text-muted-foreground mt-1.5 space-y-1">
                  {totalDuplicates > 0 && (
                    <li>
                      {nf(totalDuplicates)} evento(s) duplicado(s) detectado(s) — mesmo usuário,
                      mesmo evento, no mesmo segundo.
                    </li>
                  )}
                  {metaIssues.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                  {!metaIssues.length && totalDuplicates === 0 && (
                    <li>Sem eventos suficientes no período selecionado para validar.</li>
                  )}
                </ul>
              )}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Trials expirados</p>
              <p className="mt-1 text-2xl font-display font-semibold">{nf(data?.trialHealth?.expiredUsers ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Usuários únicos cujo teste chegou ao fim no período.</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Paywall alcançado</p>
              <p className="mt-1 text-2xl font-display font-semibold">{nf(data?.trialHealth?.paywallUsers ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Usuários únicos que viram o bloqueio e podem ser recuperados.</p>
            </Card>
          </div>

          {/* Funil em barras proporcionais */}
          <Panel
            title="Etapas do funil"
            subtitle="Usuários únicos por etapa e taxa de passagem"
          >
            <div className="space-y-3">
              {rows.map((r, i) => (
                <div key={r.event} className="group">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground w-4">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{r.label}</span>
                      <code className="text-[10px] text-muted-foreground hidden sm:inline">
                        {r.event}
                      </code>
                      {r.duplicates > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Copy className="h-2.5 w-2.5" />
                          {nf(r.duplicates)} dup.
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-3 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{nf(r.users)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                        {r.pctOfBase.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                      style={{ width: `${Math.max(r.pctOfBase, r.users ? 2 : 0)}%` }}
                    />
                  </div>
                  {i > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {r.pctOfPrev.toFixed(1)}% da etapa anterior
                      {r.dropoff > 0 && ` · ${nf(r.dropoff)} perdidos`}
                    </p>
                  )}
                </div>
              ))}
              {!rows.length && (
                <p className="text-sm text-muted-foreground">Nenhum evento no período.</p>
              )}
            </div>
          </Panel>

          {/* Evolução diária */}
          <Panel title="Evolução diária" subtitle="Volume de eventos por dia">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={(data?.daily ?? []).map((d) => ({ ...d, d: shortDate(d.date) }))}>
                <defs>
                  <linearGradient id="gCta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="d" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  name="Leads"
                  dataKey="leads"
                  stroke="hsl(var(--primary))"
                  fill="url(#gCta)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Trials iniciados"
                  dataKey="trials"
                  stroke="hsl(var(--primary) / 0.75)"
                  fill="transparent"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Checkouts iniciados"
                  dataKey="checkout"
                  stroke="hsl(var(--primary) / 0.55)"
                  fill="transparent"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Assinaturas"
                  dataKey="subs"
                  stroke="hsl(var(--foreground) / 0.6)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Por seção do CTA" subtitle="Onde a intenção de compra nasce">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.bySection ?? []} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar name="Cliques" dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar
                    name="Checkouts"
                    dataKey="checkouts"
                    fill="hsl(var(--primary) / 0.45)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Por plano" subtitle="Checkouts iniciados x assinaturas concluídas">
              <div className="space-y-2.5">
                {(data?.byPlan ?? []).map((p) => {
                  const rate = p.checkouts ? (p.subs / p.checkouts) * 100 : 0;
                  return (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="text-xs font-medium truncate flex-1" title={p.name}>
                        {p.name}
                      </span>
                      <div className="h-2 w-28 rounded-full bg-muted/60 overflow-hidden shrink-0">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-24 text-right">
                        {nf(p.subs)}/{nf(p.checkouts)} · {rate.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
                {!(data?.byPlan ?? []).length && (
                  <p className="text-sm text-muted-foreground">Sem checkouts no período.</p>
                )}
              </div>
            </Panel>

            <Panel title="Botões mais clicados" subtitle="Identificador do CTA">
              <div className="space-y-2">
                {(data?.byCta ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3 text-xs">
                    <code className="truncate text-muted-foreground" title={c.name}>
                      {c.name}
                    </code>
                    <span className="tabular-nums shrink-0">
                      {nf(c.clicks)} <span className="text-muted-foreground">({nf(c.users)} usu.)</span>
                    </span>
                  </div>
                ))}
                {!(data?.byCta ?? []).length && (
                  <p className="text-sm text-muted-foreground">Sem cliques no período.</p>
                )}
              </div>
            </Panel>

            <Panel title="Origem do checkout" subtitle="Onde o checkout foi iniciado">
              <div className="space-y-2">
                {(data?.byOrigin ?? []).map((o) => (
                  <div key={o.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate">{o.name}</span>
                    <span className="tabular-nums text-muted-foreground">{nf(o.checkouts)}</span>
                  </div>
                ))}
                {!(data?.byOrigin ?? []).length && (
                  <p className="text-sm text-muted-foreground">Sem checkouts no período.</p>
                )}
              </div>
            </Panel>
          </div>

          {/* Qualidade dos metadados */}
          <Panel
            title="Qualidade dos metadados"
            subtitle="Percentual de eventos que chegaram com as informações esperadas"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {(data?.quality ?? []).map((q) => (
                <div key={q.event} className="rounded-xl border border-border/60 p-4">
                  <p className="text-sm font-medium">{q.label}</p>
                  <code className="text-[10px] text-muted-foreground">{q.event}</code>
                  <p className="text-2xl font-semibold mt-2 tabular-nums">{nf(q.total)}</p>
                  <p className="text-[11px] text-muted-foreground">eventos no período</p>
                  <div className="mt-3 space-y-2">
                    {q.coverage.map((c) => {
                      const pct = c.total ? (c.count / c.total) * 100 : 0;
                      return (
                        <div key={c.key}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">
                              {META_LABEL[c.key] ?? c.key}
                            </span>
                            <span className="tabular-nums">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 95 ? "bg-primary" : "bg-destructive/70"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] mt-3 text-muted-foreground">
                    {q.duplicates > 0
                      ? `${nf(q.duplicates)} duplicado(s)`
                      : "Sem duplicidade detectada"}
                  </p>
                </div>
              ))}
              {!(data?.quality ?? []).length && (
                <p className="text-sm text-muted-foreground">Sem eventos no período.</p>
              )}
            </div>
          </Panel>

          {/* Amostra bruta para validação manual */}
          <Panel
            title="Últimos eventos recebidos"
            subtitle="Amostra bruta para conferir os metadados que chegam ao PostHog"
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="font-medium py-2 px-1">Quando</th>
                    <th className="font-medium py-2 px-1">Evento</th>
                    <th className="font-medium py-2 px-1">CTA</th>
                    <th className="font-medium py-2 px-1">Seção</th>
                    <th className="font-medium py-2 px-1">Plano</th>
                    <th className="font-medium py-2 px-1">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.sample ?? []).map((s, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="py-1.5 px-1 whitespace-nowrap text-muted-foreground">
                        {new Date(s.timestamp).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-1.5 px-1">
                        <code>{s.event}</code>
                      </td>
                      <td className="py-1.5 px-1">{s.cta || "—"}</td>
                      <td className="py-1.5 px-1">{s.section || "—"}</td>
                      <td className="py-1.5 px-1">{s.plan || "—"}</td>
                      <td className="py-1.5 px-1">{s.origin || "—"}</td>
                    </tr>
                  ))}
                  {!(data?.sample ?? []).length && (
                    <tr>
                      <td colSpan={6} className="py-4 text-muted-foreground">
                        Nenhum evento recebido no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
