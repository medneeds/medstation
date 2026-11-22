import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { BRAZIL_STATES, BRAZIL_VIEWBOX } from "@/data/brazilStatesMap";
import type {
  UsageCounts,
  UsageMapResult,
} from "../../../supabase/functions/_shared/usage-map";
import { UF_NAMES } from "../../../supabase/functions/_shared/usage-map";

type Metric = keyof UsageCounts;
type Response = UsageMapResult & { usageComplete: boolean; generatedAt: string };

const METRICS: { key: Metric; label: string; hint: string }[] = [
  { key: "users", label: "Cadastros", hint: "Contas criadas" },
  { key: "used", label: "Já usaram", hint: "Contas que usaram algum assistente de IA" },
  { key: "active30", label: "Ativos 30 dias", hint: "Contas que usaram nos últimos 30 dias" },
];

const nf = new Intl.NumberFormat("pt-BR");

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}

export default function AdminUsageMap() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("users");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-usage-map", { method: "GET" });
      if (error) throw error;
      if ((res as { error?: string })?.error) throw new Error((res as { error: string }).error);
      setData(res as Response);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar o mapa");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byUf = useMemo(() => new Map((data?.states ?? []).map((s) => [s.uf, s])), [data]);
  const max = useMemo(
    () => Math.max(1, ...(data?.states ?? []).map((s) => s[metric])),
    [data, metric],
  );
  const ranking = useMemo(
    () => [...(data?.states ?? [])].filter((s) => s[metric] > 0).sort((a, b) => b[metric] - a[metric] || a.uf.localeCompare(b.uf)),
    [data, metric],
  );
  const cities = useMemo(
    () => [...(data?.cities ?? [])].filter((c) => c[metric] > 0).sort((a, b) => b[metric] - a[metric] || a.city.localeCompare(b.city)).slice(0, 25),
    [data, metric],
  );

  const metricInfo = METRICS.find((m) => m.key === metric)!;
  const sel = selected ? byUf.get(selected) : null;
  // Raiz quadrada: estados pequenos continuam visíveis ao lado do líder.
  const opacity = (v: number) => (v <= 0 ? 0 : 0.18 + 0.82 * Math.sqrt(v / max));

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando o mapa de uso…
      </div>
    );
  }

  if (err && !data) {
    return (
      <Card className="p-6 text-sm">
        <p className="font-medium">Não foi possível carregar o mapa de uso.</p>
        <p className="text-muted-foreground mt-1">{err}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={load}>Tentar de novo</Button>
      </Card>
    );
  }

  if (!data) return null;
  const { totals, sources } = data;
  const pctLocated = totals.users ? Math.round((totals.located / totals.users) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Mapa de uso
          </h2>
          <p className="text-sm text-muted-foreground">
            Onde a MedStation tem contas e onde ela é usada, por estado e cidade.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Estados alcançados" value={`${totals.states} de 27`} />
        <Stat label="Cidades informadas" value={nf.format(totals.cities)} />
        <Stat label="Cadastros" value={nf.format(totals.users)} hint={`${nf.format(totals.used)} já usaram · ${nf.format(totals.active30)} ativos em 30 dias`} />
        <Stat label="Com localização" value={`${pctLocated}%`} hint={`${nf.format(totals.unlocated)} sem estado identificado`} />
      </div>

      <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40" role="tablist" aria-label="Métrica do mapa">
        {METRICS.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={metric === m.key}
            title={m.hint}
            onClick={() => setMetric(m.key)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
              metric === m.key ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="p-4 lg:col-span-3 self-start">
          <div className="flex items-baseline justify-between gap-3 mb-2 min-h-[2.5rem]">
            {sel ? (
              <div>
                <p className="text-sm font-medium">{sel.name} ({sel.uf})</p>
                <p className="text-xs text-muted-foreground">
                  {nf.format(sel.users)} cadastros · {nf.format(sel.used)} já usaram · {nf.format(sel.active30)} ativos em 30 dias
                </p>
              </div>
            ) : selected ? (
              <div>
                <p className="text-sm font-medium">{UF_NAMES[selected]} ({selected})</p>
                <p className="text-xs text-muted-foreground">Nenhuma conta identificada neste estado.</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Toque em um estado para ver os números.</p>
            )}
          </div>
          <svg
            viewBox={BRAZIL_VIEWBOX}
            className="w-full h-auto max-h-[560px]"
            role="img"
            aria-label={`Mapa do Brasil por estado: ${metricInfo.label}`}
          >
            {BRAZIL_STATES.map((s) => {
              const v = byUf.get(s.uf)?.[metric] ?? 0;
              const isSel = selected === s.uf;
              return (
                <path
                  key={s.uf}
                  d={s.d}
                  onClick={() => setSelected(isSel ? null : s.uf)}
                  className="cursor-pointer transition-[fill-opacity] outline-none"
                  fill={v > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                  fillOpacity={v > 0 ? opacity(v) : 1}
                  stroke={isSel ? "hsl(var(--foreground))" : "hsl(var(--background))"}
                  strokeWidth={isSel ? 2 : 1}
                  strokeLinejoin="round"
                >
                  <title>{`${UF_NAMES[s.uf]}: ${nf.format(v)} (${metricInfo.label.toLowerCase()})`}</title>
                </path>
              );
            })}
            {/* Estado selecionado por cima, para a borda não ficar cortada pelos vizinhos. */}
            {selected && (() => {
              const s = BRAZIL_STATES.find((x) => x.uf === selected);
              return s ? (
                <path d={s.d} fill="none" stroke="hsl(var(--foreground))" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
              ) : null;
            })()}
            {BRAZIL_STATES.map((s) => {
              const v = byUf.get(s.uf)?.[metric] ?? 0;
              if (v <= 0 || s.w < 55 || s.h < 40) return null;
              const strong = opacity(v) > 0.55;
              return (
                <text
                  key={s.uf}
                  x={s.x}
                  y={s.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                  className="text-[13px] font-semibold tabular-nums"
                  fill={strong ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}
                >
                  {nf.format(v)}
                </text>
              );
            })}
          </svg>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Menos</span>
            <div
              className="h-2 w-28 rounded-full"
              style={{ background: "linear-gradient(to right, hsl(var(--primary) / 0.18), hsl(var(--primary)))" }}
            />
            <span>Mais</span>
            <span className="ml-3 inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-muted border border-border" /> Sem contas
            </span>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Estados · {metricInfo.label.toLowerCase()}</h3>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum estado identificado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {ranking.map((s) => (
                  <li key={s.uf}>
                    <button
                      onClick={() => setSelected(selected === s.uf ? null : s.uf)}
                      className={`w-full text-left rounded-md px-2 py-1 -mx-2 hover:bg-muted/60 ${selected === s.uf ? "bg-muted/60" : ""}`}
                    >
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{s.name}</span>
                        <span className="tabular-nums font-medium">{nf.format(s[metric])}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (s[metric] / max) * 100)}%` }} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Cidades · {metricInfo.label.toLowerCase()}</h3>
            {cities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma cidade informada no perfil ainda.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {cities.map((c, i) => (
                  <li key={`${c.city}|${c.uf ?? ""}`} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">
                      <span className="text-muted-foreground tabular-nums mr-2">{i + 1}.</span>
                      {c.city}
                      <span className="text-muted-foreground"> · {c.uf ?? "UF não informada"}</span>
                    </span>
                    <span className="tabular-nums font-medium">{nf.format(c[metric])}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Como o estado de cada conta é identificado: {nf.format(sources.profile)} pelo estado informado no perfil,{" "}
        {nf.format(sources.crm)} pela UF do CRM e {nf.format(sources.phone)} pelo DDD do telefone. CRM e DDD são
        aproximações. As cidades vêm apenas do que o médico preencheu no perfil. Esta tela mostra só contagens,
        sem dados pessoais.
        {!data.usageComplete && " O histórico de uso é muito grande e foi lido em parte: \"Já usaram\" pode estar abaixo do real."}
      </p>
    </div>
  );
}
