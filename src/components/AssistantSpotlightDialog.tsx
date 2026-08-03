import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ChevronRight, Sparkle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { assistantPractice, type PracticeStep } from "@/lib/assistantPractice";

export type SpotlightAssistant = {
  name: string;
  icon: LucideIcon;
  desc: string;
  free?: boolean;
  hook: string;
  detail: string;
  bullets: string[];
};

interface Props {
  assistant: SpotlightAssistant | null;
  onClose: () => void;
  onPrimary: (assistant: SpotlightAssistant) => void;
  onSecondary: (assistant: SpotlightAssistant) => void;
}

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
    frame: "border-primary/40 bg-card shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.7)]",
    text: "text-foreground",
  },
};

export function AssistantSpotlightDialog({ assistant, onClose, onPrimary, onSecondary }: Props) {
  const [tab, setTab] = useState<"resumo" | "pratica">("resumo");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const steps = assistant ? assistantPractice[assistant.name] ?? [] : [];

  useEffect(() => {
    if (assistant) {
      setTab("resumo");
      setCurrent(0);
    }
  }, [assistant]);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const handler = () => setCurrent(api.selectedScrollSnap());
    api.on("select", handler);
    return () => {
      api.off("select", handler);
    };
  }, [api]);

  const Icon = assistant?.icon;

  return (
    <Dialog open={!!assistant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0 gap-0">
        {assistant && Icon && (
          <>
            {/* Cabeçalho */}
            <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_20%_0%,hsl(var(--primary)/0.18),transparent)]" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary flex items-center justify-center shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.9)]">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-xl leading-tight flex items-center gap-2">
                    {assistant.name}
                    {assistant.free && (
                      <span className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                        Grátis
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs uppercase tracking-widest">
                    {assistant.desc}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <p className="relative mt-4 text-base md:text-lg font-medium leading-snug text-foreground">
                {assistant.hook}
              </p>

              {steps.length > 0 && (
                <div className="relative mt-5 inline-flex p-1 rounded-full bg-background/70 backdrop-blur border border-border/60">
                  {(
                    [
                      { id: "resumo", label: "Resumo" },
                      { id: "pratica", label: "Ver na prática" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                        tab === t.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="px-6 py-5 space-y-4">
              {tab === "resumo" || steps.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed">{assistant.detail}</p>
                  <ul className="space-y-2">
                    {assistant.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                  {steps.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTab("pratica")}
                      className="group flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      Ver como ele gera o resultado
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="animate-fade-in space-y-3">
                  <Carousel setApi={setApi} opts={{ align: "start" }} className="w-full">
                    <CarouselContent>
                      {steps.map((step, i) => {
                        const s = kindStyles[step.kind];
                        return (
                          <CarouselItem key={step.title}>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.chip}`}
                                >
                                  {i + 1}. {step.label}
                                </span>
                              </div>
                              <p className="text-sm font-semibold leading-tight">{step.title}</p>
                              <div className={`rounded-2xl border p-4 space-y-2 ${s.frame}`}>
                                {step.lines.map((line) => (
                                  <p
                                    key={line}
                                    className={`text-[12.5px] leading-relaxed font-mono ${s.text}`}
                                  >
                                    {step.kind === "process" && (
                                      <Sparkle className="inline w-3 h-3 mr-1.5 text-primary" />
                                    )}
                                    {line}
                                  </p>
                                ))}
                              </div>
                              {step.note && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{step.note}</p>
                              )}
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex -left-3" />
                    <CarouselNext className="hidden sm:flex -right-3" />
                  </Carousel>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {steps.map((s, i) => (
                        <button
                          key={s.title}
                          type="button"
                          aria-label={`Passo ${i + 1}`}
                          onClick={() => api?.scrollTo(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            current === i ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-primary/40"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Arraste para o lado · {current + 1}/{steps.length}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  onClick={() => onPrimary(assistant)}
                >
                  {assistant.free ? "Criar conta e usar grátis" : "Assinar e liberar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" className="sm:w-auto" onClick={() => onSecondary(assistant)}>
                  Ver no tour
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
