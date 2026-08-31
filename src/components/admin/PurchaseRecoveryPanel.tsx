import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Opportunity = {
  id: string;
  checkout_session_id: string;
  email: string | null;
  plan: string;
  amount_cents: number | null;
  status: string;
  payment_category: string;
  payment_method: string;
  recovery_status: string;
  acquisition_source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
  access_end: string | null;
  opportunity: string;
};

type Cards = {
  window_days: number;
  subscriptions_active: number | null;
  pix_monthly: {
    initiated: number;
    paid: number;
    pending: number;
    failed_or_expired: number;
    access_expired_without_repurchase: number;
    conversion_pct: number | null;
    revenue_cents: number;
  };
  annual_one_time: {
    initiated: number;
    paid: number;
    pending: number;
    failed_or_expired: number;
    conversion_pct: number | null;
    revenue_cents: number;
  };
};

const OPPORTUNITY_LABELS: Record<string, string> = {
  checkout_abandonado: "Checkout abandonado",
  pagamento_falhou: "Pagamento falhou",
  pix_mensal_expirado: "Pix mensal expirado",
  subscription_payment_failed: "Cartão recorrente com falha",
};

const RECOVERY_OPTIONS = [
  { value: "eligible", label: "Elegível" },
  { value: "contacted", label: "Contatado" },
  { value: "recovered", label: "Recuperado" },
  { value: "dismissed", label: "Descartado" },
];

const money = (cents: number | null | undefined, currency = "BRL") =>
  cents === null || cents === undefined
    ? "Indisponível"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);

const pct = (v: number | null) => (v === null ? "Indisponível" : `${v}%`);

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground mt-1">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}

export default function PurchaseRecoveryPanel({ days = 30 }: { days?: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Cards | null>(null);
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [subsFailed, setSubsFailed] = useState<Array<Record<string, unknown>>>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        `admin-purchase-recovery?days=${days}`,
        { method: "GET" },
      );
      if (fnError) throw fnError;
      setCards(data?.cards ?? null);
      setRows(data?.opportunities ?? []);
      setSubsFailed(data?.subscription_payment_failed ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar recuperação");
      setCards(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id: string, recovery_status: string) => {
    const { error: fnError } = await supabase.functions.invoke("admin-purchase-recovery", {
      body: { id, recovery_status },
    });
    if (fnError) {
      toast({ title: "Não foi possível atualizar", variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, recovery_status } : r)));
  };

  const filtered = useMemo(
    () => rows.filter((r) =>
      (categoryFilter === "all" || r.payment_category === categoryFilter) &&
      (statusFilter === "all" || r.opportunity === statusFilter)),
    [rows, categoryFilter, statusFilter],
  );

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-muted-foreground">{error}</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Compras avulsas e recuperação</h3>
          <p className="text-xs text-muted-foreground">
            Pix mensal (30 dias) e anual à vista. Receita avulsa nunca entra no MRR.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
        </Button>
      </div>

      {cards && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Assinaturas ativas" value={cards.subscriptions_active === null ? "Indisponível" : String(cards.subscriptions_active)} hint="Recorrente no cartão" />
          <Kpi label="Pix mensal iniciado" value={String(cards.pix_monthly.initiated)} hint="Checkouts criados" />
          <Kpi label="Pix mensal pago" value={String(cards.pix_monthly.paid)} hint={`Conversão ${pct(cards.pix_monthly.conversion_pct)}`} />
          <Kpi label="Pix mensal pendente" value={String(cards.pix_monthly.pending)} />
          <Kpi label="Pix mensal falhou/expirou" value={String(cards.pix_monthly.failed_or_expired)} />
          <Kpi label="Pix mensal vencido sem recompra" value={String(cards.pix_monthly.access_expired_without_repurchase)} />
          <Kpi label="Receita Pix mensal" value={money(cards.pix_monthly.revenue_cents)} hint="Fora do MRR" />
          <Kpi label="Receita anual à vista" value={money(cards.annual_one_time.revenue_cents)} hint={`Pago ${cards.annual_one_time.paid} / iniciado ${cards.annual_one_time.initiated}`} />
        </div>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Oportunidades de recuperação</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="pix_monthly_one_time">Pix mensal</SelectItem>
              <SelectItem value="annual_one_time">Anual à vista</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motivos</SelectItem>
              {Object.entries(OPPORTUNITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">Nenhuma oportunidade nesta janela.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Contato</th>
                  <th className="text-left px-3 py-2">Motivo</th>
                  <th className="text-left px-3 py-2">Plano</th>
                  <th className="text-right px-3 py-2">Valor</th>
                  <th className="text-left px-3 py-2">Origem</th>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Recuperação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-3 py-2 text-xs">{r.email || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {OPPORTUNITY_LABELS[r.opportunity] ?? r.opportunity}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.plan}</td>
                    <td className="px-3 py-2 text-xs text-right tabular-nums">{money(r.amount_cents)}</td>
                    <td className="px-3 py-2 text-xs">{r.utm_source || r.acquisition_source || "—"}</td>
                    <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2">
                      <Select value={r.recovery_status} onValueChange={(v) => void updateStatus(r.id, v)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_needed">Não necessário</SelectItem>
                          {RECOVERY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subsFailed.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {subsFailed.length} assinatura(s) recorrente(s) com pagamento em falha (past due).
          </p>
        )}
      </Card>
    </div>
  );
}
