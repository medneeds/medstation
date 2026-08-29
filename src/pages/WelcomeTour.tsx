import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, FlaskConical, LayoutGrid, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

/**
 * Tour de boas-vindas em 3 telas, mostrado uma única vez no primeiro acesso.
 * Item 5 do plano "Simples, sexy e surpreendente": ensinar com animação,
 * não com texto. Cada tela traz uma mini-demonstração visual do produto.
 */

const TOUR_SEEN_KEY = "medstation:welcomeTourSeen";

export const markWelcomeTourSeen = () => {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "true");
  } catch {
    /* ignore quota errors */
  }
};

export const hasSeenWelcomeTour = () => {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "true";
  } catch {
    return true; // se localStorage falhar, não bloqueamos o usuário
  }
};

interface Slide {
  badge: string;
  title: string;
  subtitle: string;
  illustration: JSX.Element;
}

function VoiceToTextIllustration() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-8 px-6">
      {/* Microfone com pulso */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
        />
        <div className="relative h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_18px_44px_-12px_hsl(var(--primary)/0.7)]">
          <Mic className="h-10 w-10" />
        </div>
      </div>

      {/* Waveform animado */}
      <div className="flex items-end gap-1.5 h-12">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 bg-primary rounded-full"
            animate={{ height: ["20%", `${30 + ((i * 17) % 70)}%`, "20%"] }}
            transition={{
              duration: 1.1 + (i % 5) * 0.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.05,
            }}
          />
        ))}
      </div>

      {/* Texto sendo "digitado" */}
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 text-left shadow-lg">
        <div className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Anamnese
        </div>
        <motion.p
          className="text-sm md:text-base text-foreground leading-relaxed"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.4, ease: "easeOut" }}
          style={{ overflow: "hidden", whiteSpace: "nowrap" }}
        >
          Paciente refere dor torácica há 2 dias…
        </motion.p>
      </div>
    </div>
  );
}

function ExamSummaryIllustration() {
  const rows = [
    { name: "Hemoglobina", value: "9,8 g/dL", flag: true },
    { name: "Leucócitos", value: "12.400", flag: true },
    { name: "Plaquetas", value: "230.000", flag: false },
    { name: "Creatinina", value: "1,1 mg/dL", flag: false },
    { name: "PCR", value: "85 mg/L", flag: true },
  ];
  return (
    <div className="relative w-full h-full flex items-center justify-center px-6">
      <div className="relative w-full max-w-sm">
        {/* Cartão "exame bruto" atrás */}
        <motion.div
          className="absolute inset-0 rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-4"
          initial={{ x: -8, y: 8, rotate: -3, opacity: 0 }}
          animate={{ x: -16, y: 16, rotate: -4, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Exame
          </div>
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.name} className="flex justify-between text-xs text-muted-foreground/80">
                <span>{r.name}</span>
                <span>{r.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Cartão "resumo" na frente */}
        <motion.div
          className="relative rounded-xl border border-primary/40 bg-card/95 backdrop-blur-sm p-5 shadow-[0_18px_44px_-16px_hsl(var(--primary)/0.5)]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-primary">
              Resumo organizado
            </span>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <motion.li
                key={r.name}
                className="flex items-center justify-between text-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + i * 0.12 }}
              >
                <span className="text-foreground/90">{r.name}</span>
                <span className={r.flag ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {r.value}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

function AssistantsGridIllustration() {
  const dots = Array.from({ length: 10 });
  return (
    <div className="relative w-full h-full flex items-center justify-center px-6">
      <div className="grid grid-cols-5 gap-3 md:gap-4">
        {dots.map((_, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center text-primary"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.4,
              delay: i * 0.06,
              type: "spring",
              stiffness: 200,
              damping: 18,
            }}
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.1 }}
            >
              <FlaskConical className="h-6 w-6 md:h-7 md:w-7" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    badge: "01 — Modo Escuta",
    title: "Fale. A anamnese aparece.",
    subtitle: "Grave a consulta com o paciente. O assistente escuta, organiza e devolve o texto pronto pra colar no prontuário.",
    illustration: <VoiceToTextIllustration />,
  },
  {
    badge: "02 — Examinus",
    title: "Cole o exame. Receba o resumo.",
    subtitle: "Texto, foto ou PDF. Em segundos, você recebe os exames organizados por categoria, com o que importa em destaque.",
    illustration: <ExamSummaryIllustration />,
  },
  {
    badge: "03 — Sua estação clínica",
    title: "Toda a estação, 1 clique.",
    subtitle: "Anamnese, exames, prescrição, gasometria, scores, atestados, protocolos e mais — sempre à mão, no celular ou no computador.",
    illustration: <AssistantsGridIllustration />,
  },
];

export default function WelcomeTour() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  // Marca como visto assim que entra — evita loops se o usuário fechar a aba
  useEffect(() => {
    markWelcomeTourSeen();
  }, []);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = () => navigate("/dashboard", { replace: true });
  const next = () => (isLast ? finish() : setIndex((i) => i + 1));

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Backdrop ambiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-primary/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,hsl(var(--primary)/0.25),transparent)] pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 py-4">
        <Logo size="sm" />
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={finish}
        >
          Pular tour
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 md:px-8 pb-10">
        {/* Indicadores de passo */}
        <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir para passo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-10 bg-primary" : "w-6 bg-border hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center min-h-[60vh]">
          {/* Texto */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="order-2 md:order-1"
            >
              <span className="font-mono text-2xs uppercase tracking-[0.22em] text-primary/90 border border-primary/30 rounded-sm px-2.5 py-1">
                {slide.badge}
              </span>
              <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mt-4 mb-4 leading-[1.05]">
                {slide.title}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md">
                {slide.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Ilustração animada */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`ill-${index}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="order-1 md:order-2 relative h-[260px] md:h-[420px] rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              {slide.illustration}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Ação */}
        <div className="flex items-center justify-center mt-8 md:mt-10">
          <Button size="lg" onClick={next} className="font-semibold">
            {isLast ? "Começar a usar" : "Próximo"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
