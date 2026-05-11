import { useRef, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";

/**
 * Vídeo hero da landing — 15s, gerado por IA + narração + música.
 * Autoplay muted (padrão dos navegadores). Botão de som para ativar áudio.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);

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

  return (
    <div className="relative group max-w-3xl mx-auto">
      <div className="absolute -inset-2 bg-primary/15 rounded-3xl blur-2xl opacity-60" />
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/60 bg-black shadow-2xl">
        <video
          ref={ref}
          src="/hero/hero.mp4"
          poster="/hero/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          onPlay={() => setStarted(true)}
        />

        {/* Play overlay: aparece antes do primeiro play (se autoplay falhar) */}
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

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="absolute bottom-3 right-3 h-9 px-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 text-white text-xs flex items-center gap-1.5 hover:bg-black/80 transition-colors"
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {muted ? "Som" : "Mudo"}
        </button>
      </div>
    </div>
  );
}
