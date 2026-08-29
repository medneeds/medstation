import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, Loader2, RefreshCw } from "lucide-react";

/**
 * Métricas de produto vindas do BANCO (fonte da verdade), não de eventos de
 * navegador. Usada no painel de funil para separar o que é medido de verdade
 * do que depende de rastreamento no cliente.
 */

interface ProductMetrics {
  configured: boolean;
  error?: string;
  window?: { days: number; from: string };
  generatedAt?: string;
  acquisition?: {
    signupsWindow: number;
    signupsTotal: number;
    signupsByProvider: Record<string, number>;
    authProviderCoverage: number;
  };
  activation?: {
    activatedUsersWindow: number;
    cohortSignups: number;
    cohortActivated: number;
    cohortActivationRate: number | null;
    zeroActionSignups: number;
    timeToFirstValue: {
      users: number;
      medianMinutes: number | null;
      p75Minutes: number | null;
      p90Minutes: number | null;
      under10Minutes: number;
      under10Percent: number | null;
    };
    under10ByProvider: Record<string, number>;
    firstTool: { tool: string; users: number }[];
  };
  usage?: {
    actionsTotal: number;
    uniqueUsers: number;
    retention: {
      usersWithActivity: number;
      twoPlusDays: number;
      threePlusDays: number;
      sevenPlusDays: number;
    };
    byTool: { tool: string; actions: number; users: number }[];
  };
  trials?: { activeNow: number; startedWindow: number; totalRecords: number };
  onboarding?: { rows: number; completed: number };
}

const TOOL_LABEL: Record<string, string> = {
  examinus: "Examinus",
  clinicus: "Clínicus",
  prescriptus: "Prescriptus",
  gasometrus: "Gasometrus",
  codexus: "Codexus",
  mediscuss: "Mediscuss",
  legalis: "Legalis",
  protocolus: "Protocolus",
  atestus: "Atestus",
  orientus: "Orientus",
  numerus: "Numerus",
  scorius: "Scorius",
  consultorio: "Modo Consultório",
  modo_rotineiro: "Modo Rotineiro",
  medical_document: "Documentos médicos",
  ocr: "Leitura de documentos",
  suporte: "Suporte",
  "guia-publico": "Guia público",
  "carpe-diem": "Modo Rotineiro",
};

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  email: "E-mail / link de acesso",
  desconhecido: "Não identificado",
};

const nf = (n: number) => n.toLocaleString("pt-BR");
const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "Sem dados" : `${v.toLocaleString("pt-BR")}%`;
const min = (v: number | null | undefined) =>
  v === null || v === undefined ? "Sem dados" : `${v.toLocaleString("pt-BR")} min`;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-display font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default function ProductMetricsPanel({ days }: { days: number }) {
  const [data, setData] = useState<ProductMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        `admin-posthog?view=product&days=${days}`,
        { method: "GET" },
      );
      if (error) throw error;
      if ((res as ProductMetrics)?.error) throw new Error((res as ProductMetrics).error);
      setData(res as ProductMetrics);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const a = data?.acquisition;
  const act = data?.activation;
  const use = data?.usage;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Produto — medido no banco
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastros, ativação, uso e retenção calculados sobre os registros da plataforma.
            Independe de rastreamento no navegador. Janela: últimos {days} dias.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {err && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Fonte indisponível — nenhum número exibido</p>
            <p className="text-muted-foreground text-xs mt-1 break-all">{err}</p>
          </div>
        </Card>
      )}

      {loading && !data && (
        <div className="h-40 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && a && act && use && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Cadastros no período"
              value={nf(a.signupsWindow)}
              hint={`${nf(a.signupsTotal)} desde o início`}
            />
            <Kpi
              label="Ativados na coorte"
              value={nf(act.cohortActivated)}
              hint={`Taxa: ${pct(act.cohortActivationRate)} de ${nf(act.cohortSignups)} cadastros`}
            />
            <Kpi
              label="Cadastros sem nenhuma ação"
              value={nf(act.zeroActionSignups)}
              hint="Criaram conta e nunca usaram um assistente."
            />
            <Kpi
              label="Usuários ativos no período"
              value={nf(use.uniqueUsers)}
              hint={`${nf(use.actionsTotal)} ações úteis registradas`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Mediana até o 1º valor"
              value={min(act.timeToFirstValue.medianMinutes)}
              hint={`${nf(act.timeToFirstValue.users)} usuário(s) da coorte`}
            />
            <Kpi label="P75" value={min(act.timeToFirstValue.p75Minutes)} />
            <Kpi label="P90" value={min(act.timeToFirstValue.p90Minutes)} />
            <Kpi
              label="Até 10 minutos"
              value={pct(act.timeToFirstValue.under10Percent)}
              hint={`${nf(act.timeToFirstValue.under10Minutes)} usuário(s)`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-medium mb-3">Método de cadastro</h3>
              <ul className="space-y-2">
                {Object.entries(a.signupsByProvider).map(([k, v]) => (
                  <li key={k} className="flex items-baseline justify-between gap-3 text-xs">
                    <span>{PROVIDER_LABEL[k] ?? k}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {nf(v)} cadastro(s) · {nf(act.under10ByProvider[k] ?? 0)} ativado(s) em ≤10 min
                    </span>
                  </li>
                ))}
                {!Object.keys(a.signupsByProvider).length && (
                  <li className="text-xs text-muted-foreground">Sem cadastros no período.</li>
                )}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium mb-3">Recorrência de uso no período</h3>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between">
                  <span>Usuários com atividade</span>
                  <span className="tabular-nums">{nf(use.retention.usersWithActivity)}</span>
                </li>
                <li className="flex justify-between">
                  <span>2 ou mais dias distintos</span>
                  <span className="tabular-nums">{nf(use.retention.twoPlusDays)}</span>
                </li>
                <li className="flex justify-between">
                  <span>3 ou mais dias distintos</span>
                  <span className="tabular-nums">{nf(use.retention.threePlusDays)}</span>
                </li>
                <li className="flex justify-between">
                  <span>7 ou mais dias distintos</span>
                  <span className="tabular-nums">{nf(use.retention.sevenPlusDays)}</span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Contagem de dias distintos com ação útil. Retenção D1/D3/D7 por coorte ainda não é
                calculada — depende de histórico maior de uso.
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-medium mb-3">Ferramentas mais usadas</h3>
            <div className="space-y-2">
              {use.byTool.slice(0, 12).map((t) => (
                <div key={t.tool} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate">{TOOL_LABEL[t.tool] ?? t.tool}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {nf(t.users)} usuário(s) · {nf(t.actions)} ações
                  </span>
                </div>
              ))}
              {!use.byTool.length && (
                <p className="text-xs text-muted-foreground">Nenhuma ação registrada no período.</p>
              )}
            </div>
            {!!act.firstTool.length && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Primeira ferramenta usada pela coorte:{" "}
                {act.firstTool
                  .map((f) => `${TOOL_LABEL[f.tool] ?? f.tool} (${nf(f.users)})`)
                  .join(" · ")}
              </p>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
