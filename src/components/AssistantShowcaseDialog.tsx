import { useEffect, useState } from "react";
import { LucideIcon, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
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
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AssistantSlide {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  example?: { label: string; lines: string[] };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  shortDesc: string;
  fullDesc: string;
  icon: LucideIcon;
  slides: AssistantSlide[];
  code: string;
}

export function AssistantShowcaseDialog({
  open,
  onOpenChange,
  name,
  shortDesc,
  fullDesc,
  icon: Icon,
  slides,
  code,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Reset to first slide when reopened
  useEffect(() => {
    if (open && api) api.scrollTo(0, true);
  }, [open, api]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 border-border/60 bg-card">
        {/* Header */}
        <DialogHeader className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-border/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded border border-hairline bg-background/40 flex items-center justify-center">
              <Icon strokeWidth={1.5} className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="font-display text-lg sm:text-xl tracking-tight text-foreground">
                  {name}
                </DialogTitle>
                <span className="text-[0.55rem] uppercase tracking-[0.2em] font-mono text-muted-foreground/70">
                  {code}
                </span>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {fullDesc}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Carousel */}
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: false }}
          className="w-full"
        >
          <CarouselContent>
            {slides.map((s, i) => (
              <CarouselItem key={i}>
                <div className="px-5 sm:px-7 py-6 sm:py-8 min-h-[280px] sm:min-h-[320px] flex flex-col">
                  <div className="inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.22em] font-mono text-primary mb-3">
                    <span className="h-px w-6 bg-primary" />
                    {s.eyebrow}
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl tracking-tight text-foreground leading-tight mb-3">
                    {s.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                    {s.body}
                  </p>

                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-2.5 text-sm text-foreground/90">
                          <span className="mt-[7px] h-1 w-1 rounded-full bg-primary shrink-0" />
                          <span className="leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.example && (
                    <div className="mt-5 rounded-md border border-hairline bg-background/60 p-3 sm:p-4">
                      <div className="text-[0.55rem] uppercase tracking-[0.22em] font-mono text-muted-foreground mb-2">
                        {s.example.label}
                      </div>
                      <div className="font-mono text-[11px] sm:text-xs text-foreground/85 space-y-1 leading-relaxed">
                        {s.example.lines.map((ln, k) => (
                          <div key={k} className="whitespace-pre-wrap">{ln}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Footer / Controls */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-border/50 bg-background/40">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir para slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] uppercase tracking-[0.18em] font-mono text-muted-foreground hidden sm:inline">
              {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => api?.scrollPrev()}
              disabled={current === 0}
              aria-label="Slide anterior"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {current < total - 1 ? (
              <Button
                size="sm"
                className="h-8 px-3 gap-1.5"
                onClick={() => api?.scrollNext()}
              >
                Próximo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 px-3 gap-1.5"
                onClick={() => onOpenChange(false)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Entendi
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
