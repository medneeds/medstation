import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  AD,
  Scene1Clock,
  Scene2Turn,
  Scene3BrainVsKeyboard,
  Scene4Stack,
  Scene5Brand,
  Scene6Engine,
  Scene7Modules,
  Scene8Lock,
  Scene9Approve,
  Scene10Cta,
  type SceneProps,
} from "@/components/ad-video/scenes";

/* ────────────────────────────────────────────────────────────────
   TIMELINE — ajuste os tempos aqui depois de ouvir a narração final.
   start/end em segundos, cortes secos (sem fade).
   ──────────────────────────────────────────────────────────────── */
const SCENES: { id: string; start: number; end: number; Component: React.FC<SceneProps> }[] = [
  { id: "relogio", start: 0, end: 6, Component: Scene1Clock },
  { id: "virada", start: 6, end: 9, Component: Scene2Turn },
  { id: "cerebro-teclado", start: 9, end: 16, Component: Scene3BrainVsKeyboard },
  { id: "pilha", start: 16, end: 23, Component: Scene4Stack },
  { id: "marca", start: 23, end: 28, Component: Scene5Brand },
  { id: "motor", start: 28, end: 36, Component: Scene6Engine },
  { id: "modulos", start: 36, end: 41, Component: Scene7Modules },
  { id: "lock", start: 41, end: 47, Component: Scene8Lock },
  { id: "aprovar", start: 47, end: 51, Component: Scene9Approve },
  { id: "cta", start: 51, end: 57, Component: Scene10Cta },
];

const TOTAL = SCENES[SCENES.length - 1].end;
const NARRATION_SRC = "/ad/narration.mp3";

export default function AdVideo() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>();
  const captureParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("t") : null;
  const captureTime = captureParam !== null ? Number(captureParam) : null;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState(NARRATION_SRC);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (a) setTime(a.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), []);

  const start = async () => {
    const a = audioRef.current;
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
    if (a) {
      a.currentTime = 0;
      try {
        await a.play();
      } catch {
        /* sem áudio: a timeline roda pelo relógio do próprio elemento */
      }
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setTime(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    const { data, error } = await supabase.functions.invoke("generate-ad-narration", { body: {} });
    setGenerating(false);
    if (error || !data?.audioContent) {
      setGenError("Não foi possível gerar a narração. Suba um .mp3 manualmente.");
      return;
    }
    setSrc(`data:audio/mpeg;base64,${data.audioContent}`);
  };

  const shownTime = captureTime !== null ? captureTime : time;
  const active =
    SCENES.find((s) => shownTime >= s.start && shownTime < s.end) ??
    (playing || captureTime !== null ? null : SCENES[0]);

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Ad video</title>
      </Helmet>

      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "#000", cursor: playing ? "none" : "default" }}
      >
        <div
          className="relative overflow-hidden"
          style={{ width: 1080, height: 1920, background: AD.bg }}
        >
          {active && (
            <active.Component
              key={active.id}
              t={shownTime - active.start}
              dur={active.end - active.start}
            />
          )}

          {!playing && captureTime === null && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-12 bg-black/85">
              <button
                onClick={start}
                className="flex h-[220px] w-[220px] items-center justify-center rounded-full font-bold uppercase"
                style={{ border: `4px solid ${AD.accent}`, color: AD.white, fontSize: 44 }}
              >
                Play
              </button>

              <div className="flex flex-col items-center gap-5 font-mono text-2xl text-white/70">
                <button
                  onClick={generate}
                  className="border px-8 py-4 uppercase"
                  style={{ borderColor: "rgba(255,255,255,0.3)" }}
                >
                  {generating ? "Gerando narração…" : "Gerar narração (ElevenLabs)"}
                </button>
                <label className="cursor-pointer border px-8 py-4 uppercase" style={{ borderColor: "rgba(255,255,255,0.3)" }}>
                  Subir .mp3 próprio
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSrc(URL.createObjectURL(f));
                    }}
                  />
                </label>
                {genError && <span style={{ color: AD.amber }}>{genError}</span>}
                <span>
                  {TOTAL}s · 1080x1920 · Esc para reiniciar
                </span>
              </div>
            </div>
          )}
        </div>

        <audio ref={audioRef} src={src} preload="auto" onEnded={() => setPlaying(false)} />
      </div>
    </>
  );
}
