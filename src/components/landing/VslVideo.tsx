import { useRef, useState } from "react";
import { Play } from "lucide-react";
import vslVideo from "@/assets/videos/vsl-black-horizontal-v5.mp4.asset.json";
import vslCover from "@/assets/videos/vsl-black-capa-horizontal.jpg.asset.json";
import { trackCtaClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Vídeo de vendas horizontal da Black. Mostra só a capa até o médico tocar em
 * "Assistir" — o vídeo não é baixado antes disso, para não pesar a página.
 */
export function VslVideo({ className }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = () => {
    trackCtaClick({ cta: "black_vsl_play", section: "black", destination: "video" });
    setPlaying(true);
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => undefined);
    });
  };

  return (
    <div
      className={cn(
        "relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-offer-gold/40 bg-offer shadow-[0_30px_60px_-30px_hsl(var(--offer-gold)/0.55)]",
        className,
      )}
    >
      {playing ? (
        <video
          ref={videoRef}
          src={vslVideo.url}
          poster={vslCover.url}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="h-full w-full bg-offer object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={start}
          aria-label="Assistir ao vídeo da Black MedStation (1 minuto e 51 segundos)"
          className="group absolute inset-0 h-full w-full"
        >
          <img
            src={vslCover.url}
            alt="Capa do vídeo: Você virou médico para cuidar. Não para digitar."
            className="h-full w-full object-cover"
            decoding="async"
          />
          <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <span className="absolute h-16 w-16 rounded-full bg-offer-gold/40 motion-safe:animate-ping md:h-20 md:w-20" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-offer-gold text-offer-gold-foreground shadow-[0_10px_30px_-6px_hsl(var(--offer-gold)/0.8)] transition-transform duration-300 group-hover:scale-110 md:h-20 md:w-20">
              <Play className="ml-1 h-7 w-7 fill-current md:h-8 md:w-8" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
