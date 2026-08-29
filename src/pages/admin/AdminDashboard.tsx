import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  Activity,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Wallet,
  Star,
  Gift,
  ShieldAlert,
} from "lucide-react";
import type { AdminMetrics, SubscribersResponse, SubscriberRecord } from "./types";
import DashboardTrends from "./DashboardTrends";

interface KPIs {
  totalUsers: number;
  activeSubs: number;
  payingTotal: number;
  accessActive: number;
  freeTrial: number;
  mrrCents: number;
  arrCents: number;
  currency: string;
  courtesyActive: number;
  openTickets: number;
  tokens24h: number;
  cost30d: number;
  avgFeedback: number;
  feedbackTotal: number;
  referrals: number;
  referralConversion: number | null;
  securityEvents24h: number;
}


async function invokeAdmin<T>(name: string, query = ""): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/${name}${query}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
  });
  if (!res.ok) throw new Error(`${name} failed (${res.status})`);
  return res.json() as Promise<T>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeUsers, setActiveUsers] = useState<SubscriberRecord[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);


  const load = useCallback(async (forceStripeReload = false) => {
    if (forceStripeReload) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const [subs, metrics, activeList] = await Promise.all([
        invokeAdmin<SubscribersResponse>(
          "admin-list-subscribers",
          `?page=1&perPage=1&status=all${forceStripeReload ? "&refresh=true" : ""}`,
        ),
        invokeAdmin<AdminMetrics>("admin-metrics"),
        invokeAdmin<SubscribersResponse>(
          "admin-list-subscribers",
          "?page=1&perPage=50&status=access_active",
        ),
      ]);

      setKpis({
        totalUsers: subs.stats.total_users,
        activeSubs: subs.stats.active,
        payingTotal: subs.stats.paying_total,
        accessActive: subs.stats.access_active ?? 0,
        freeTrial: subs.stats.free_trial ?? 0,
        mrrCents: subs.stats.mrr_cents,
        arrCents: subs.stats.arr_cents,
        currency: subs.stats.currency,
        courtesyActive: metrics.courtesy.active,
        openTickets: metrics.support.open + metrics.support.assigned,
        tokens24h: metrics.ai.tokens_24h,
        cost30d: metrics.ai.cost_30d_usd,
        avgFeedback: metrics.feedback.avg_rating,
        feedbackTotal: metrics.feedback.total,
        referrals: metrics.referrals.total,
        referralConversion: metrics.referrals.conversion_rate,
        securityEvents24h: metrics.audit.security_events_24h,
      });
      setActiveUsers(activeList.records);
      setActiveTotal(activeList.total);
      setLastSync(new Date());
    } catch (e) {
      console.error("[admin-dashboard]", e);
      setLoadError(
        e instanceof Error ? e.message : "Nao foi possivel carregar os indicadores.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    load(false);
  }, [load]);

  const fmtMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

  const statusBadge = (r: SubscriberRecord) => {
    const map: Record<string, { label: string; cls: string }> = {
      active: { label: "Assinante", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
      trialing: { label: "Trial Stripe", cls: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
      past_due: { label: "Pagamento pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
      trial: { label: "Teste 7 dias", cls: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
      courtesy: { label: "Cortesia", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
      admin: { label: "Admin", cls: "bg-muted text-muted-foreground border-border" },
    };
    const s = map[r.effective_status] || { label: r.effective_status, cls: "bg-muted text-muted-foreground border-border" };
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${s.cls}`}>
        {s.label}
      </span>
    );
  };


  const cards = [
    { label: "Usuários totais", value: kpis?.totalUsers ?? "—", icon: Users, color: "text-blue-500" },
    { label: "Assinantes ativos", value: kpis?.activeSubs ?? "—", icon: TrendingUp, color: "text-emerald-500" },
    {
      label: "MRR",
      value: kpis ? fmtMoney(kpis.mrrCents, kpis.currency) : "—",
      icon: Wallet,
      color: "text-emerald-500",
    },
    {
      label: "ARR",
      value: kpis ? fmtMoney(kpis.arrCents, kpis.currency) : "—",
      icon: Wallet,
      color: "text-teal-500",
    },
    { label: "Total pagantes", value: kpis?.payingTotal ?? "—", icon: TrendingUp, color: "text-teal-500" },
    { label: "Acesso ativo (total)", value: kpis?.accessActive ?? "—", icon: Users, color: "text-emerald-500" },
    { label: "Em teste (7 dias)", value: kpis?.freeTrial ?? "—", icon: Gift, color: "text-indigo-500" },
    { label: "Cortesias ativas", value: kpis?.courtesyActive ?? "—", icon: Users, color: "text-purple-500" },

    { label: "Tickets em aberto", value: kpis?.openTickets ?? "—", icon: MessageSquare, color: "text-amber-500" },
    { label: "Tokens 24h", value: kpis ? kpis.tokens24h.toLocaleString("pt-BR") : "—", icon: Activity, color: "text-sky-500" },
    { label: "Custo IA (30d)", value: kpis ? `$${kpis.cost30d.toFixed(2)}` : "—", icon: DollarSign, color: "text-green-500" },
    {
      label: "Feedback médio",
      value: kpis && kpis.feedbackTotal ? `${kpis.avgFeedback.toFixed(2)} ★` : "—",
      icon: Star,
      color: "text-amber-500",
    },
    {
      label: "Indicações",
      value: !kpis
        ? "—"
        : kpis.referrals === 0
          ? "Sem indicações"
          : `${kpis.referrals} (${kpis.referralConversion ?? 0}%)`,
      icon: Gift,
      color: "text-pink-500",
    },
    {
      label: "Segurança 24h",
      value: kpis?.securityEvents24h ?? "—",
      icon: ShieldAlert,
      color: kpis && kpis.securityEvents24h > 0 ? "text-red-500" : "text-muted-foreground",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar os indicadores agora. Os números exibidos podem
          estar desatualizados ou incompletos. Detalhe técnico: {loadError}
        </div>
      )}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground mt-1">
            Retrato ao vivo da plataforma — assinaturas, IA, suporte, segurança.
            {lastSync && (
              <span className="ml-2 text-xs">
                · Atualizado {lastSync.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(false)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Recarregar Stripe
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-display font-semibold mt-2">
                  {loading ? <span className="animate-pulse text-muted-foreground">···</span> : c.value}
                </p>
              </div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b">
          <div>
            <h2 className="font-display text-lg font-semibold">Usuários com acesso ativo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pagantes, cortesias vigentes e testes de 7 dias — {activeTotal} no total
              {activeUsers.length < activeTotal && ` · exibindo os ${activeUsers.length} mais recentes`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/usuarios")}>
            Ver todos
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Usuário</th>
                <th className="text-left font-medium px-4 py-2">Situação</th>
                <th className="text-left font-medium px-4 py-2">Plano</th>
                <th className="text-right font-medium px-4 py-2">Mensal</th>
                <th className="text-left font-medium px-4 py-2">Renova / expira</th>
                <th className="text-left font-medium px-4 py-2">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground animate-pulse">
                    Sincronizando…
                  </td>
                </tr>
              )}
              {!loading && activeUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum usuário com acesso ativo.
                  </td>
                </tr>
              )}
              {!loading &&
                activeUsers.map((r) => (
                  <tr key={r.user_id || r.email} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <p className="font-medium truncate max-w-[220px]">{r.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[220px]">{r.email}</p>
                    </td>
                    <td className="px-4 py-2">{statusBadge(r)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[220px] truncate">
                      {r.plan_label || (r.in_trial ? "Teste de 7 dias" : r.courtesy?.active ? "Cortesia" : "—")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.monthly_amount_cents
                        ? fmtMoney(r.monthly_amount_cents, r.currency || "brl")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {fmtDate(r.subscription_end || r.trial_ends_at || r.courtesy?.expires_at || null)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(r.last_sign_in_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DashboardTrends />

    </div>
  );
}
