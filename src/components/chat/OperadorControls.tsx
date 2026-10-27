import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OPERADOR_ACTIONS, type OperadorActionGroup, type OperadorReferral } from "@/lib/operador";

const GROUP_LABEL: Record<OperadorActionGroup, string> = {
  geral: "Geral",
  documentos: "Documentos",
  exames: "Exames",
  burocracia: "Burocracia",
};

interface OperadorActionBarProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

/** Barra de ações rápidas do Modo Operador: uma ação por vez, rolagem horizontal. */
export function OperadorActionBar({ value, onChange, compact = false }: OperadorActionBarProps) {
  const groups = (Object.keys(GROUP_LABEL) as OperadorActionGroup[]).map((g) => ({
    group: g,
    items: OPERADOR_ACTIONS.filter((a) => a.group === g),
  }));
  const current = OPERADOR_ACTIONS.find((a) => a.value === value);

  return (
    <div className={cn("mb-2", !compact && "mb-3")}>
      <div
        role="radiogroup"
        aria-label="Ação do Modo Operador"
        className={cn(
          "flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1",
          compact && "pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]",
          !compact && "px-3 py-2.5 mx-0 rounded-2xl bg-muted/35 border border-border/50",
        )}
      >
        {groups.map(({ group, items }, gi) => (
          <div key={group} className="flex items-center gap-1.5 shrink-0">
            {gi > 0 && <span className="w-px h-5 bg-border/70 mx-0.5 shrink-0" aria-hidden />}
            {!compact && (
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 mr-0.5 shrink-0">
                {GROUP_LABEL[group]}
              </span>
            )}
            {items.map((a) => {
              const active = a.value === value;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(a.value)}
                  title={a.hint}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 text-xs transition-colors",
                    compact ? "h-7" : "h-8 px-3",
                    active
                      ? "border-primary/50 bg-primary/15 text-primary font-medium"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {current && !compact && (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">{current.hint}</p>
      )}
    </div>
  );
}

/** Atalhos para o assistente indicado no fim da resposta. */
export function OperadorReferrals({ referrals }: { referrals: OperadorReferral[] }) {
  const navigate = useNavigate();
  if (referrals.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">Para aprofundar</span>
      <div className="flex flex-wrap gap-1.5">
        {referrals.map((r) => (
          <button
            key={r.name}
            type="button"
            onClick={() => navigate(r.url)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/15 transition-colors"
            title={r.reason || `Abrir ${r.name}`}
          >
            <span className="font-medium">Abrir {r.name}</span>
            {r.reason && <span className="truncate text-primary/80">· {r.reason}</span>}
            <ArrowUpRight className="h-3 w-3 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
