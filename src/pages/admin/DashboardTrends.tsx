import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface TrendsResponse {
  window: { days: number; from: string };
  currency: string;
  signups: { date: string; count: number }[];
  subs_growth: { date: string; count: number }[];
  mrr_curve: { date: string; mrr_cents: number }[];
  ai_daily: { date: string; cost_usd: number; tokens: number }[];
  visitors?: { date: string; views: number; unique: number }[];
}

const RANGES: { label: string; value: number }[] = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "180d", value: 180 },
];

const shortDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 8px 24px -12px hsl(var(--foreground) / 0.15)",
};

const axisTick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

interface ChartCardProps {
  title: string;
  subtitle?: string;
  value?: string;
  delta?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, value, delta, children }: ChartCardProps) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-40 bg-gradient-to-b from-primary/8 to-transparent blur-3xl opacity-70" />
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {value && (
          <div className="text-right">
            <p className="text-lg font-display font-semibold leading-none">{value}</p>
            {delta && <p className="text-[11px] text-muted-foreground mt-1">{delta}</p>}
          </div>
        )}
      </div>
      <div className="h-56 relative">{children}</div>
    </Card>
  );
}

export default function DashboardTrends() {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-trends?days=${days}`,
        { headers: { Authorization: `Bearer ${session.session?.access_token ?? ""}` } },
      );
      if (!res.ok) throw new Error(`admin-trends ${res.status}`);
      const json = (await res.json()) as TrendsResponse;
      setData(json);
    } catch (e) {
      console.error("[dashboard-trends]", e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    if (!data) return null;
    const signupsTotal = data.signups.reduce((s, d) => s + d.count, 0);
    const aiTotal = data.ai_daily.reduce((s, d) => s + d.cost_usd, 0);
    const subsStart = data.subs_growth[0]?.count ?? 0;
    const subsEnd = data.subs_growth[data.subs_growth.length - 1]?.count ?? 0;
    const mrrEnd = data.mrr_curve[data.mrr_curve.length - 1]?.mrr_cents ?? 0;
    const mrrStart = data.mrr_curve[0]?.mrr_cents ?? 0;
    const visitorsTotal = (data.visitors ?? []).reduce((s, d) => s + d.views, 0);
    const uniqueTotal = (data.visitors ?? []).reduce((s, d) => s + d.unique, 0);
    return { signupsTotal, aiTotal, subsStart, subsEnd, mrrStart, mrrEnd, visitorsTotal, uniqueTotal };
  }, [data]);

  const fmtMoney = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: (data?.currency ?? "brl").toUpperCase(),
    }).format(cents / 100);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-base font-display font-semibold">Tendências</h2>
          <span className="text-xs text-muted-foreground">
            · série contínua dos últimos {days} dias
          </span>
        </div>
        <div className="inline-flex rounded-full border border-border/60 bg-card p-0.5">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant="ghost"
              onClick={() => setDays(r.value)}
              className={`h-7 px-3 rounded-full text-xs ${
                days === r.value
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <Card className="p-12 text-center border-dashed">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando séries…</span>
        </Card>
      ) : !data ? (
        <Card className="p-8 text-center border-dashed text-sm text-muted-foreground">
          Sem dados para o período.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Faturamento (MRR)"
            subtitle="Curva estimada a partir das assinaturas Stripe"
            value={summary ? fmtMoney(summary.mrrEnd) : ""}
            delta={
              summary && summary.mrrStart > 0
                ? `+${fmtMoney(summary.mrrEnd - summary.mrrStart)} no período`
                : summary
                  ? `+${fmtMoney(summary.mrrEnd)} no período`
                  : undefined
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.mrr_curve} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={30} />
                <YAxis tick={axisTick} tickFormatter={(v) => fmtMoney(v).replace(/\s/g, "")} width={80} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => shortDate(l as string)}
                  formatter={(v: number) => [fmtMoney(v), "MRR"]}
                />
                <Area
                  type="monotone"
                  dataKey="mrr_cents"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#mrrFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Assinantes pagantes"
            subtitle="Crescimento cumulativo"
            value={summary ? String(summary.subsEnd) : ""}
            delta={
              summary
                ? `${summary.subsEnd - summary.subsStart >= 0 ? "+" : ""}${
                    summary.subsEnd - summary.subsStart
                  } no período`
                : undefined
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.subs_growth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={30} />
                <YAxis tick={axisTick} allowDecimals={false} width={40} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => shortDate(l as string)}
                  formatter={(v: number) => [v, "Assinantes"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Novos cadastros"
            subtitle="Contas criadas por dia"
            value={summary ? String(summary.signupsTotal) : ""}
            delta="total no período"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.signups} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={30} />
                <YAxis tick={axisTick} allowDecimals={false} width={30} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => shortDate(l as string)}
                  formatter={(v: number) => [v, "Cadastros"]}
                />
                <Bar dataKey="count" fill="url(#signupsFill)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Custo de IA"
            subtitle="USD por dia (todos os assistentes)"
            value={summary ? `$${summary.aiTotal.toFixed(2)}` : ""}
            delta="acumulado no período"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ai_daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={30} />
                <YAxis
                  tick={axisTick}
                  width={50}
                  tickFormatter={(v) => `$${Number(v).toFixed(v < 1 ? 2 : 0)}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => shortDate(l as string)}
                  formatter={(v: number) => [`$${Number(v).toFixed(4)}`, "Custo IA"]}
                />
                <Area
                  type="monotone"
                  dataKey="cost_usd"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#aiFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Visitantes da landing"
            subtitle="Página de vendas · views totais vs sessões únicas"
            value={summary ? summary.visitorsTotal.toLocaleString("pt-BR") : ""}
            delta={summary ? `${summary.uniqueTotal.toLocaleString("pt-BR")} sessões únicas` : undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.visitors ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uniqueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} minTickGap={30} />
                <YAxis tick={axisTick} allowDecimals={false} width={40} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => shortDate(l as string)}
                  formatter={(v: number, name) => [v, name === "views" ? "Views" : "Únicos"]}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#viewsFill)"
                />
                <Area
                  type="monotone"
                  dataKey="unique"
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.6}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="url(#uniqueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  );
}
