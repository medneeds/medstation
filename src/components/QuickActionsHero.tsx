import { Link } from "react-router-dom";
import { Mic, FlaskConical, Pill, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hero de ações rápidas para a tela inicial do médico.
 * 4 cartões grandes com linguagem de ação direta — não de produto.
 * Paleta unificada em torno de primary (Pastel Green) + Clinical Gray,
 * mantendo a identidade visual da plataforma.
 */

const actions = [
  {
    label: "Atender paciente",
    helper: "Grave a consulta e receba a anamnese pronta",
    icon: Mic,
    url: "/consultorio",
    accent: "from-primary/25 via-primary/12 to-transparent",
    iconBg: "bg-primary/15 text-primary",
    border: "hover:border-primary/50",
  },
  {
    label: "Resumir exame",
    helper: "Cole, fotografe ou envie o PDF e receba o resumo",
    icon: FlaskConical,
    url: "/examinus",
    accent: "from-primary/18 via-primary/8 to-transparent",
    iconBg: "bg-primary/10 text-primary",
    border: "hover:border-primary/40",
  },
  {
    label: "Dúvidas de prescrição",
    helper: "Tire dúvidas de medicamentos com bula inteligente",
    icon: Pill,
    url: "/prescriptus",
    accent: "from-muted/40 via-muted/20 to-transparent",
    iconBg: "bg-muted text-foreground/80",
    border: "hover:border-foreground/30",
  },
  {
    label: "Estruturar anamnese",
    helper: "Discuta o caso ou gere a anamnese hospitalar com o Clínicus",
    icon: FileText,
    url: "/clinicus",
    accent: "from-primary/22 via-primary/10 to-transparent",
    iconBg: "bg-primary/12 text-primary",
    border: "hover:border-primary/45",
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
