import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, BarChart3, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface PostHogResponse {
  configured: boolean;
  error?: string;
  window?: { days: number };
  sources?: { name: string; count: number }[];
  devices?: { name: string; count: number }[];
  browsers?: { name: string; count: number }[];
  pages?: { path: string; views: number; uniques: number }[];
  countries?: { name: string; uniques: number }[];
  funnel?: { step: string; users: number }[];
  daily?: { date: string; views: number; uniques: number }[];
}

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 8px 24px -12px hsl(var(--foreground) / 0.15)",
};

const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.65)",
  "hsl(var(--primary) / 0.42)",
  "hsl(var(--muted-foreground) / 0.55)",
  "hsl(var(--muted-foreground) / 0.35)",
  "hsl(var(--muted-foreground) / 0.2)",
];

const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });

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

export default function AdminAnalytics() {
  const [data, setData] = useState<PostHogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        `admin-posthog?days=${days}`,
        { method: "GET" },
      );
      if (error) throw error;
      if ((res as PostHogResponse)?.error && !(res as PostHogResponse).configured) {
        setErr((res as PostHogResponse).error ?? null);
      }
      setData(res as PostHogResponse);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const funnel = data?.funnel ?? [];
  const topUsers = funnel[0]?.users ?? 0;
  const conversion = useMemo(() => {
    const last = funnel[funnel.length - 1]?.users ?? 0;
    if (!topUsers) return "—";
    return `${((last / topUsers) * 100).toFixed(2)}%`;
  }, [funnel, topUsers]);

  const totalViews = (data?.daily ?? []).reduce((a, b) => a + b.views, 0);
  const totalUniques = (data?.daily ?? []).reduce((a, b) => a + b.uniques, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tráfego, dispositivos e funil de conversão da landing.
          </p>
        </div>
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
          <Button variant="ghost" size="sm" asChild>
            <a href="https://app.posthog.com" target="_blank" rel="noreferrer">
              Gravações e heatmaps
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
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
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Pageviews", value: totalViews.toLocaleString("pt-BR") },
              { label: "Visitantes únicos", value: totalUniques.toLocaleString("pt-BR") },
              { label: "Conversão visitante → assinante", value: conversion },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-display font-semibold mt-1">{k.value}</p>
              </Card>
            ))}
          </div>

          <Panel title="Visitantes ao longo do tempo" subtitle="Pageviews e visitantes únicos">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.daily ?? []}>
                  <defs>
                    <linearGradient id="phViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => shortDate(String(v))} />
                  <Area type="monotone" dataKey="views" name="Pageviews" stroke="hsl(var(--primary))" fill="url(#phViews)" strokeWidth={2} />
                  <Area type="monotone" dataKey="uniques" name="Únicos" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Origem do tráfego" subtitle="De onde vêm os visitantes">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.sources ?? []} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" horizontal={false} />
                    <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={110} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                    <Bar dataKey="count" name="Visitas" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Dispositivos" subtitle="Distribuição por tipo de aparelho">
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.devices ?? []}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {(data?.devices ?? []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 pr-2">
                  {(data?.devices ?? []).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="capitalize truncate">{d.name}</span>
                      <span className="ml-auto text-muted-foreground tabular-nums">
                        {d.count.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <Panel
            title="Funil de conversão"
            subtitle="Visitou → clicou em CTA → iniciou checkout → assinou"
            right={
              <div className="text-right">
                <p className="text-lg font-display font-semibold leading-none">{conversion}</p>
                <p className="text-[11px] text-muted-foreground mt-1">conversão final</p>
              </div>
            }
          >
            <div className="space-y-3">
              {funnel.map((s, i) => {
                const pct = topUsers ? (s.users / topUsers) * 100 : 0;
                const prev = i > 0 ? funnel[i - 1].users : s.users;
                const stepPct = prev ? (s.users / prev) * 100 : 0;
                return (
                  <div key={s.step}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium">{s.step}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {s.users.toLocaleString("pt-BR")} · {pct.toFixed(1)}%
                        {i > 0 && ` (${stepPct.toFixed(1)}% da etapa anterior)`}
                      </span>
                    </div>
                    <div className="h-8 rounded-md bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-md bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                        style={{ width: `${Math.max(pct, s.users > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {funnel.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Páginas mais visitadas" subtitle="Top 12 por pageviews">
              <div className="space-y-1.5">
                {(data?.pages ?? []).map((p) => (
                  <div key={p.path} className="flex items-center gap-3 text-xs">
                    <span className="truncate font-mono text-[11px]">{p.path}</span>
                    <span className="ml-auto text-muted-foreground tabular-nums shrink-0">
                      {p.views.toLocaleString("pt-BR")} views · {p.uniques.toLocaleString("pt-BR")} únicos
                    </span>
                  </div>
                ))}
                {(data?.pages ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                )}
              </div>
            </Panel>

            <Panel title="Navegadores e países" subtitle="Distribuição dos visitantes">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Navegador
                  </p>
                  {(data?.browsers ?? []).map((b) => (
                    <div key={b.name} className="flex items-center gap-2 text-xs">
                      <span className="truncate">{b.name}</span>
                      <span className="ml-auto text-muted-foreground tabular-nums">
                        {b.count.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    País
                  </p>
                  {(data?.countries ?? []).map((c) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-muted-foreground tabular-nums">
                        {c.uniques.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
