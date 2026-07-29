import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, RefreshCw, Download } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface UsageResponse {
  window: { days: number; from: string };
  kpis: {
    total_cost_usd: number;
    total_tokens: number;
    total_calls: number;
    error_rate: number;
    avg_latency_ms: number;
  };
  by_provider: { provider: string; cost: number; tokens: number; calls: number }[];
  by_assistant: { assistant: string; cost: number; tokens: number; calls: number }[];
  by_model: { model: string; cost: number; tokens: number; calls: number }[];
  top_users: { user_id: string; name: string; cost: number; tokens: number; calls: number }[];
  time_series: { date: string; cost: number; tokens: number; calls: number }[];
  recent: Array<{
    created_at: string;
    user_id: string | null;
    assistant: string | null;
    function_name: string;
    model: string | null;
    total_tokens: number | null;
    cost_usd: number | null;
    latency_ms: number | null;
    status: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}

const PROVIDER_LABEL: Record<string, string> = {
  lovable_ai: "Lovable AI",
  openai: "OpenAI direto",
  elevenlabs: "ElevenLabs",
  unknown: "—",
};

const fmtUSD = (v: number) => `$${(v || 0).toFixed(v < 1 ? 4 : 2)}`;
const fmtInt = (v: number) => (v || 0).toLocaleString("pt-BR");

export default function AdminAIUsage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [provider, setProvider] = useState<string>("all");
  const [assistant, setAssistant] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-ai-usage", {
        body: {
          days: parseInt(days, 10),
          provider: provider === "all" ? null : provider,
          assistant: assistant === "all" ? null : assistant,
        },
      });
      if (error) throw error;
      setData(res as UsageResponse);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days, provider, assistant]);

  useEffect(() => { load(); }, [load]);

  const assistants = useMemo(
    () => Array.from(new Set((data?.by_assistant ?? []).map((a) => a.assistant))).filter(Boolean),
    [data],
  );

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["timestamp", "user_id", "assistant", "function", "model", "provider", "tokens", "cost_usd", "latency_ms", "status"],
      ...data.recent.map((r) => [
        r.created_at,
        r.user_id ?? "",
        r.assistant ?? "",
        r.function_name,
        r.model ?? "",
        (r.metadata as { provider?: string } | null)?.provider ?? "",
        String(r.total_tokens ?? 0),
        String(r.cost_usd ?? 0),
        String(r.latency_ms ?? ""),
        r.status ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uso-ia-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Uso de IA</h1>
          <p className="text-sm text-muted-foreground">
            Custos, tokens e latência por período, provider, assistente e usuário
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 horas</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">180 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos providers</SelectItem>
              <SelectItem value="lovable_ai">Lovable AI</SelectItem>
              <SelectItem value="openai">OpenAI direto</SelectItem>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assistant} onValueChange={setAssistant}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Assistente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos assistentes</SelectItem>
              {assistants.map((a) => (
                <SelectItem key={a as string} value={a as string}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Custo</div>
          <div className="text-2xl font-display font-semibold mt-1">{data ? fmtUSD(data.kpis.total_cost_usd) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Chamadas</div>
          <div className="text-2xl font-display font-semibold mt-1">{data ? fmtInt(data.kpis.total_calls) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Tokens</div>
          <div className="text-2xl font-display font-semibold mt-1">{data ? fmtInt(data.kpis.total_tokens) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Latência média</div>
          <div className="text-2xl font-display font-semibold mt-1">{data ? `${data.kpis.avg_latency_ms} ms` : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Taxa de erro</div>
          <div className="text-2xl font-display font-semibold mt-1">
            {data ? `${(data.kpis.error_rate * 100).toFixed(1)}%` : "—"}
          </div>
        </Card>
      </div>

      {loading && !data ? (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando métricas...
        </div>
      ) : !data || data.kpis.total_calls === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Sem dados no período selecionado.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Custo diário (USD)</h3>
              <Badge variant="secondary" className="text-[10px]">últimos {data.window.days}d</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.time_series}>
                  <defs>
                    <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtUSD(v)}
                  />
                  <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="url(#costFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-medium mb-3">Por provider</h3>
              <div className="space-y-2">
                {data.by_provider.sort((a, b) => b.cost - a.cost).map((p) => (
                  <div key={p.provider} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                    <span>{PROVIDER_LABEL[p.provider] ?? p.provider}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{fmtInt(p.calls)} calls</span>
                      <span className="text-foreground font-medium">{fmtUSD(p.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium mb-3">Por assistente</h3>
              <div className="space-y-2">
                {data.by_assistant.slice(0, 12).map((a) => (
                  <div key={a.assistant} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                    <span className="font-mono text-xs">{a.assistant}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{fmtInt(a.tokens)} tk</span>
                      <span className="text-foreground font-medium">{fmtUSD(a.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium mb-3">Por modelo</h3>
              <div className="space-y-2">
                {data.by_model.map((m) => (
                  <div key={m.model} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                    <span className="font-mono text-[11px] truncate max-w-[180px]" title={m.model}>{m.model}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{fmtInt(m.tokens)} tk</span>
                      <span className="text-foreground font-medium">{fmtUSD(m.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-medium mb-3">Top usuários por custo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                    <th className="py-2">Usuário</th>
                    <th className="py-2 text-right">Chamadas</th>
                    <th className="py-2 text-right">Tokens</th>
                    <th className="py-2 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_users.map((u) => (
                    <tr key={u.user_id} className="border-b border-border/30 last:border-0">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-right">{fmtInt(u.calls)}</td>
                      <td className="py-2 text-right">{fmtInt(u.tokens)}</td>
                      <td className="py-2 text-right font-medium">{fmtUSD(u.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
