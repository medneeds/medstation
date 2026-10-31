import founderPhoto from "@/assets/real-users/dr-artur-batista.jpg.asset.json";
import { cn } from "@/lib/utils";

/** Médico fundador — texto adaptado da biografia em arturbatista.com. */
export function FounderSection({ className }: { className?: string }) {
  return (
    <section className={cn("py-14 md:py-20", className)}>
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
          <div className="relative mx-auto w-full max-w-xs md:max-w-none">
            <div className="absolute -inset-3 rounded-3xl bg-primary/10 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted shadow-lg">
              <img
                src={founderPhoto.url}
                alt="Dr. Artur Batista, médico fundador da MedStation"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover object-top"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Médico fundador</p>
            <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight">
              Criada por quem vive o plantão.
            </h2>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-muted-foreground">
              Sou Artur Batista, médico plantonista com 5 anos de experiência em Medicina de Emergência e
              Terapia Intensiva. Entre a sala vermelha e a UTI, percebi sempre a mesma coisa:
            </p>
            <blockquote className="mt-5 border-l-2 border-primary pl-4 text-base md:text-lg font-medium leading-snug text-foreground">
              “A maior parte do tempo do plantonista não é decidindo. É tentando organizar o que já foi decidido.”
            </blockquote>
            <p className="mt-5 text-sm md:text-base leading-relaxed text-muted-foreground">
              A MedStation nasceu disso: tirar do caminho o trabalho repetitivo e burocrático para você
              produzir mais e digitar menos. A decisão é sempre do médico.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px w-8 bg-border" aria-hidden />
              <p className="text-sm">
                <span className="font-semibold text-foreground">Dr. Artur Batista</span>
                <span className="text-muted-foreground"> · Médico · CRM/MA 11788</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
