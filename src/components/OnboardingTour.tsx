import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, FileText, Sparkles, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "medstation_onboarding_v1_seen";

type Slide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  visual: "consultorio" | "exames" | "assistentes";
  icon: React.ComponentType<{ className?: string }>;
};

const slides: Slide[] = [
  {
    eyebrow: "1 · Modo Consultório",
    title: "Atenda falando. A anamnese aparece pronta.",
    subtitle:
      "Olhe pro paciente. A MedStation escuta a consulta e devolve o registro estruturado em segundos.",
    visual: "consultorio",
    icon: Mic,
  },
  {
    eyebrow: "2 · Examinus",
    title: "Resuma qualquer exame em segundos.",
    subtitle:
      "Envie o PDF do laboratório e receba o resultado em linha, pronto pra colar no prontuário.",
    visual: "exames",
    icon: FileText,
  },
  {
    eyebrow: "3 · Ecossistema completo",
    title: "10 assistentes clínicos sempre à mão.",
    subtitle:
      "Anamnese, exames, prescrições, gasometria, atestados e protocolos — tudo num só lugar.",
    visual: "assistentes",
    icon: Sparkles,
  },
];

function VisualConsultorio() {
  return (
    <video
      key="v-consultorio"
      src="/hero/hero.mp4"
      poster="/hero/hero-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function VisualExames() {
  return (
    <video
      key="v-exames"
      src="/hero/exames.mp4"
      poster="/hero/exames-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function VisualAssistentes() {
  const items = [
    { n: "C", name: "Clínicus" },
    { n: "E", name: "Examinus" },
    { n: "P", name: "Prescriptus" },
    { n: "G", name: "Gasometrus" },
    { n: "A", name: "Atestus" },
    { n: "O", name: "Orientus" },
    { n: "S", name: "Scorius" },
    { n: "N", name: "Numerus" },
    { n: "Pr", name: "Protocolus" },
    { n: "Cd", name: "CODexus" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-6">
      <div className="grid grid-cols-5 gap-3 max-w-md w-full">
        {items.map((it, i) => (
          <div
            key={it.name}
            className="aspect-square rounded-xl border border-primary/30 bg-card/70 backdrop-blur flex flex-col items-center justify-center gap-1 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <div className="text-xl font-bold text-primary font-display">{it.n}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  const close = (goConsultorio = false) => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
    if (goConsultorio) {
      setTimeout(() => navigate("/consultorio"), 200);
    }
  };

  if (!open) return null;

  const current = slides[step];
  const isLast = step === slides.length - 1;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-md"
        onClick={() => close(false)}
      />

      {/* Card */}
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-scale-in">
        {/* Skip button */}
        <button
          onClick={() => close(false)}
          className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Pular tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Visual */}
        <div className="relative aspect-[16/9] bg-background overflow-hidden">
          {current.visual === "consultorio" && <VisualConsultorio />}
          {current.visual === "exames" && <VisualExames />}
          {current.visual === "assistentes" && <VisualAssistentes />}
          {/* Soft top gradient */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background/60 to-transparent pointer-events-none" />
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {current.eyebrow}
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">
            {current.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            {current.subtitle}
          </p>

          {/* Footer */}
          <div className="mt-7 flex items-center justify-between gap-4">
            {/* Dots */}
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Ir para passo ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => close(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Pular
              </Button>
              {isLast ? (
                <Button
                  size="sm"
                  onClick={() => close(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Começar agora
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => Math.min(s + 1, slides.length - 1))}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
