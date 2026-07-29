import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Activity } from "lucide-react";

interface Row {
  assistant: string | null;
  function_name: string;
  model: string | null;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
  user_id: string | null;
}

export default function AdminAIUsage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - parseInt(range) * 86400000).toISOString();
      const { data } = await supabase
        .from("ai_usage_logs")
        .select("assistant, function_name, model, total_tokens, cost_usd, created_at, user_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      setRows(data || []);
      setLoading(false);
    })();
  }, [range]);

  const totalTokens = rows.reduce((a, r) => a + (r.total_tokens || 0), 0);
  const totalCost = rows.reduce((a, r) => a + Number(r.cost_usd || 0), 0);

  const byAssistant = rows.reduce<Record<string, { tokens: number; cost: number; calls: number }>>((acc, r) => {
    const k = r.assistant || r.function_name;
    if (!acc[k]) acc[k] = { tokens: 0, cost: 0, calls: 0 };
    acc[k].tokens += r.total_tokens || 0;
    acc[k].cost += Number(r.cost_usd || 0);
    acc[k].calls += 1;
    return acc;
  }, {});

  const byModel = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.model || "?";
    acc[k] = (acc[k] || 0) + (r.total_tokens || 0);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Uso de IA</h1>
          <p className="text-sm text-muted-foreground">Consumo de tokens e custo por assistente/modelo</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">24 horas</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Chamadas</div>
          <div className="text-3xl font-display font-semibold mt-2">{rows.length.toLocaleString("pt-BR")}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Tokens</div>
          <div className="text-3xl font-display font-semibold mt-2">{totalTokens.toLocaleString("pt-BR")}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Custo</div>
          <div className="text-3xl font-display font-semibold mt-2">${totalCost.toFixed(2)}</div>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...</div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum log de uso ainda. O logger precisa ser ativado nas edge functions.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-medium mb-3 text-sm">Por assistente / função</h3>
            <div className="space-y-2">
              {Object.entries(byAssistant).sort((a, b) => b[1].tokens - a[1].tokens).slice(0, 15).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                  <span className="font-mono text-xs">{k}</span>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{v.calls} calls</span>
                    <span>{v.tokens.toLocaleString("pt-BR")} tk</span>
                    <span className="text-foreground">${v.cost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium mb-3 text-sm">Por modelo</h3>
            <div className="space-y-2">
              {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                  <span className="font-mono text-xs">{k}</span>
                  <span className="text-xs text-muted-foreground">{v.toLocaleString("pt-BR")} tokens</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
