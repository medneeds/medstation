import { useCallback, useEffect, useState } from "react";
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
import type { AdminMetrics, SubscribersResponse } from "./types";
import DashboardTrends from "./DashboardTrends";

interface KPIs {
  totalUsers: number;
  activeSubs: number;
  payingTotal: number;
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
  referralConversion: number;
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
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async (forceStripeReload = false) => {
    if (forceStripeReload) setRefreshing(true);
    else setLoading(true);
    try {
      const [subs, metrics] = await Promise.all([
        invokeAdmin<SubscribersResponse>(
          "admin-list-subscribers",
          `?page=1&perPage=1&status=all${forceStripeReload ? "&refresh=true" : ""}`,
        ),
        invokeAdmin<AdminMetrics>("admin-metrics"),
      ]);

      setKpis({
        totalUsers: subs.stats.total_users,
        activeSubs: subs.stats.active,
        payingTotal: subs.stats.paying_total,
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
      setLastSync(new Date());
    } catch (e) {
      console.error("[admin-dashboard]", e);
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
      value: kpis ? `${kpis.referrals} (${kpis.referralConversion}%)` : "—",
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

      <DashboardTrends />
    </div>
  );
}
