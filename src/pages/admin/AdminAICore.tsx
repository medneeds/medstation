import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Activity, ArrowUpRight, BrainCircuit, CheckCircle2, CircleDashed, Database, GitBranch, Layers3, RefreshCw, ShieldCheck, Workflow, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AI_CORE_CAPABILITIES, AI_CORE_MODEL_ROUTES } from "@/lib/aiCoreInventory";

type UsageSummary = {
  kpis?: { total_calls?: number; total_tokens?: number; total_cost_usd?: number };
  by_model?: Array<{ model: string; calls: number; tokens: number; cost: number }>;
  recent?: Array<{ cost_usd: number | null; model: string | null }>;
};

const stageLabel = {
  implemented: "No código",
  tested: "Teste aprovado",
  pending: "Pendente",
} as const;

export default function AdminAICore() {
  const [days, setDays] = useState<7 | 30>(7);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-usage", {
        body: { days },
      });
      if (error) throw error;
      setSummary(data as UsageSummary);
    } catch {
      setSummary(null);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void refresh(); }, [refresh]);

  const byModel = useMemo(
    () => [...(summary?.by_model ?? [])].sort((a, b) => b.calls - a.calls).slice(0, 8),
    [summary],
  );

  const formatInt = (v: number) => v.toLocaleString("pt-BR");
  const codeReady = AI_CORE_CAPABILITIES.filter(x => x.stage !== "pending").length;
  const pending = AI_CORE_CAPABILITIES.filter(x => x.stage === "pending").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary"><BrainCircuit className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Arquitetura de IA</span></div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">AI Core & Hermes</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Inventário técnico da versão em desenvolvimento e métricas agregadas do backend conectado.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Somente leitura</Badge>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <strong>Atenção:</strong> este painel não confirma deploy ou disponibilidade em tempo real do Hermes.
        Uma execução MCP com o Hermes oficial foi validada em CI, mas nenhum agente de inferência clínica é ativado por esta página.
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Componentes documentados</span><Layers3 className="h-4 w-4 text-muted-foreground" /></div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{AI_CORE_CAPABILITIES.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">Inventário estático do código</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Implementados ou testados</span><CheckCircle2 className="h-4 w-4 text-primary" /></div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{codeReady}</div>
          <p className="mt-1 text-xs text-muted-foreground">Não equivale a serviços em produção</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Etapas pendentes</span><CircleDashed className="h-4 w-4 text-muted-foreground" /></div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{pending}</div>
          <p className="mt-1 text-xs text-muted-foreground">Sem ativação clínica automática</p>
        </Card>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Workflow className="h-4 w-4 text-primary" /> Orquestração planejada</h3>
          <div className="space-y-2 text-sm">
            <div className="rounded-md border bg-muted/40 p-3 text-center font-medium">Solicitação clínica (futura)</div>
            <div className="text-center text-muted-foreground" aria-hidden>↓</div>
            <div className="rounded-md border border-primary/30 p-3 text-center"><strong>Hermes / AI Core</strong><p className="mt-1 text-xs text-muted-foreground">Planejamento e regras de autorização</p></div>
            <div className="text-center text-muted-foreground" aria-hidden>↓</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-3 text-center"><strong>Clínicus</strong><p className="text-xs text-muted-foreground">Rascunho de admissão</p></div>
              <div className="rounded-md border p-3 text-center"><strong>Examinus</strong><p className="text-xs text-muted-foreground">Análise laboratorial</p></div>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">Fluxo apenas simulado. Nenhuma execução clínica real demonstrada.</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><GitBranch className="h-4 w-4 text-primary" /> Situação dos componentes</h3>
          <div className="space-y-3">
            {AI_CORE_CAPABILITIES.map(item => (
              <div key={item.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2.5 last:border-none">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {item.stage === "pending" ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {stageLabel[item.stage]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="p-4 sm:p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-primary" /> Rotas de modelos identificadas no código</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr><th className="pb-3 font-medium">Função</th><th className="pb-3 font-medium">Modelo mapeado</th><th className="pb-3 font-medium">Observação</th></tr>
            </thead>
            <tbody>
              {AI_CORE_MODEL_ROUTES.map(row => (
                <tr key={row.purpose} className="border-b border-border/60 last:border-none">
                  <td className="py-3 font-medium">{row.purpose}</td>
                  <td className="py-3 font-mono text-xs">{row.model}</td>
                  <td className="py-3 text-xs text-muted-foreground">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> Utilização de IA no backend conectado</h3>
            <p className="mt-1 text-xs text-muted-foreground">Dados agregados existentes; não medem chamadas do Hermes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={days === 7 ? "secondary" : "outline"} size="sm" onClick={() => setDays(7)}>7 dias</Button>
            <Button variant={days === 30 ? "secondary" : "outline"} size="sm" onClick={() => setDays(30)}>30 dias</Button>
            <Button variant="outline" size="icon" aria-label="Atualizar uso de IA" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
        {fetchError ? (
          <p className="mt-4 rounded-md border border-destructive/30 p-3 text-sm text-muted-foreground" role="status">Não foi possível carregar as métricas do backend. Os estados do inventário acima continuam sendo apenas dados do código.</p>
        ) : loading && !summary ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">Consultando métricas...</p>
        ) : summary ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm">Chamadas registradas: <strong className="tabular-nums">{formatInt(summary.kpis?.total_calls ?? 0)}</strong></p>
            <div className="space-y-2">
              {byModel.map(row => (
                <div key={row.model} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-mono">{row.model}</span>
                  <span className="shrink-0 tabular-nums">{formatInt(row.calls)} chamadas</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">O total financeiro do backend pode subestimar custos de modelos sem tarifa conhecida. Não interprete custo desconhecido como US$ 0.</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Sem métricas disponíveis.</p>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><RouterLink to="/admin/uso-ia"><Activity className="mr-2 h-4 w-4" /> Uso de IA detalhado</RouterLink></Button>
        <Button variant="outline" asChild><a href="https://github.com/medneeds/medstation/pull/20" target="_blank" rel="noreferrer"><ArrowUpRight className="mr-2 h-4 w-4" /> Revisão técnica no GitHub</a></Button>
      </div>
      <p className="text-xs text-muted-foreground">Ações de implantação, alteração de modelos e ferramentas clínicas não estão disponíveis neste painel.</p>
    </div>
  );
}
