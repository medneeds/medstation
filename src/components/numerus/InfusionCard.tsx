import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, AlertTriangle, Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { toast } from "sonner";
import { fmt, infusionRate, type InfusionDrug } from "@/lib/numerus/calc";
import { cn } from "@/lib/utils";

/** Número que "corre" suavemente até o valor alvo — sensação de tempo real. */
function useAnimatedNumber(value: number, duration = 260) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    const from = fromRef.current;
    const delta = value - from;
    if (Math.abs(delta) < 0.001) {
      setDisplay(value);
      return;
    }
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

interface Props {
  drug: InfusionDrug;
  weight: number;
}

export function InfusionCard({ drug, weight }: Props) {
  const [dose, setDose] = useState(drug.start);
  const [dilutionIndex, setDilutionIndex] = useState(0);
  const [customOn, setCustomOn] = useState(false);
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);

  const base = drug.dilutions[dilutionIndex] ?? drug.dilutions[0];
  const customConc = Number(customText.replace(",", "."));
  const customValid = isFinite(customConc) && customConc > 0;
  const dilution =
    customOn && customValid
      ? {
          ...base,
          label: "Personalizada",
          recipe: `Concentração informada [1 mL = ${fmt(customConc, 2)} ${base.concUnit.replace("/mL", "")}]`,
          concentration: customConc,
        }
      : base;
  const rate = useMemo(() => infusionRate(dose, drug, dilution, weight), [dose, drug, dilution, weight]);
  const animatedRate = useAnimatedNumber(rate);


  const pctOf = (v: number) => ((v - drug.min) / (drug.max - drug.min)) * 100;
  const isHigh = dose > drug.usualMax;
  const isLow = dose < drug.usualMin;

  const doseLabel = `${fmt(dose, drug.step < 0.1 ? 2 : 1)} ${drug.doseUnit}`;
  const prescription = `${dilution.presentation} — ${dilution.recipe} — ${fmt(rate, 1)} mL/h (${doseLabel}${
    drug.doseUnit.includes("/kg") ? ` • ${fmt(weight, 1)} kg` : ""
  })`;

  const bolusMg = drug.bolus ? Math.min(drug.bolus.perKg * weight, drug.bolus.max ?? Infinity) : 0;

  const nudge = (dir: 1 | -1) => {
    setDose((d) => {
      const next = Math.min(drug.max, Math.max(drug.min, Number((d + dir * drug.step).toFixed(4))));
      return next;
    });
  };

  const handleCopy = async () => {
    const ok = await copyText(prescription);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("Prescrição copiada");
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300",
        "hover:shadow-[0_18px_50px_-30px_hsl(var(--primary)/0.55)] hover:border-primary/40",
        isHigh ? "border-amber-500/40" : "border-border/60",
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight truncate">{drug.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Faixa usual {fmt(drug.usualMin, 2)}–{fmt(drug.usualMax, 2)} {drug.doseUnit}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div
            className={cn(
              "text-2xl sm:text-3xl font-bold tabular-nums leading-none transition-colors",
              isHigh ? "text-amber-500" : "text-primary",
            )}
          >
            {fmt(animatedRate, 1)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">mL/h</div>
        </div>
      </div>

      {/* Diluições / concentração */}
      <div className="mt-3">
        <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1.5">Concentração</p>
        <div className="flex flex-wrap gap-1.5">
          {drug.dilutions.map((d, i) => (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                setDilutionIndex(i);
                setCustomOn(false);
              }}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                !customOn && i === dilutionIndex
                  ? "border-primary/50 bg-primary/10 text-primary font-medium"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30",
              )}
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOn((v) => !v)}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
              customOn
                ? "border-primary/50 bg-primary/10 text-primary font-medium"
                : "border-dashed border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/30",
            )}
          >
            Outra
          </button>
        </div>

        {customOn && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">1 mL =</span>
            <input
              type="number"
              inputMode="decimal"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="ex.: 64"
              className="h-7 w-24 rounded-md border border-border/60 bg-background px-2 text-sm tabular-nums outline-none focus:border-primary/50"
            />
            <span className="text-[11px] text-muted-foreground">{base.concUnit}</span>
          </div>
        )}
      </div>


      {/* Dose + slider */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              isHigh ? "text-amber-500" : isLow ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {doseLabel}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => nudge(-1)}
              aria-label="Diminuir dose"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => nudge(1)}
              aria-label="Aumentar dose"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative py-2">
          {/* faixa usual marcada no trilho */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary/15"
              style={{
                left: `${Math.max(0, pctOf(drug.usualMin))}%`,
                width: `${Math.min(100, pctOf(drug.usualMax) - pctOf(drug.usualMin))}%`,
              }}
            />
          </div>
          <Slider
            value={[dose]}
            min={drug.min}
            max={drug.max}
            step={drug.step}
            onValueChange={([v]) => setDose(v)}
            className={cn("[&_[role=slider]]:h-6 [&_[role=slider]]:w-6", isHigh && "[&_[role=slider]]:border-amber-500")}
          />
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{fmt(drug.min, 2)}</span>
          <span>{fmt(drug.max, 2)}</span>
        </div>
      </div>

      {/* Bolus */}
      {drug.bolus && (
        <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{drug.bolus.label}: </span>
          <span className="font-semibold tabular-nums">
            {fmt(bolusMg, drug.bolus.unit === "U" ? 0 : 1)} {drug.bolus.unit}
          </span>
          <span className="text-muted-foreground"> ({drug.bolus.perKg} {drug.bolus.unit}/kg)</span>
        </div>
      )}

      {/* Prescrição */}
      <div className="mt-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5">
        <p className="text-[12.5px] leading-relaxed">
          <span className="font-semibold">{dilution.presentation}</span>{" "}
          <span className="text-muted-foreground">{dilution.recipe}</span>{" "}
          <span className={cn("font-semibold tabular-nums", isHigh ? "text-amber-500" : "text-primary")}>
            {fmt(rate, 1)} mL/h
          </span>
        </p>
      </div>

      {isHigh && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Dose acima da faixa usual — reavaliar volemia, causa de base e associações.
        </p>
      )}

      {drug.notes?.length ? (
        <ul className="mt-2 space-y-0.5">
          {drug.notes.map((n) => (
            <li key={n} className="text-[11px] text-muted-foreground leading-snug">
              • {n}
            </li>
          ))}
        </ul>
      ) : null}

      <Button variant="outline" size="sm" className="mt-3 h-8 w-full text-xs" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
        Copiar prescrição
      </Button>
    </div>
  );
}

export default InfusionCard;
