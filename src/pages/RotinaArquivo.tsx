import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { PremiumConsultorioGuard } from "@/components/PremiumConsultorioGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";
import { daysOfStay, type WardAdmission, type WardRound, type WardUnit } from "@/hooks/useWard";
import { Archive, ArrowLeft, Copy, Loader2, Search } from "lucide-react";

function ArquivoInner() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<WardAdmission[]>([]);
  const [units, setUnits] = useState<WardUnit[]>([]);
  const [rounds, setRounds] = useState<Record<string, WardRound[]>>({});
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [a, u] = await Promise.all([
        supabase.from("ward_admissions").select("*").eq("status", "discharged").order("discharged_on", { ascending: false }),
        supabase.from("ward_units").select("*"),
      ]);
      setRows((a.data as WardAdmission[]) || []);
      setUnits((u.data as WardUnit[]) || []);
      setLoading(false);
    })();
  }, []);

  const loadRounds = async (admissionId: string) => {
    if (rounds[admissionId]) return;
    const { data } = await supabase
      .from("ward_rounds")
      .select("*")
      .eq("admission_id", admissionId)
      .order("round_date", { ascending: true });
    setRounds((r) => ({ ...r, [admissionId]: (data as WardRound[]) || [] }));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.patient_name.toLowerCase().includes(q) ||
      (r.main_diagnosis || "").toLowerCase().includes(q) ||
      (r.discharged_on || "").includes(q) ||
      (units.find((u) => u.id === r.unit_id)?.name || "").toLowerCase().includes(q),
    );
  }, [rows, query, units]);

  const copyAll = async (adm: WardAdmission) => {
    await loadRounds(adm.id);
    const list = rounds[adm.id] || [];
    const text = [
      `PACIENTE: ${adm.patient_name}`,
      `ADMISSÃO: ${adm.admitted_on}`,
      `ALTA: ${adm.discharged_on || ""}`,
      adm.main_diagnosis ? `DIAGNÓSTICO: ${adm.main_diagnosis}` : "",
      "",
      ...list.map((r) => `EVOLUÇÃO ${r.round_date}\n${r.content}\n`),
    ].filter(Boolean).join("\n");
    const ok = await copyText(text);
    toast({ title: ok ? "Internação copiada" : "Nada para copiar", variant: ok ? undefined : "destructive" });
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Arquivo de altas | MedStation</title>
        <meta name="description" content="Histórico de pacientes com alta e todas as evoluções registradas no Modo Rotineiro." />
      </Helmet>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Archive className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Arquivo de altas</h1>
            <p className="text-sm text-muted-foreground">Pacientes que já saíram dos seus leitos, com todas as evoluções.</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/rotina"><ArrowLeft className="h-4 w-4 mr-2" /> Mapa de leitos</Link>
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, diagnóstico, unidade ou data"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando arquivo...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-muted-foreground">
          Nenhum paciente arquivado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((adm) => {
            const isOpen = openId === adm.id;
            return (
              <div key={adm.id} className="rounded-lg border border-hairline bg-card">
                <button
                  type="button"
                  className="w-full text-left p-4 flex flex-wrap items-center justify-between gap-3"
                  onClick={() => {
                    const next = isOpen ? null : adm.id;
                    setOpenId(next);
                    if (next) void loadRounds(adm.id);
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{adm.patient_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {adm.main_diagnosis || "Sem diagnóstico registrado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-2xs">
                      {units.find((u) => u.id === adm.unit_id)?.name || "—"}
                    </Badge>
                    <span className="font-mono text-2xs text-muted-foreground">
                      {adm.admitted_on.split("-").reverse().join("/")} → {(adm.discharged_on || "").split("-").reverse().join("/")}
                      {" · "}{daysOfStay(adm.admitted_on, adm.discharged_on || undefined)} dias
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-hairline p-4 space-y-3">
                    <Button size="sm" variant="outline" onClick={() => copyAll(adm)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar internação completa
                    </Button>
                    {(rounds[adm.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem evoluções registradas.</p>
                    ) : (
                      (rounds[adm.id] || []).map((r) => (
                        <details key={r.id} className="rounded-md border border-hairline p-3">
                          <summary className="cursor-pointer text-sm font-medium">
                            {r.round_date.split("-").reverse().join("/")}
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap font-mono text-[0.78rem] text-muted-foreground">{r.content}</pre>
                        </details>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RotinaArquivo() {
  return (
    <PremiumConsultorioGuard>
      <ArquivoInner />
    </PremiumConsultorioGuard>
  );
}
