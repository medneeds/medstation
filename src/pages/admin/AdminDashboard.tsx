import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  Activity,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Wallet,
} from "lucide-react";

interface KPIs {
  totalUsers: number;
  activeSubs: number;
  payingTotal: number;
  mrrCents: number;
  currency: string;
  courtesy: number;
  openTickets: number;
  tokens24h: number;
  cost30d: number;
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
      const [tickets, tokens, cost, courtesy] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "assigned"]),
        supabase
          .from("ai_usage_logs")
          .select("total_tokens")
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase
          .from("ai_usage_logs")
          .select("cost_usd")
          .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("courtesy_access").select("id", { count: "exact", head: true }),
      ]);

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-list-subscribers?page=1&perPage=1&status=all${forceStripeReload ? "&refresh=true" : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const subData = await res.json().catch(() => null);

      setKpis({
        totalUsers: subData?.stats?.total_users ?? 0,
        activeSubs: subData?.stats?.active ?? 0,
        payingTotal: subData?.stats?.paying_total ?? 0,
        mrrCents: subData?.stats?.mrr_cents ?? 0,
        currency: subData?.stats?.currency ?? "brl",
        courtesy: courtesy.count ?? 0,
        openTickets: tickets.count ?? 0,
        tokens24h: (tokens.data ?? []).reduce((a: number, r: any) => a + (r.total_tokens || 0), 0),
        cost30d: (cost.data ?? []).reduce((a: number, r: any) => a + Number(r.cost_usd || 0), 0),
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
      label: "Total pagantes",
      value: kpis?.payingTotal ?? "—",
      icon: TrendingUp,
      color: "text-teal-500",
    },
    { label: "Cortesias ativas", value: kpis?.courtesy ?? "—", icon: Users, color: "text-purple-500" },
    { label: "Tickets abertos", value: kpis?.openTickets ?? "—", icon: MessageSquare, color: "text-amber-500" },
    { label: "Tokens 24h", value: kpis ? kpis.tokens24h.toLocaleString("pt-BR") : "—", icon: Activity, color: "text-sky-500" },
    { label: "Custo IA (30d)", value: kpis ? `$${kpis.cost30d.toFixed(2)}` : "—", icon: DollarSign, color: "text-green-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral operacional da plataforma.
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

      <Card className="p-5 border-dashed">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">Instrumentação de IA em progresso.</strong> Os cards de tokens e custo só refletem chamadas feitas após ativação do logger nas edge functions.
          </div>
        </div>
      </Card>
    </div>
  );
}
