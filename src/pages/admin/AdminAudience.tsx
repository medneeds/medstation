import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, RefreshCw, Loader2, Users2, Filter } from "lucide-react";
import type { SubscriberRecord } from "./types";

const STATUS_OPTIONS = [
  { key: "active", label: "Ativos", hint: "Assinatura paga em dia" },
  { key: "trialing", label: "Em teste", hint: "Período de avaliação" },
  { key: "past_due", label: "Pagamento pendente", hint: "Cobrança falhou" },
  { key: "canceled", label: "Cancelados", hint: "Assinatura encerrada" },
  { key: "none", label: "Leads (sem assinatura)", hint: "Cadastro sem pagamento" },
  { key: "courtesy", label: "Cortesia", hint: "Acesso concedido" },
  { key: "admin", label: "Administradores", hint: "Equipe interna" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  trialing: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  past_due: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  canceled: "bg-red-500/10 text-red-600 border-red-500/20",
  none: "bg-muted text-muted-foreground border-border",
  courtesy: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin: "bg-primary/10 text-primary border-primary/20",
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.key, s.label]),
);

function bucketOf(r: SubscriberRecord): string {
  if (r.is_admin) return "admin";
  if (r.courtesy?.active) return "courtesy";
  return r.stripe_status || "none";
}

export default function AdminAudience() {
  const [records, setRecords] = useState<SubscriberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["active"]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyWithEmail, setOnlyWithEmail] = useState(true);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", perPage: "10000", status: "all" });
      if (refresh) params.set("refresh", "true");
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-subscribers?${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data.records || []);
    } catch (e: any) {
      toast.error(`Erro ao carregar audiência: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of records) {
      const b = bucketOf(r);
      c[b] = (c[b] || 0) + 1;
    }
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(`${to}T23:59:59`) : null;
    return records.filter((r) => {
      if (selectedStatuses.length && !selectedStatuses.includes(bucketOf(r))) return false;
      if (onlyWithEmail && !r.email) return false;
      if (term && !(`${r.email || ""} ${r.full_name || ""}`.toLowerCase().includes(term))) return false;
      const ref = r.created_at || r.subscription_created;
      if (fromDate || toDate) {
        if (!ref) return false;
        const d = new Date(ref);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
      }
      return true;
    });
  }, [records, selectedStatuses, search, from, to, onlyWithEmail]);

  const toggleStatus = (key: string) =>
    setSelectedStatuses((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );

  const exportCsv = () => {
    if (!filtered.length) { toast.error("Nenhum contato no filtro atual."); return; }
    const headers = [
      "email", "nome", "primeiro_nome", "especialidade", "status",
      "cadastro", "ultimo_acesso", "fim_assinatura", "valor_mensal_brl",
    ];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((r) => [
      r.email || "",
      r.full_name || "",
      (r.full_name || "").split(" ")[0] || "",
      r.specialty || "",
      STATUS_LABEL[bucketOf(r)] || bucketOf(r),
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
      r.last_sign_in_at ? new Date(r.last_sign_in_at).toISOString().slice(0, 10) : "",
      r.subscription_end ? new Date(r.subscription_end).toISOString().slice(0, 10) : "",
      ((r.monthly_amount_cents || 0) / 100).toFixed(2),
    ].map(esc).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audiencia-medstation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${filtered.length} contatos exportados.`);
  };

  const copyEmails = async () => {
    const emails = filtered.map((r) => r.email).filter(Boolean).join(", ");
    if (!emails) { toast.error("Nenhum e-mail no filtro atual."); return; }
    await navigator.clipboard.writeText(emails);
    toast.success("E-mails copiados.");
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Segmente sua base por status e período e exporte a lista pronta para sua ferramenta de campanhas.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Atualizar</span>
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={loading}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-primary" /> Segmentação
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_OPTIONS.map((s) => {
            const checked = selectedStatuses.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleStatus(s.key)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {s.label}
                    <Badge variant="outline" className={STATUS_COLORS[s.key]}>{counts[s.key] || 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.hint}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Buscar</Label>
            <Input placeholder="Nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cadastro de</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cadastro até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={onlyWithEmail} onCheckedChange={(v) => setOnlyWithEmail(!!v)} />
              Somente com e-mail válido
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-2 text-sm">
            <Users2 className="h-4 w-4 text-primary" />
            <span className="font-semibold">{filtered.length}</span>
            <span className="text-muted-foreground">contatos no segmento atual</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedStatuses([]); setSearch(""); setFrom(""); setTo(""); }}>
              Limpar filtros
            </Button>
            <Button variant="outline" size="sm" onClick={copyEmails}>Copiar e-mails</Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-medium">Prévia (primeiros 50)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Nome</th>
                <th className="text-left font-medium px-4 py-2">E-mail</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-left font-medium px-4 py-2">Especialidade</th>
                <th className="text-left font-medium px-4 py-2">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((r, i) => {
                const b = bucketOf(r);
                return (
                  <tr key={`${r.user_id || r.email}-${i}`} className="border-t">
                    <td className="px-4 py-2">{r.full_name || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.email || "—"}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={STATUS_COLORS[b]}>{STATUS_LABEL[b] || b}</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.specialty || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum contato encontrado com os filtros atuais.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
