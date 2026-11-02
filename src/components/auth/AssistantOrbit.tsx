import { useState } from "react";
import {
  Stethoscope, Activity, Wind, Calculator, Sigma, Pill,
  FileCheck, BookOpen, Compass, FileText, MessagesSquare, Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Anel com os 12 assistentes da MedStation girando lentamente num círculo
 * perfeito (de frente, sem inclinação — nunca oval). O círculo é sempre
 * quadrado (aspect-square) e cabe na altura da tela. Cada placa gira no
 * sentido contrário para continuar em pé. Ao passar o mouse, a órbita pausa,
 * a placa cresce e mostra uma frase de efeito.
 */

type Assistant = { name: string; Icon: LucideIcon; tagline: string };

const ASSISTANTS: Assistant[] = [
  { name: "Clínicus", Icon: Stethoscope, tagline: "Anamnese e evolução em segundos." },
  { name: "Examinus", Icon: Activity, tagline: "Interprete ou resuma exames sem fricção." },
  { name: "Gasometrus", Icon: Wind, tagline: "Gasometria à beira do leito." },
  { name: "Scorius", Icon: Calculator, tagline: "Scores clínicos na hora exata." },
  { name: "Numerus", Icon: Sigma, tagline: "Cálculos e doses sem erro." },
  { name: "Prescriptus", Icon: Pill, tagline: "Prescrição segura e inteligente." },
  { name: "Atestus", Icon: FileCheck, tagline: "Atestados com rigor e CID." },
  { name: "Protocolus", Icon: BookOpen, tagline: "Protocolos globais na ponta do dedo." },
  { name: "Orientus", Icon: Compass, tagline: "Orientações claras para o paciente." },
  { name: "CODexus", Icon: FileText, tagline: "Documentos clínicos organizados." },
  { name: "Mediscuss", Icon: MessagesSquare, tagline: "Discussão clínica quando precisar." },
  { name: "Legalis", Icon: Scale, tagline: "Blindagem jurídica e ética do registro." },
];

/** Raio do anel, em % do lado do quadrado (sobra espaço para os rótulos). */
const RADIUS_PCT = 41;
const SPIN_SECONDS = 90;

export function AssistantOrbit() {
  const [hovered, setHovered] = useState<number | null>(null);
  const playState = hovered === null ? "running" : "paused";

  return (
    <div
      className="relative mx-auto aspect-square"
      style={{ width: "min(100%, 44rem, calc(100vh - 6rem))", minWidth: "26rem" }}
      aria-hidden="true"
    >
      {/* brilho ambiente atrás da órbita */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-1/2 w-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      {/* Anel-guia: círculo perfeito */}
      <div
        className="pointer-events-none absolute rounded-full border border-primary/25"
        style={{ inset: `${50 - RADIUS_PCT}%` }}
      />

      {/* Texto central dentro da órbita */}
      <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center px-[18%]">
        <div className="inline-flex items-center gap-2.5 text-[0.8rem] xl:text-[0.85rem] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="h-px w-9 bg-primary/70" />
          Para médicos ocupados
        </div>
        <h2 className="mt-3.5 font-display text-4xl xl:text-5xl leading-[0.98] tracking-tight text-foreground">
          Produza mais.
          <br />
          <span className="italic text-primary">Digite menos.</span>
        </h2>
        <p className="mt-4 text-sm xl:text-base text-muted-foreground leading-relaxed max-w-[20rem]">
          Documentação, Decisão e Fluxo em uma só plataforma. Em segundos, no seu fluxo.
        </p>
      </div>

      {/* Órbita girando */}
      <div
        className="orb-spin absolute inset-0 z-10"
        style={{ animationDuration: `${SPIN_SECONDS}s`, animationPlayState: playState }}
      >
        {ASSISTANTS.map(({ name, Icon, tagline }, i) => {
          const angle = (i / ASSISTANTS.length) * Math.PI * 2 - Math.PI / 2;
          const left = 50 + Math.cos(angle) * RADIUS_PCT;
          const top = 50 + Math.sin(angle) * RADIUS_PCT;
          const isHover = hovered === i;
          const dim = hovered !== null && !isHover;
          return (
            <div
              key={name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%`, zIndex: isHover ? 30 : 1 }}
            >
              {/* gira ao contrário para a placa ficar sempre em pé */}
              <div
                className="orb-spin-rev"
                style={{ animationDuration: `${SPIN_SECONDS}s`, animationPlayState: playState }}
              >
                <div
                  className="orb-bob relative flex flex-col items-center gap-1.5 select-none cursor-pointer transition-[transform,opacity] duration-200"
                  style={{
                    animationDelay: `${i * 0.3}s`,
                    transform: isHover ? "scale(1.3)" : "scale(1)",
                    opacity: dim ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className={`absolute bottom-full mb-2.5 whitespace-nowrap rounded-full border border-primary/40 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-md transition-all duration-200 ${
                      isHover ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
                    }`}
                  >
                    {tagline}
                  </div>
                  <div
                    className={`h-14 w-14 xl:h-16 xl:w-16 rounded-2xl border grid place-items-center backdrop-blur-sm transition-all duration-200 ${
                      isHover
                        ? "border-primary bg-primary/20 shadow-[0_16px_36px_-10px_hsl(var(--primary)/0.8),inset_0_1px_0_hsl(var(--primary)/0.5)]"
                        : "border-primary/30 bg-primary/10 shadow-[0_12px_28px_-12px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(var(--primary)/0.35)]"
                    }`}
                  >
                    <Icon className="h-6 w-6 xl:h-[26px] xl:w-[26px] text-primary" strokeWidth={1.6} />
                  </div>
                  <span
                    className={`text-[11px] xl:text-[12px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors duration-200 ${
                      isHover ? "text-primary" : "text-muted-foreground/80"
                    }`}
                  >
                    {name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes orb-spin-kf { to { transform: rotate(360deg); } }
        @keyframes orb-spin-rev-kf { to { transform: rotate(-360deg); } }
        @keyframes orb-bob-kf {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -6px; }
        }
        .orb-spin { animation: orb-spin-kf linear infinite; }
        .orb-spin-rev { animation: orb-spin-rev-kf linear infinite; }
        .orb-bob { animation: orb-bob-kf 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .orb-spin, .orb-spin-rev, .orb-bob { animation: none; }
        }
      `}</style>
    </div>
  );
}
