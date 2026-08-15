import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { PremiumConsultorioGuard } from "@/components/PremiumConsultorioGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssistantGlyph } from "@/components/AssistantGlyph";
import { UnitsManagerDialog } from "@/components/rotina/UnitsManagerDialog";
import { AdmitPatientDialog } from "@/components/rotina/AdmitPatientDialog";
import { EditPatientDialog } from "@/components/rotina/EditPatientDialog";
import { RoundSheet } from "@/components/rotina/RoundSheet";
import { daysOfStay, useWard, type WardAdmission, type WardBed } from "@/hooks/useWard";
import { BedDouble, Settings2, Sun, Plus, CheckCircle2, CircleDashed, Clock, Archive, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function RotinaInner() {
  const ward = useWard();
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [admitBed, setAdmitBed] = useState<WardBed | null>(null);
  const [openAdmissionId, setOpenAdmissionId] = useState<string | null>(null);
  const [editAdmission, setEditAdmission] = useState<WardAdmission | null>(null);


  const occupiedBedIds = useMemo(
    () => new Set(ward.admissions.map((a) => a.bed_id).filter(Boolean) as string[]),
    [ward.admissions],
  );
  const admissionByBed = useMemo(() => {
    const m: Record<string, typeof ward.admissions[number]> = {};
    ward.admissions.forEach((a) => { if (a.bed_id) m[a.bed_id] = a; });
    return m;
  }, [ward.admissions]);

  const totalBeds = ward.beds.length;
  const occupied = occupiedBedIds.size;
  const pending = ward.admissions.filter((a) => ward.todayRounds[a.id]?.status !== "final").length;

  const openAdmission = ward.admissions.find((a) => a.id === openAdmissionId) || null;
  const openBed = ward.beds.find((b) => b.id === openAdmission?.bed_id) || null;
  const openUnit = ward.units.find((u) => u.id === openAdmission?.unit_id) || null;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Modo Rotineiro | MedStation</title>
        <meta name="description" content="Mapa de leitos, evolução diária e alta de pacientes de enfermaria e UTI com o assistente Carpe Diem." />
      </Helmet>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AssistantGlyph size="md">
            <Sun className="h-5 w-5" />
          </AssistantGlyph>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Modo Rotineiro</h1>
            <p className="text-sm text-muted-foreground">
              Seus leitos, sua visita e a evolução do dia com o Carpe Diem.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/rotina/arquivo"><Archive className="h-4 w-4 mr-2" /> Arquivo de altas</Link>
          </Button>
          <Button variant="outline" onClick={() => setUnitsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" /> Gerenciar unidades
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Leitos", value: totalBeds, icon: BedDouble },
          { label: "Ocupados", value: occupied, icon: CheckCircle2 },
          { label: "Livres", value: Math.max(0, totalBeds - occupied), icon: CircleDashed },
          { label: "Evoluções pendentes", value: pending, icon: Clock },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-hairline bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary/70" />
            </div>
            <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {ward.loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando seus leitos...
        </div>
      ) : ward.units.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline p-10 text-center space-y-3">
          <BedDouble className="h-8 w-8 mx-auto text-primary/60" />
          <h2 className="font-display text-lg font-semibold">Comece configurando suas unidades</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Crie a enfermaria ou UTI pela qual você é responsável e defina quantos leitos acompanha.
          </p>
          <Button onClick={() => setUnitsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Criar unidade
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {ward.units.map((unit) => {
            const unitBeds = ward.beds.filter((b) => b.unit_id === unit.id);
            return (
              <section key={unit.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3 hairline-b pb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold tracking-tight">{unit.name}</h2>
                    <Badge variant="secondary" className="font-mono text-2xs uppercase">{unit.kind}</Badge>
                  </div>
                  <span className="font-mono text-2xs text-muted-foreground">
                    {unitBeds.filter((b) => occupiedBedIds.has(b.id)).length}/{unitBeds.length} ocupados
                  </span>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {unitBeds.map((bed) => {
                    const adm = admissionByBed[bed.id];
                    const round = adm ? ward.todayRounds[adm.id] : null;
                    const done = round?.status === "final";
                    return (
                      <button
                        key={bed.id}
                        type="button"
                        onClick={() => (adm ? setOpenAdmissionId(adm.id) : setAdmitBed(bed))}
                        className={cn(
                          "group text-left rounded-lg border p-4 transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-md",
                          adm
                            ? "border-hairline bg-card hover:border-primary/50"
                            : "border-dashed border-hairline bg-muted/20 hover:border-primary/50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground">
                            Leito {bed.label}
                          </span>
                          {adm ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium",
                                done ? "bg-primary/15 text-primary" : round ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {done ? "Evoluído" : round ? "Rascunho" : "Pendente"}
                            </span>
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          )}
                        </div>

                        {adm ? (
                          <div className="mt-3 space-y-1">
                            <p className="font-medium truncate">{adm.patient_name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {adm.main_diagnosis || "Sem diagnóstico registrado"}
                            </p>
                            <p className="font-mono text-2xs text-muted-foreground/80">
                              D{daysOfStay(adm.admitted_on)} de internação
                            </p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Leito livre — internar paciente</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <UnitsManagerDialog
        open={unitsOpen}
        onOpenChange={setUnitsOpen}
        units={ward.units}
        beds={ward.beds}
        occupiedBedIds={occupiedBedIds}
        onCreateUnit={ward.createUnit}
        onDeleteUnit={ward.deleteUnit}
        onAddBeds={ward.addBeds}
        onRenameBed={ward.renameBed}
        onDeleteBed={ward.deleteBed}
      />

      <AdmitPatientDialog
        bed={admitBed}
        unitName={ward.units.find((u) => u.id === admitBed?.unit_id)?.name}
        open={!!admitBed}
        onOpenChange={(v) => !v && setAdmitBed(null)}
        onAdmit={ward.admitPatient}
      />

      <RoundSheet
        open={!!openAdmissionId}
        onOpenChange={(v) => !v && setOpenAdmissionId(null)}
        admission={openAdmission}
        bed={openBed}
        unit={openUnit}
        beds={ward.beds}
        units={ward.units}
        occupiedBedIds={occupiedBedIds}
        onMove={ward.movePatient}
        onDischarge={ward.dischargePatient}
        onChanged={ward.reload}
      />
    </div>
  );
}

export default function Rotina() {
  return (
    <PremiumConsultorioGuard>
      <RotinaInner />
    </PremiumConsultorioGuard>
  );
}
