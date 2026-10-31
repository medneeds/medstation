import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { REAL_USERS } from "@/data/realUsers";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  className?: string;
};

/** Carrossel de médicos reais: avança sozinho, aceita arrastar e setas. */
export function RealUsersCarousel({
  title = "Médicos reais que já usam a MedStation",
  subtitle = "Plantão, UTI, emergência e consultório — no dia a dia de quem atende.",
  className,
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  const scrollTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = REAL_USERS.length;
    const next = ((i % n) + n) % n;
    const card = el.children[next] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      const el = track.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      scrollTo(atEnd ? 0 : index + 1);
    }, 3200);
    return () => window.clearInterval(id);
  }, [paused, index]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let dist = Infinity;
    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (d < dist) { dist = d; best = i; }
    });
    setIndex(best);
  };

  return (
    <section className={cn("py-14 md:py-20", className)}>
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">{subtitle}</p>
        </div>

        <div
          className="relative mt-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => window.setTimeout(() => setPaused(false), 4000)}
        >
          <div
            ref={track}
            onScroll={onScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {REAL_USERS.map((u) => (
              <figure
                key={u.name}
                className="snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-[calc(25%-12px)] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
              >
                <div className="aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={u.photo}
                    alt={`Foto de ${u.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <figcaption className="p-4">
                  <p className="font-semibold text-foreground">{u.name}</p>
                  {u.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {u.location}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-snug text-muted-foreground">{u.practice}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollTo(index - 1)}
            className="hidden md:flex absolute -left-4 top-1/3 h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 shadow hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => scrollTo(index + 1)}
            className="hidden md:flex absolute -right-4 top-1/3 h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 shadow hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {REAL_USERS.map((u, i) => (
            <button
              key={u.name}
              type="button"
              aria-label={`Ver ${u.name}`}
              onClick={() => scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
