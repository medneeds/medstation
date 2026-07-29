import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminBilling() {
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-subscribers?perPage=100&status=active`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setStats(data.stats);
      setRecords(data.records || []);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const csv = [
      "email,nome,status,fim_assinatura,stripe_customer_id",
      ...records.map((r) => `${r.email},${r.full_name || ""},${r.effective_status},${r.subscription_end || ""},${r.stripe_customer_id || ""}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assinantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Faturamento</h1>
          <p className="text-sm text-muted-foreground">Assinaturas ativas e métricas Stripe</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!records.length}>Exportar CSV</Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Ativos</div><div className="text-2xl font-display font-semibold mt-1">{stats?.active ?? "—"}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Trial</div><div className="text-2xl font-display font-semibold mt-1">{stats?.trialing ?? "—"}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Em atraso</div><div className="text-2xl font-display font-semibold mt-1 text-amber-600">{stats?.past_due ?? "—"}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Cancelados</div><div className="text-2xl font-display font-semibold mt-1 text-red-600">{stats?.canceled ?? "—"}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Renovação</th>
                <th className="text-left px-4 py-2">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>}
              {records.map((r) => (
                <tr key={r.user_id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-4 py-2">{r.full_name || "—"}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.effective_status}</Badge></td>
                  <td className="px-4 py-2 text-xs">{r.subscription_end ? new Date(r.subscription_end).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-2">
                    {r.stripe_customer_id && (
                      <a href={`https://dashboard.stripe.com/customers/${r.stripe_customer_id}`} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1 hover:underline">
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
