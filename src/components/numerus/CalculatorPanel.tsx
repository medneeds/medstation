import { useMemo, useState } from "react";
import { Search, Scale, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { infusionDrugs } from "@/lib/numerus/infusions";
import { protocolCalcs } from "@/lib/numerus/protocols";
import InfusionCard from "./InfusionCard";
import ProtocolCard from "./ProtocolCard";
import { cn } from "@/lib/utils";

type GroupKey =
  | "todas"
  | "vasoativas"
  | "sedacao"
  | "bloqueio"
  | "outras"
  | "protocolos"
  | "eletrolitos"
  | "medidas"
  | "antibioticos";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "protocolos", label: "Protocolos" },
  { key: "vasoativas", label: "Vasoativas" },
  { key: "sedacao", label: "Sedação" },
  { key: "bloqueio", label: "Bloqueio" },
  { key: "eletrolitos", label: "Sódio e eletrólitos" },
  { key: "outras", label: "Outras infusões" },
  { key: "medidas", label: "Ventilação e medidas" },
  { key: "antibioticos", label: "Antibióticos" },
];

const WEIGHT_PRESETS = [40, 50, 60, 70, 80, 90, 100, 110, 120, 140];

export function CalculatorPanel() {
  const [weight, setWeight] = useState(70);
  const [weightText, setWeightText] = useState("70");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupKey>("todas");

  const q = query.trim().toLowerCase();

  const drugs = useMemo(
    () =>
      infusionDrugs.filter(
        (d) =>
          (group === "todas" || group === d.category) &&
          (!q || d.name.toLowerCase().includes(q) || d.dilutions.some((x) => x.presentation.toLowerCase().includes(q))),
      ),
    [group, q],
  );

  const protocols = useMemo(
    () =>
      protocolCalcs.filter(
        (p) =>
          (group === "todas" || group === p.category) &&
          (!q || p.name.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)),
      ),
    [group, q],
  );

  const applyWeight = (raw: string) => {
    setWeightText(raw);
    const n = parseFloat(raw.replace(",", "."));
    if (isFinite(n) && n > 0 && n <= 300) setWeight(n);
  };

  const empty = drugs.length === 0 && protocols.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Barra de peso + busca (fixa) */}
      <div className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl px-3 sm:px-5 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5">
              <Scale className="h-4 w-4 text-primary shrink-0" />
              <label htmlFor="numerus-peso" className="text-xs font-medium text-muted-foreground">
                Peso
              </label>
              <Input
                id="numerus-peso"
                type="number"
                inputMode="decimal"
                value={weightText}
                onChange={(e) => applyWeight(e.target.value)}
                className="h-7 w-16 border-0 bg-transparent p-0 text-base font-bold tabular-nums text-primary shadow-none focus-visible:ring-0"
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              {WEIGHT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyWeight(String(p))}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-full border transition-colors",
                    weight === p
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="relative sm:ml-auto sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cálculo, droga ou protocolo"
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Categorias */}
        <div className="mt-2.5 -mx-3 sm:-mx-5 px-3 sm:px-5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 w-max">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className={cn(
                  "text-[11.5px] whitespace-nowrap px-3 py-1.5 rounded-full border transition-all",
                  group === g.key
                    ? "border-primary/50 bg-primary/10 text-primary font-medium"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 sm:px-5 py-4 space-y-4">
          {protocols.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              {protocols.map((p) => (
                <ProtocolCard key={p.id} calc={p} weight={weight} />
              ))}
            </div>
          )}

          {drugs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {drugs.map((d) => (
                <InfusionCard key={d.id} drug={d} weight={weight} />
              ))}
            </div>
          )}

          {empty && (
            <p className="text-center text-sm text-muted-foreground py-16">
              Nenhum cálculo encontrado para "{query}".
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
            <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Os valores são apoio ao cálculo à beira do leito, baseados em diluições padronizadas. Confira a
              apresentação disponível no seu serviço. A decisão final é sempre do médico assistente.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default CalculatorPanel;
