import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { RefreshCw, Download, Mail, CheckCircle2, XCircle, ShieldOff, Search } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const RANGES = [
  { key: "24h", label: "24 horas", hours: 24 },
  { key: "7d", label: "7 dias", hours: 24 * 7 },
  { key: "30d", label: "30 dias", hours: 24 * 30 },
  { key: "all", label: "Tudo", hours: 24 * 365 * 5 },
];

const PAGE_SIZE = 50;

const STATUS_META: Record<string, { label: string; className: string }> = {
  sent: { label: "Enviado", className: "bg-primary/15 text-primary border-primary/30" },
  pending: { label: "Na fila", className: "bg-muted text-muted-foreground border-border" },
  dlq: { label: "Falhou", className: "bg-destructive/15 text-destructive border-destructive/30" },
  failed: { label: "Falhou", className: "bg-destructive/15 text-destructive border-destructive/30" },
  bounced: { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  complained: { label: "Spam", className: "bg-destructive/15 text-destructive border-destructive/30" },
  suppressed: { label: "Bloqueado", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};

export default function AdminEmails() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [suppressed, setSuppressed] = useState<{ email: string; reason: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [template, setTemplate] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const since = useMemo(() => {
    const hours = RANGES.find((r) => r.key === range)?.hours ?? 168;
    return new Date(Date.now() - hours * 3600 * 1000).toISOString();
  }, [range]);

  const load = async () => {
    setLoading(true);
    const [logRes, supRes] = await Promise.all([
      supabase
        .from("email_send_log")
        .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase
        .from("suppressed_emails")
        .select("email,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (logRes.error) toast.error("Não foi possível carregar os envios.");
    setRows((logRes.data as LogRow[]) ?? []);
    setSuppressed(supRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [since]);
  useEffect(() => { setPage(0); }, [template, status, query, range]);

  // Dedup: keep only the latest row per message_id (rows already sorted desc)
  const unique = useMemo(() => {
    const seen = new Set<string>();
    const out: LogRow[] = [];
    for (const r of rows) {
      const key = r.message_id ?? `id:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, [rows]);

  const templates = useMemo(
    () => Array.from(new Set(unique.map((r) => r.template_name))).sort(),
    [unique],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unique.filter((r) => {
      if (template !== "all" && r.template_name !== template) return false;
      if (status !== "all") {
        if (status === "failed" && !["dlq", "failed", "bounced", "complained"].includes(r.status)) return false;
        if (status !== "failed" && r.status !== status) return false;
      }
      if (q && !r.recipient_email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [unique, template, status, query]);

  const stats = useMemo(() => {
    const base = unique.filter((r) => (template === "all" ? true : r.template_name === template));
    const count = (fn: (r: LogRow) => boolean) => base.filter(fn).length;
    return {
      total: base.length,
      sent: count((r) => r.status === "sent"),
      failed: count((r) => ["dlq", "failed", "bounced", "complained"].includes(r.status)),
      suppressed: count((r) => r.status === "suppressed"),
    };
  }, [unique, template]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const exportCsv = () => {
    const header = "data,template,destinatario,status,erro\n";
    const body = filtered
      .map((r) =>
        [
          new Date(r.created_at).toISOString(),
          r.template_name,
          r.recipient_email,
          r.status,
          (r.error_message ?? "").replace(/[",\n]/g, " "),
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `emails-${range}.csv`;
    a.click();
  };

  const kpis = [
    { label: "E-mails", value: stats.total, icon: Mail, tone: "text-foreground" },
    { label: "Entregues", value: stats.sent, icon: CheckCircle2, tone: "text-primary" },
    { label: "Falhas", value: stats.failed, icon: XCircle, tone: "text-destructive" },
    { label: "Bloqueados", value: stats.suppressed, icon: ShieldOff, tone: "text-amber-600" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                range === r.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="pending">Na fila</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="suppressed">Bloqueados</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar e-mail…"
            className="pl-8 h-9"
          />
        </div>

        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-3.5 w-3.5 mr-2" /> CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => {
              const meta = STATUS_META[r.status] ?? {
                label: r.status,
                className: "bg-muted text-muted-foreground border-border",
              };
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.template_name}</TableCell>
                  <TableCell className="text-sm">{r.recipient_email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    {r.error_message && (
                      <p className="text-[11px] text-destructive mt-1 max-w-sm truncate">{r.error_message}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              );
            })}
            {!pageRows.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                  {loading ? "Carregando…" : "Nenhum e-mail neste período."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Página {page + 1} de {pages} · {filtered.length} e-mails
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bloqueados */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-1">Endereços bloqueados</h2>
        <p className="text-xs text-muted-foreground mb-4">
          E-mails que não recebem mais mensagens (rejeições, spam ou cancelamento).
        </p>
        {suppressed.length ? (
          <div className="space-y-1.5 max-h-64 overflow-auto">
            {suppressed.map((s) => (
              <div key={s.email} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5">
                <span>{s.email}</span>
                <span className="text-xs text-muted-foreground">
                  {s.reason} · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum endereço bloqueado.</p>
        )}
      </Card>
    </div>
  );
}
