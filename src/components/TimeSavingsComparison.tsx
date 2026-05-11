import { Clock, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Comparativo de tempo: vende benefício, não funcionalidade.
 * Item 8 do plano "Simples, sexy e surpreendente".
 *
 * Premissa conservadora:
 *  - 8 min digitando uma anamnese estruturada vs 30s falando.
 *  - 7,5 min economizados por consulta.
 *  - 15 atendimentos/dia × 22 dias úteis ≈ 41 horas/mês.
 *    Apresentamos como "até 40 horas" para soar honesto e tangível.
 */
export function TimeSavingsComparison({ className }: { className?: string }) {
  return (
    <section
      aria-label="Quanto tempo você ganha com MedStation"
      className={cn("relative", className)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-primary/5 backdrop-blur-sm">
        {/* Glow accents */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative px-5 py-7 md:px-10 md:py-10">
          <div className="text-center mb-6 md:mb-8">
            <span className="inline-block font-mono text-2xs uppercase tracking-[0.22em] text-primary/90 border border-primary/30 rounded-sm px-2.5 py-1 mb-3">
              Quanto tempo você ganha
            </span>
            <h3 className="font-display text-xl md:text-3xl font-semibold tracking-tight">
              Otimize sua relação médico-paciente. <span className="italic text-primary">Compre seu tempo de volta.</span>
            </h3>
          </div>

          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
            {/* Sem MedStation */}
            <div className="rounded-xl border border-border/60 bg-card/70 p-5 md:p-6 text-center">
              <div className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Sem MedStation
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground/80">
                  8 min
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                digitando anamnese paciente por paciente
              </p>
            </div>

            {/* Com MedStation */}
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-5 md:p-6 text-center shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]">
              <div className="font-mono text-2xs uppercase tracking-[0.18em] text-primary mb-2">
                Com MedStation
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mic className="h-5 w-5 text-primary" />
                <span className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-primary">
                  30 seg
                </span>
              </div>
              <p className="text-xs md:text-sm text-foreground/80">
                falando — a anamnese sai pronta
              </p>
            </div>

            {/* Em 1 mês */}
            <div className="rounded-xl border border-border/60 bg-card/70 p-5 md:p-6 text-center">
              <div className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Em 1 mês de trabalho
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  até 40h
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                de volta para você, sua família, seu descanso
              </p>
            </div>
          </div>

          <p className="text-2xs md:text-xs text-muted-foreground/80 text-center mt-5 max-w-2xl mx-auto leading-relaxed">
            Estimativa baseada em 15 consultas por dia, 22 dias úteis, com economia média de 7,5 minutos por atendimento. Seu ganho real depende do seu volume.
          </p>
        </div>
      </div>
    </section>
  );
}
