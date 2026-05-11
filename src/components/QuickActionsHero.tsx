import { Link } from "react-router-dom";
import { Mic, FlaskConical, Pill, Stethoscope, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hero de ações rápidas para a tela inicial do médico.
 * 4 cartões grandes com linguagem de ação direta — não de produto.
 * Item 4 do plano "Simples, sexy e surpreendente".
 */

const actions = [
  {
    label: "Atender paciente",
    helper: "Grave a consulta e receba a anamnese pronta",
    icon: Mic,
    url: "/consultorio",
    accent: "from-primary/25 via-primary/15 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
    border: "hover:border-primary/50",
  },
  {
    label: "Resumir exame",
    helper: "Cole, fotografe ou envie o PDF e receba o resumo",
    icon: FlaskConical,
    url: "/examinus",
    accent: "from-purple-500/20 via-purple-500/10 to-transparent",
    iconBg: "bg-purple-500/15 text-purple-500",
    border: "hover:border-purple-500/50",
  },
  {
    label: "Dúvidas de prescrição",
    helper: "Tire dúvidas de medicamentos com bula inteligente",
    icon: Pill,
    url: "/prescriptus",
    accent: "from-orange-500/20 via-orange-500/10 to-transparent",
    iconBg: "bg-orange-500/15 text-orange-500",
    border: "hover:border-orange-500/50",
  },
  {
    label: "Tirar dúvida clínica",
    helper: "Pergunte ao Clínicus sobre conduta, raciocínio ou caso",
    icon: Stethoscope,
    url: "/clinicus",
    accent: "from-blue-500/20 via-blue-500/10 to-transparent",
    iconBg: "bg-blue-500/15 text-blue-500",
    border: "hover:border-blue-500/50",
  },
];

export function QuickActionsHero() {
  return (
    <section aria-label="O que você quer fazer agora?">
      <div className="flex items-baseline justify-between mb-3 md:mb-4">
        <h2 className="font-display text-lg md:text-xl font-semibold tracking-tight">
          O que você quer fazer agora?
        </h2>
        <span className="hidden md:block font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground/70">
          1 clique
        </span>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {actions.map(({ label, helper, icon: Icon, url, accent, iconBg, border }) => (
          <Link
            key={label}
            to={url}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm",
              "p-4 md:p-5 min-h-[140px] md:min-h-[170px]",
              "flex flex-col justify-between",
              "transition-all duration-300 ease-out",
              "hover:-translate-y-0.5 hover:shadow-elevated",
              border,
            )}
          >
            {/* Glow */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500",
                "bg-gradient-to-br",
                accent,
              )}
            />

            <div className="relative flex items-start justify-between">
              <div
                className={cn(
                  "rounded-xl p-2.5 md:p-3 border border-border/60 transition-transform duration-300 group-hover:scale-[1.05]",
                  iconBg,
                )}
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
            </div>

            <div className="relative mt-3 md:mt-4">
              <h3 className="font-display text-base md:text-lg font-semibold tracking-tight leading-tight">
                {label}
              </h3>
              <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-snug line-clamp-2">
                {helper}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
