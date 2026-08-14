import { useMemo, useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copyText } from "@/lib/clipboard";
import { toast } from "sonner";
import { protocolToText, type ProtocolCalc } from "@/lib/numerus/protocols";
import { cn } from "@/lib/utils";

interface Props {
  calc: ProtocolCalc;
  weight: number;
}

export function ProtocolCard({ calc, weight }: Props) {
  const [values, setValues] = useState<Record<string, number | string | boolean>>(() =>
    Object.fromEntries(calc.fields.map((f) => [f.key, f.default])),
  );
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => calc.compute(weight, values), [calc, weight, values]);

  const set = (key: string, v: number | string | boolean) => setValues((prev) => ({ ...prev, [key]: v }));

  const handleCopy = async () => {
    const ok = await copyText(protocolToText(calc.name, weight, result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("Protocolo copiado");
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_18px_50px_-30px_hsl(var(--primary)/0.55)]">
      <div>
        <h3 className="text-base sm:text-lg font-semibold tracking-tight">{calc.name}</h3>
        <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{calc.summary}</p>
      </div>

      {/* Campos */}
      {calc.fields.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {calc.fields.map((f) => (
            <div
              key={f.key}
              className={cn("min-w-0", f.type === "switch" && "col-span-2 flex items-center justify-between gap-2")}
            >
              <label className="block text-[11px] text-muted-foreground mb-1 truncate">
                {f.label}
                {f.unit ? ` (${f.unit})` : ""}
              </label>

              {f.type === "number" && (
                <Input
                  type="number"
                  inputMode="decimal"
                  value={String(values[f.key] ?? "")}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  onChange={(e) => set(f.key, e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="h-9 text-sm tabular-nums"
                />
              )}

              {f.type === "select" && (
                <Select value={String(values[f.key])} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-sm">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {f.type === "switch" && (
                <Switch checked={Boolean(values[f.key])} onCheckedChange={(v) => set(f.key, v)} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resultado */}
      <div className="mt-4 space-y-3">
        {result.sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border/40 bg-muted/40">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            </div>
            <div className="divide-y divide-border/30">
              {section.rows.map((row, i) => (
                <div key={`${row.label}-${i}`} className="px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-muted-foreground shrink-0 max-w-[45%]">{row.label}</span>
                    <span
                      className={cn(
                        "text-[12.5px] font-semibold text-right tabular-nums",
                        row.tone === "warn" && "text-amber-500",
                        row.tone === "good" && "text-primary",
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                  {row.detail && (
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{row.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {result.alerts?.length ? (
        <ul className="mt-3 space-y-1">
          {result.alerts.map((a) => (
            <li key={a} className="flex items-start gap-1.5 text-[11px] text-amber-500 leading-snug">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      ) : null}

      <Button variant="outline" size="sm" className="mt-3 h-8 w-full text-xs" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
        Copiar protocolo
      </Button>
    </div>
  );
}

export default ProtocolCard;
