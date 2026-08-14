import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssistantGlyph } from "@/components/AssistantGlyph";

import { assistantPractice, type PracticeStep } from "@/lib/assistantPractice";
import {
  TestTube2, Stethoscope, Calculator, Sigma, Pill, FileCode, Wind,
  FileCheck, BookOpen, Compass, MessagesSquare, Mic, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const order: { name: string; icon: LucideIcon; tag: string }[] = [
  { name: "Examinus", icon: TestTube2, tag: "Exames" },
  { name: "Clínicus", icon: Stethoscope, tag: "Anamnese" },
  { name: "Mediscuss", icon: MessagesSquare, tag: "Parecer" },
  { name: "Prescriptus", icon: Pill, tag: "Prescrição" },
  { name: "Orientus", icon: Compass, tag: "Alta" },
  { name: "Gasometrus", icon: Wind, tag: "Gasometria" },
  { name: "Scorius", icon: Calculator, tag: "Scores" },
  { name: "Numerus", icon: Sigma, tag: "Cálculos" },
  { name: "CODexus", icon: FileCode, tag: "CID-10" },
  { name: "Atestus", icon: FileCheck, tag: "Atestado" },
  { name: "Protocolus", icon: BookOpen, tag: "Protocolos" },
  { name: "Modo Escuta", icon: Mic, tag: "Consulta gravada" },
];

const kindStyles: Record<PracticeStep["kind"], { chip: string; frame: string; text: string }> = {
  input: {
    chip: "bg-muted text-muted-foreground",
    frame: "border-border/60 bg-muted/30",
    text: "text-foreground/80",
  },
  process: {
    chip: "bg-primary/15 text-primary",
    frame: "border-primary/30 bg-primary/5",
    text: "text-muted-foreground",
  },
  output: {
    chip: "bg-primary text-primary-foreground",
    frame: "border-primary/40 bg-card shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]",
    text: "text-foreground",
  },
};

interface Props {
  onPrimary?: () => void;
}

export function AssistantPracticeShowcase({ onPrimary }: Props) {
  const [active, setActive] = useState(order[0].name);
  const steps = assistantPractice[active] ?? [];

  return (
    <div className="space-y-5">
      {/* Seletor de assistentes */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-px-4">
        <div className="flex md:flex-wrap md:justify-center gap-2 min-w-max md:min-w-0">
          {order.map(({ name, icon: Icon, tag }) => {
            const selected = name === active;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActive(name)}
                aria-pressed={selected}
                className={cn(
                  "group snap-start flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs md:text-sm whitespace-nowrap transition-all duration-200",
                  selected
                    ? "border-primary/50 bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.9)]"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:-translate-y-0.5",
                )}
              >
                {selected ? (
                  <Icon className="w-3.5 h-3.5" />
                ) : (
                  <AssistantGlyph size="xs" animate={false}>
                    <Icon className="w-3.5 h-3.5" />
                  </AssistantGlyph>
                )}

                <span className="font-medium">{name}</span>
                <span className={cn("hidden sm:inline text-[0.65rem] opacity-70")}>· {tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Passo a passo do assistente selecionado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, i) => {
          const s = kindStyles[step.kind];
          return (
            <Card
              key={`${active}-${i}`}
              className={cn("p-4 md:p-5 border backdrop-blur-sm animate-fade-in", s.frame)}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={cn("rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide", s.chip)}>
                  {step.label}
                </span>
                <span className="text-[0.65rem] font-mono text-muted-foreground">0{i + 1}</span>
              </div>
              <h4 className="font-display text-base md:text-lg tracking-tight mb-3">{step.title}</h4>
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1.5">
                {step.lines.map((line, j) => (
                  <p key={j} className={cn("text-xs md:text-[0.8rem] leading-relaxed font-mono", s.text)}>
                    {line}
                  </p>
                ))}
              </div>
              {step.note && (
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{step.note}</p>
              )}
            </Card>
          );
        })}
      </div>

      {onPrimary && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onPrimary}>
            Testar o Examinus agora, sem cadastro
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
