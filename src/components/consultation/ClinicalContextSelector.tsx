import { Building2, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicalContext } from "@/hooks/useConsultation";

export const CLINICAL_CONTEXT_TITLES: Record<ClinicalContext, string> = {
  consultorio: "Anamnese · Consultório",
  emergencia_rapida: "Emergência · Avaliação rápida",
  emergencia_admissao: "Emergência · Admissão completa",
};

interface Props {
  value: ClinicalContext;
  onChange: (value: ClinicalContext) => void;
  className?: string;
}

/** Consultório ou Emergência; na Emergência, avaliação rápida ou admissão completa. */
export function ClinicalContextSelector({ value, onChange, className }: Props) {
  const isEmergency = value !== "consultorio";
  const pill = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
      active ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="inline-flex items-center gap-0.5 rounded-xl bg-muted/60 border border-border/60 p-0.5" role="group" aria-label="Contexto do atendimento">
        <button type="button" aria-pressed={!isEmergency} onClick={() => onChange("consultorio")} className={pill(!isEmergency)}>
          <Building2 className="h-3.5 w-3.5" />
          Consultório
        </button>
        <button
          type="button"
          aria-pressed={isEmergency}
          onClick={() => !isEmergency && onChange("emergencia_rapida")}
          className={pill(isEmergency)}
        >
          <Siren className="h-3.5 w-3.5" />
          Emergência
        </button>
      </div>
      {isEmergency && (
        <div className="inline-flex items-center gap-0.5 rounded-xl bg-muted/60 border border-border/60 p-0.5" role="group" aria-label="Tipo de registro na emergência">
          <button type="button" aria-pressed={value === "emergencia_rapida"} onClick={() => onChange("emergencia_rapida")} className={pill(value === "emergencia_rapida")}>
            Rápida
          </button>
          <button type="button" aria-pressed={value === "emergencia_admissao"} onClick={() => onChange("emergencia_admissao")} className={pill(value === "emergencia_admissao")}>
            Admissão
          </button>
        </div>
      )}
    </div>
  );
}
