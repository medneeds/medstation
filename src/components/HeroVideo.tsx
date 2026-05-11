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
  { id: "exames", label: "Modo Exames", src: "/hero/exames.mp4", poster: "/hero/exames-poster.jpg" },
];

interface HeroVideoProps {
  slides?: HeroSlide[];
}

/**
 * Carrossel de vídeos do hero com crossfade fluido.
 * Mantém duas tags <video> em paralelo: uma ativa, uma pré-carregando o próximo
 * slide. Ao avançar, faz fade entre elas e troca o slide pré-carregado.
 */
export function HeroVideo({ slides = DEFAULT_SLIDES }: HeroVideoProps) {
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [active, setActive] = useState(0); // qual <video> está visível (0 ou 1)
  const [indexes, setIndexes] = useState<[number, number]>([0, 1 % slides.length]);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const single = slides.length <= 1;
  const currentSlide = slides[indexes[active]];

  const advance = () => {
    if (single) return;
    const nextActive = active === 0 ? 1 : 0;
    const nextSlideIdx = (indexes[active] + 1) % slides.length;
    // garante que o vídeo do próximo slot esteja pronto e tocando do início
    const nextVideo = refs[nextActive].current;
    if (nextVideo) {
      try { nextVideo.currentTime = 0; } catch {}
      nextVideo.muted = muted;
      nextVideo.play().catch(() => {});
    }
    setActive(nextActive);
    // após o crossfade, atualiza o slot inativo para o slide seguinte ao próximo
    window.setTimeout(() => {
      setIndexes((prev) => {
        const n = [...prev] as [number, number];
        n[active] = (nextSlideIdx + 1) % slides.length;
        return n;
      });
    }, 700);
  };

  // pré-carrega slot inativo
  useEffect(() => {
    const v = refs[active === 0 ? 1 : 0].current;
    if (v) { try { v.load(); } catch {} }
  }, [indexes, active]);

  const toggleSound = () => {
    const v = refs[active].current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    refs.forEach(r => { if (r.current) r.current.muted = v.muted; });
    if (v.paused) v.play().catch(() => {});
  };

  const handlePlay = () => {
    const v = refs[active].current;
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

  const goTo = (target: number) => {
    if (target === indexes[active]) return;
    const nextActive = active === 0 ? 1 : 0;
    setIndexes((prev) => {
      const n = [...prev] as [number, number];
      n[nextActive] = target;
      return n;
    });
    requestAnimationFrame(() => {
      const nv = refs[nextActive].current;
      if (nv) { try { nv.currentTime = 0; } catch {} nv.muted = muted; nv.play().catch(() => {}); }
      setActive(nextActive);
    });
  };

  const next = () => goTo((indexes[active] + 1) % slides.length);
  const prev = () => goTo((indexes[active] - 1 + slides.length) % slides.length);

  return (
    <div className="relative group max-w-3xl mx-auto">
      <div className="absolute -inset-2 bg-primary/15 rounded-3xl blur-2xl opacity-60" />
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/60 bg-black shadow-2xl">
        {[0, 1].map((slot) => {
          const slide = slides[indexes[slot]];
          const isActive = slot === active;
          return (
            <video
              key={`${slot}-${slide.id}`}
              ref={refs[slot]}
              src={slide.src}
              poster={slide.poster}
              autoPlay={isActive}
              muted={muted}
              loop={single}
              playsInline
              preload="auto"
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out",
                isActive ? "opacity-100" : "opacity-0",
              )}
              onPlay={() => { if (isActive) setStarted(true); }}
              onEnded={() => { if (isActive) advance(); }}
            />
          );
        })}

        {!started && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm hover:bg-black/40"
            aria-label="Reproduzir vídeo"
          >
            <span className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
              <Play className="h-7 w-7 text-primary-foreground translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )}

        {!single && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 text-white text-[11px] font-medium">
            {currentSlide.label}
          </div>
        )}

        <button
          onClick={toggleSound}
          className="absolute bottom-3 right-3 h-9 px-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 text-white text-xs flex items-center gap-1.5 hover:bg-black/80"
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {muted ? "Som" : "Mudo"}
        </button>

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

      {!single && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Ir para ${s.label}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === indexes[active] ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
