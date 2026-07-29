import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, MessageSquare, Activity, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

interface KPIs {
  totalUsers: number;
  activeSubs: number;
  courtesy: number;
  openTickets: number;
  tokens24h: number;
  cost30d: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tickets, tokens, cost, courtesy] = await Promise.all([
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "assigned"]),
          supabase.from("ai_usage_logs").select("total_tokens").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
          supabase.from("ai_usage_logs").select("cost_usd").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
          supabase.from("courtesy_access").select("id", { count: "exact", head: true }),
        ]);

        // For total users + active subs, call admin-list-subscribers to leverage aggregated stats
        const { data: subData } = await supabase.functions.invoke("admin-list-subscribers", {
          body: null,
        }).catch(() => ({ data: null }));

        setKpis({
          totalUsers: subData?.stats?.total ?? 0,
          activeSubs: subData?.stats?.active ?? 0,
          courtesy: courtesy.count ?? 0,
          openTickets: tickets.count ?? 0,
          tokens24h: (tokens.data ?? []).reduce((a: number, r: any) => a + (r.total_tokens || 0), 0),
          cost30d: (cost.data ?? []).reduce((a: number, r: any) => a + Number(r.cost_usd || 0), 0),
        });
      } catch (e) {
        console.error("[admin-dashboard]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: "Usuários totais", value: kpis?.totalUsers ?? "—", icon: Users, color: "text-blue-500" },
    { label: "Assinantes ativos", value: kpis?.activeSubs ?? "—", icon: TrendingUp, color: "text-emerald-500" },
    { label: "Cortesias ativas", value: kpis?.courtesy ?? "—", icon: Users, color: "text-purple-500" },
    { label: "Tickets abertos", value: kpis?.openTickets ?? "—", icon: MessageSquare, color: "text-amber-500" },
    { label: "Tokens 24h", value: kpis ? kpis.tokens24h.toLocaleString("pt-BR") : "—", icon: Activity, color: "text-sky-500" },
    { label: "Custo IA (30d)", value: kpis ? `$${kpis.cost30d.toFixed(2)}` : "—", icon: DollarSign, color: "text-green-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-display font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral operacional da plataforma.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
