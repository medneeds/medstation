import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DistributionItem, OnboardingInsights } from "@/lib/onboardingInsights";

const PAIN_LABEL: Record<string, string> = {
  documentation: "Documentar atendimentos e altas",
  exams: "Organizar e resumir exames",
  clinical_decision: "Condutas, medicamentos e casos",
  calculations: "Gasometria, scores e cálculos",
  rounding: "Evoluir pacientes ou leitos",
  voice: "Registro por voz",
};

const SETTING_LABEL: Record<string, string> = {
  emergency: "Emergência",
  icu: "UTI",
  ward: "Enfermaria",
  outpatient: "Consultório / Ambulatório",
  other: "Outro",
};

const GOAL_LABEL: Record<string, string> = {
  less_typing: "Menos tempo digitando",
  faster_decisions: "Mais agilidade nas decisões",
  standardization: "Registros padronizados",
  organized_workflow: "Rotina organizada",
  less_rework: "Menos retrabalho",
};

const PATH_LABEL: Record<string, string> = {
  documentation: "Documentação",
  copilot: "Copiloto",
  workflow: "Fluxo",
};

const TOOL_LABEL: Record<string, string> = {
  clinicus: "Clínicus",
  examinus: "Examinus",
  mediscuss: "Mediscuss",
  protocolus: "Protocolus",
  prescriptus: "Prescriptus",
  gasometrus: "Gasometrus",
  scorius: "Scorius",
  numerus: "Numerus",
  orientus: "Orientus",
  modo_escuta: "Modo Escuta",
  modo_rotineiro: "Modo Rotineiro",
};

const nf = (n: number) => n.toLocaleString("pt-BR");

function Distribution({
  title,
  items,
  labels,
}: {
  title: string;
  items: DistributionItem[];
  labels: Record<string, string>;
}) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0);
  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem respostas registradas até o momento.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate">{labels[item.key] ?? item.key}</span>
                <span className="shrink-0 text-muted-foreground">
                  {nf(item.count)} · {item.percent.toLocaleString("pt-BR")}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${max ? (item.count / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function OnboardingInsightsPanel() {
  const [data, setData] = useState<OnboardingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        "admin-posthog?view=onboarding",
        { method: "GET" },
      );
      if (error) throw error;
      if ((res as { error?: string })?.error) throw new Error((res as { error: string }).error);
      setData(res as OnboardingInsights);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Perfil de onboarding</h2>
          <p className="text-xs text-muted-foreground">
            Respostas agregadas do primeiro acesso. Nenhum dado pessoal é exibido.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {err && <Card className="p-4 text-xs text-destructive">{err}</Card>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Respondentes da pesquisa</p>
              <p className="text-2xl font-semibold">{nf(data.surveyRespondents)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Onboardings concluídos</p>
              <p className="text-2xl font-semibold">{nf(data.completedTotal)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-semibold">{nf(data.pendingTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conclusão:{" "}
                {data.completionPercent === null
                  ? "—"
                  : `${data.completionPercent.toLocaleString("pt-BR")}%`}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Legado / sem pesquisa</p>
              <p className="text-2xl font-semibold">{nf(data.legacyCompletedWithoutSurvey)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Não entram nas distribuições.
              </p>
            </Card>
          </div>

          {data.surveyRespondents === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm font-medium">Ainda sem respostas da pesquisa</p>
              <p className="text-xs text-muted-foreground mt-1">
                As distribuições aparecem assim que novos usuários concluírem o primeiro acesso.
              </p>
            </Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Como as perguntas permitem múltiplas respostas, os percentuais podem ultrapassar 100%
                quando somados.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                <Distribution
                  title="Principais dores da rotina"
                  items={data.routinePains}
                  labels={PAIN_LABEL}
                />
                <Distribution title="Onde atuam" items={data.workSettings} labels={SETTING_LABEL} />
                <Distribution
                  title="O que querem ganhar"
                  items={data.primaryGoals}
                  labels={GOAL_LABEL}
                />
                <Distribution
                  title="Caminho recomendado"
                  items={data.primaryPaths}
                  labels={PATH_LABEL}
                />
                <Distribution
                  title="Ferramentas mais recomendadas"
                  items={data.recommendedTools}
                  labels={TOOL_LABEL}
                />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
