import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  label: string;
  src: string;
  poster?: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "consultorio",
    label: "Modo Consultório",
    src: "/hero/hero.mp4",
    poster: "/hero/hero-poster.jpg",
  },
  // Próximos vídeos (Modo Exames, demais assistentes) serão adicionados aqui.
];

interface HeroVideoProps {
  slides?: HeroSlide[];
}

/**
 * Carrossel de vídeos do hero. Cada slide demonstra uma capacidade da MedStation.
 * Autoplay muted, avança automaticamente ao terminar (se houver mais de 1 slide).
 */
export function HeroVideo({ slides = DEFAULT_SLIDES }: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const single = slides.length <= 1;
  const current = slides[index];

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [index]);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  };

  const handlePlay = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    setStarted(true);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  };

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  return (
    <div className="relative group max-w-3xl mx-auto">
      <div className="absolute -inset-2 bg-primary/15 rounded-3xl blur-2xl opacity-60" />
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/60 bg-black shadow-2xl">
        <video
          key={current.id}
          ref={ref}
          src={current.src}
          poster={current.poster}
          autoPlay
          muted={muted}
          loop={single}
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          onPlay={() => setStarted(true)}
          onEnded={() => { if (!single) next(); }}
        />

        {!started && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity hover:bg-black/40"
            aria-label="Reproduzir vídeo"
          >
            <span className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
              <Play className="h-7 w-7 text-primary-foreground translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )}

        {/* Label do slide atual */}
        {!single && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 text-white text-[11px] font-medium">
            {current.label}
          </div>
        )}

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="absolute bottom-3 right-3 h-9 px-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 text-white text-xs flex items-center gap-1.5 hover:bg-black/80 transition-colors"
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {muted ? "Som" : "Mudo"}
        </button>

        {/* Setas de navegação */}
        {!single && (
          <>
            <button
              onClick={prev}
              aria-label="Vídeo anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Próximo vídeo"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Indicadores */}
      {!single && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Ir para ${s.label}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
