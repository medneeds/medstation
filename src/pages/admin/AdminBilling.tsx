import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PurchaseRecoveryPanel from "@/components/admin/PurchaseRecoveryPanel";
import type { SubscriberRecord, SubscriberStats, FilteredSubscriberStats } from "./types";

type Record = SubscriberRecord;
type Stats = SubscriberStats;

const PRESETS = [
  { key: "all", label: "Sempre" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "ytd", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

function fmtMoney(cents: number, currency = "brl") {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

export default function AdminBilling() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [filteredStats, setFilteredStats] = useState<FilteredSubscriberStats | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [kpiScope, setKpiScope] = useState<"global" | "filter">("global");
  const [loadError, setLoadError] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (preset === "custom") return { from: customFrom, to: customTo };
    if (preset === "all") return { from: "", to: "" };
    const d = new Date(now);
    if (preset === "7d") d.setDate(d.getDate() - 7);
    else if (preset === "30d") d.setDate(d.getDate() - 30);
    else if (preset === "90d") d.setDate(d.getDate() - 90);
    else if (preset === "ytd") { d.setMonth(0); d.setDate(1); d.setHours(0,0,0,0); }
    return { from: d.toISOString(), to: now.toISOString() };
  }, [preset, customFrom, customTo]);

  const load = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({
        perPage: "500",
        status,
        ...(forceRefresh ? { refresh: "true" } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(search ? { search } : {}),
      });
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-subscribers?${params}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Falha ao carregar faturamento (${res.status})`);
      }
      setLoadError(null);
      setStats(data.stats);
      setFilteredStats(data.filteredStats ?? null);
      setRecords(data.records || []);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : "Falha ao carregar faturamento.");
      setStats(null);
      setFilteredStats(null);
      setRecords([]);
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, preset, customFrom, customTo]);

  const exportCSV = () => {
    const csv = [
      "email,nome,status,valor_mensal,moeda,intervalo,fim_assinatura,inicio_assinatura,stripe_customer_id,auth_missing",
      ...records.map((r) =>
        [
          r.email,
          (r.full_name || "").replace(/,/g, " "),
          r.effective_status,
          ((r.monthly_amount_cents || 0) / 100).toFixed(2),
          r.currency || "",
          r.interval || "",
          r.subscription_end || "",
          r.subscription_created || "",
          r.stripe_customer_id || "",
          r.auth_missing ? "1" : "0",
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturamento-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const currency = stats?.currency || "brl";
  const filterActive =
    status !== "all" || preset !== "all" || (!!search && search.trim().length > 0);
  const displayed = kpiScope === "filter" && filteredStats ? filteredStats : stats;
  const showFilterToggle = filterActive && !!filteredStats;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar os dados de faturamento. Nenhum número é exibido
          para evitar leitura incorreta. Detalhe técnico: {loadError}
        </div>
      )}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Assinaturas, MRR e cortesias — dados ao vivo do Stripe</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Recarregar Stripe
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!records.length}>
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Scope toggle: which KPIs to show */}
      {showFilterToggle && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">KPIs:</span>
          <Button
            size="sm"
            variant={kpiScope === "global" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setKpiScope("global")}
          >
            Globais
          </Button>
          <Button
            size="sm"
            variant={kpiScope === "filter" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setKpiScope("filter")}
          >
            Filtro atual
          </Button>
          <span className="text-muted-foreground ml-1">
            {kpiScope === "filter"
              ? "Os cards refletem apenas o recorte selecionado."
              : "Os cards mostram os totais globais, ignorando filtros."}
          </span>
        </div>
      )}

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">MRR</div>
          <div className="text-2xl font-display font-semibold mt-1">{displayed ? fmtMoney(displayed.mrr_cents, currency) : "—"}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Receita mensal recorrente</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">ARR</div>
          <div className="text-2xl font-display font-semibold mt-1">{displayed ? fmtMoney(displayed.arr_cents, currency) : "—"}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Projeção anualizada</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Ticket médio</div>
          <div className="text-2xl font-display font-semibold mt-1">{displayed ? fmtMoney(displayed.avg_ticket_cents, currency) : "—"}</div>
          <div className="text-[11px] text-muted-foreground mt-1">por assinatura ativa</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Assinantes pagantes</div>
          <div className="text-2xl font-display font-semibold mt-1">
            {displayed ? displayed.active + displayed.trialing + displayed.past_due : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {displayed?.active ?? 0} ativos · {displayed?.trialing ?? 0} trial · {displayed?.past_due ?? 0} atraso
          </div>
        </Card>
      </div>

      {/* Status pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Cancelados</div><div className="text-lg font-semibold mt-0.5 text-red-500">{displayed?.canceled ?? "—"}</div></Card>
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Cortesias</div><div className="text-lg font-semibold mt-0.5 text-emerald-500">{displayed?.courtesy ?? "—"}</div></Card>
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Admin</div><div className="text-lg font-semibold mt-0.5">{displayed?.admin ?? "—"}</div></Card>
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Total usuários</div><div className="text-lg font-semibold mt-0.5">{displayed?.total_users ?? "—"}</div></Card>
        <Card className="p-3 border-amber-500/30">
          <div className="text-[11px] uppercase text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" /> Sem conta
          </div>
          <div className="text-lg font-semibold mt-0.5 text-amber-500">{displayed?.auth_missing ?? "—"}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-muted-foreground">Buscar</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="email ou nome"
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="past_due">Em atraso</SelectItem>
              <SelectItem value="canceled">Cancelados</SelectItem>
              <SelectItem value="courtesy">Cortesias</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="none">Sem assinatura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Período</label>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {preset === "custom" && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" className="h-9" value={customFrom.slice(0, 10)} onChange={(e) => setCustomFrom(new Date(e.target.value).toISOString())} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" className="h-9" value={customTo.slice(0, 10)} onChange={(e) => setCustomTo(new Date(e.target.value).toISOString())} />
            </div>
          </>
        )}
        <Button size="sm" onClick={() => load()} disabled={loading}>Aplicar</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Valor / mês</th>
                <th className="text-left px-4 py-2">Início</th>
                <th className="text-left px-4 py-2">Renovação</th>
                <th className="text-left px-4 py-2">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                </td></tr>
              )}
              {!loading && records.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum registro no filtro atual.</td></tr>
              )}
              {records.map((r, i) => (
                <tr key={`${r.stripe_customer_id || r.user_id || r.email}-${i}`} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.email || "—"}
                    {r.auth_missing && (
                      <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-500/40">
                        sem conta
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">{r.full_name || "—"}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.effective_status}</Badge></td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.monthly_amount_cents ? fmtMoney(r.monthly_amount_cents, r.currency || currency) : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">{r.subscription_created ? new Date(r.subscription_created).toLocaleDateString("pt-BR") : "—"}</td>
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

      <PurchaseRecoveryPanel days={30} />
    </div>
  );
}
