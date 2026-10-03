import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, MicOff, Sparkles, X, Check, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { canUseVoice } from "@/lib/voiceAccess";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface VoiceDeliveryOptions {
  /** Trecho ao vivo já entregue que deve ser substituído por este texto (revisão do áudio completo). */
  replace?: string;
}

interface AgentVoiceInputProps {
  onTranscription: (text: string, options?: VoiceDeliveryOptions) => void;
  disabled?: boolean;
  context?: string;
  /**
   * true (padrão): cada frase entra no campo assim que é reconhecida.
   * false: entrega o texto completo uma única vez, ao tocar em ✓.
   */
  incremental?: boolean;
}

type LiveHealth = "connecting" | "live" | "reconnecting" | "backup";

const WAVEFORM_BARS = 28;
const MAX_RECORDING_SECONDS = 900; // 15 minutos
const LIVE_CONNECT_TIMEOUT_MS = 7000;
const MAX_RECONNECTS = 3;

const vibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* no-op */
  }
};

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race<T>([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

export function AgentVoiceInput({ onTranscription, disabled = false, context, incremental = true }: AgentVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => Array(WAVEFORM_BARS).fill(0));
  const [health, setHealth] = useState<LiveHealth>("connecting");
  const [liveCommitted, setLiveCommitted] = useState("");
  const [livePartial, setLivePartial] = useState("");
  const [hasPendingRetry, setHasPendingRetry] = useState(false);

  const isRecordingRef = useRef(false);
  const cancelledRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  // Escuta ao vivo
  const liveTextRef = useRef(""); // tudo que foi reconhecido ao vivo nesta gravação
  const partialRef = useRef("");
  const liveGapRef = useRef(false); // houve período sem escuta ao vivo
  const liveEverConnectedRef = useRef(false);
  const reconnectsRef = useRef(0);
  const reconnectingRef = useRef(false);
  const healthRef = useRef<LiveHealth>("connecting");
  const pendingBlobRef = useRef<Blob | null>(null);
  const pendingReplaceRef = useRef<string | undefined>(undefined);
  const onTranscriptionRef = useRef(onTranscription);
  onTranscriptionRef.current = onTranscription;

  const { toast } = useToast();
  const { subscribed, accessActive, loading: subscriptionLoading } = useSubscription();
  const access = canUseVoice({ accessActive, subscribed, loading: subscriptionLoading });
  const navigate = useNavigate();

  const setHealthBoth = (h: LiveHealth) => {
    healthRef.current = h;
    setHealth(h);
  };

  const handleCommitted = (raw: string) => {
    const text = (raw || "").trim();
    partialRef.current = "";
    setLivePartial("");
    if (!text) return;
    liveTextRef.current = liveTextRef.current ? `${liveTextRef.current} ${text}` : text;
    setLiveCommitted(liveTextRef.current);
    if (incremental && isRecordingRef.current) onTranscriptionRef.current(text);
  };

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    languageCode: "por",
    onPartialTranscript: (d: { text: string }) => {
      partialRef.current = d?.text || "";
      setLivePartial(partialRef.current);
    },
    onCommittedTranscript: (d: { text: string }) => handleCommitted(d?.text || ""),
    onError: (err: unknown) => {
      console.warn("[voz ao vivo] erro:", err);
      if (isRecordingRef.current) void reconnectLive();
    },
    onDisconnect: () => {
      if (isRecordingRef.current && healthRef.current === "live") void reconnectLive();
    },
  });
  const scribeRef = useRef(scribe);
  scribeRef.current = scribe;

  const connectLive = useCallback(async () => {
    const { data, error } = await withTimeout(supabase.functions.invoke("elevenlabs-scribe-token"), LIVE_CONNECT_TIMEOUT_MS);
    if (error || !data?.token) throw new Error("token");
    await withTimeout(
      scribeRef.current.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }),
      LIVE_CONNECT_TIMEOUT_MS,
    );
  }, []);

  const reconnectLive = useCallback(async () => {
    if (reconnectingRef.current || !isRecordingRef.current) return;
    if (healthRef.current === "backup") return;
    reconnectingRef.current = true;
    liveGapRef.current = true;
    // salva o trecho parcial que estava sendo dito
    if (partialRef.current.trim()) handleCommitted(partialRef.current);
    setHealthBoth("reconnecting");
    try {
      scribeRef.current.disconnect();
    } catch {
      /* no-op */
    }
    while (reconnectsRef.current < MAX_RECONNECTS && isRecordingRef.current) {
      reconnectsRef.current += 1;
      await new Promise((r) => setTimeout(r, 800 * reconnectsRef.current));
      if (!isRecordingRef.current) break;
      try {
        await connectLive();
        setHealthBoth("live");
        reconnectingRef.current = false;
        return;
      } catch {
        /* tenta de novo */
      }
    }
    if (isRecordingRef.current) setHealthBoth("backup");
    reconnectingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectLive]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      try {
        scribeRef.current.disconnect();
      } catch {
        /* no-op */
      }
    };
  }, []);

  const tickWaveform = useCallback(() => {
    if (!isRecordingRef.current || !analyserRef.current) return;
    const analyser = analyserRef.current;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buffer);
    const step = Math.floor(buffer.length / WAVEFORM_BARS);
    const next: number[] = [];
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += buffer[i * step + j] || 0;
      const avg = sum / step / 255;
      next.push(Math.min(1, Math.pow(avg, 0.7) * 1.4));
    }
    setWaveform(next);
    animationFrameRef.current = requestAnimationFrame(tickWaveform);
  }, []);

  const cleanupStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    setWaveform(Array(WAVEFORM_BARS).fill(0));
  };

  const showLocked = () =>
    toast({
      title: "Recurso Pro",
      description: "Reconhecimento de voz disponível para quem tem acesso ativo.",
      action: (
        <Button size="sm" onClick={() => navigate("/pricing")} className="ml-2">
          Ver Planos
        </Button>
      ),
    });

  const startRecording = async () => {
    if (access === "locked") {
      showLocked();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioContextRef.current = new Ctx();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg", ""];
      const mimeType =
        candidates.find((t) => t === "" || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t))) ?? "";

      // Cópia de segurança: o áudio é sempre gravado no aparelho
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const actualMimeType = recorder.mimeType || "audio/webm";
      chunksRef.current = [];
      cancelledRef.current = false;
      liveTextRef.current = "";
      partialRef.current = "";
      liveGapRef.current = false;
      liveEverConnectedRef.current = false;
      reconnectsRef.current = 0;
      setLiveCommitted("");
      setLivePartial("");
      setHasPendingRetry(false);
      pendingBlobRef.current = null;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        cleanupStream();
        if (cancelledRef.current) {
          setRecordingTime(0);
          return;
        }
        await finishRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      startedAtRef.current = Date.now();
      vibrate(15);

      // Relógio real: não atrasa com a tela bloqueada
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setRecordingTime(secs);
        if (secs >= MAX_RECORDING_SECONDS) stopRecording();
      }, 500);

      animationFrameRef.current = requestAnimationFrame(tickWaveform);

      // Escuta ao vivo (se a rede bloquear, segue só com a cópia gravada)
      setHealthBoth("connecting");
      connectLive()
        .then(() => {
          if (!isRecordingRef.current) {
            try {
              scribeRef.current.disconnect();
            } catch {
              /* no-op */
            }
            return;
          }
          liveEverConnectedRef.current = true;
          setHealthBoth("live");
        })
        .catch((e) => {
          console.warn("[voz ao vivo] indisponível, usando cópia gravada:", e?.message);
          liveGapRef.current = true;
          if (isRecordingRef.current) setHealthBoth("backup");
        });
    } catch (error: any) {
      console.error("Error starting recording:", error);
      cleanupStream();
      isRecordingRef.current = false;
      setIsRecording(false);
      if (error?.name === "NotAllowedError") {
        toast({
          title: "Microfone bloqueado",
          description: "Toque no cadeado ao lado do endereço do site e permita o microfone.",
          variant: "destructive",
        });
      } else if (error?.name === "NotFoundError") {
        toast({ title: "Nenhum microfone encontrado", description: "Conecte um microfone e tente de novo.", variant: "destructive" });
      } else if (error?.name === "NotReadableError") {
        toast({
          title: "Microfone em uso",
          description: "Outro programa está usando o microfone. Feche-o e tente de novo.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Não foi possível iniciar a gravação", description: "Verifique o microfone e tente de novo.", variant: "destructive" });
      }
    }
  };

  const stopLive = async () => {
    // força a última frase a ser confirmada antes de desconectar
    if (healthRef.current === "live") {
      try {
        scribeRef.current.commit();
        await new Promise((r) => setTimeout(r, 600));
      } catch {
        /* no-op */
      }
    }
    if (partialRef.current.trim()) handleCommitted(partialRef.current);
    try {
      scribeRef.current.disconnect();
    } catch {
      /* no-op */
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    vibrate([10, 40, 10]);
    setIsRecording(false);
    // mantém isRecordingRef true até a última frase chegar (para entregar no modo ao vivo)
    await stopLive();
    isRecordingRef.current = false;
    try {
      mediaRecorderRef.current.stop();
    } catch {
      /* no-op */
    }
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    cancelledRef.current = true;
    isRecordingRef.current = false;
    setIsRecording(false);
    vibrate(40);
    try {
      scribeRef.current.disconnect();
    } catch {
      /* no-op */
    }
    try {
      mediaRecorderRef.current.stop();
    } catch {
      /* no-op */
    }
    toast({ title: "Gravação descartada" });
  };

  const finishRecording = async (blob: Blob) => {
    const liveText = liveTextRef.current.trim();
    const liveComplete = liveEverConnectedRef.current && !liveGapRef.current && !!liveText;

    if (liveComplete) {
      if (!incremental) onTranscriptionRef.current(liveText);
      setRecordingTime(0);
      return;
    }

    // Escuta ao vivo falhou em algum momento: transcreve o áudio completo gravado
    if (blob.size < 2000) {
      if (liveText) {
        if (!incremental) onTranscriptionRef.current(liveText);
      } else {
        toast({
          title: "Não deu para ouvir",
          description: "A gravação foi curta demais. Segure o microfone e fale por alguns segundos.",
          variant: "destructive",
        });
      }
      setRecordingTime(0);
      return;
    }

    const replace = incremental && liveText ? liveText : undefined;
    await transcribeBackup(blob, replace, liveText);
  };

  const transcribeBackup = async (blob: Blob, replace?: string, liveFallback?: string) => {
    setIsProcessing(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("agent-transcribe", {
        body: { audio: base64Audio, language: "pt", context, mimeType: blob.type },
      });

      if (error) {
        let detail = "Erro na transcrição";
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const parsed = JSON.parse(await ctx.text());
            if (parsed?.error) detail = parsed.error;
          } catch {
            /* mantém */
          }
        }
        throw new Error(detail);
      }
      if (data?.requiresPro) {
        showLocked();
        return;
      }
      if (!data?.success) throw new Error(data?.error || "Erro ao processar áudio");

      const transcription = (data.transcription || "").trim();
      if (!transcription) {
        if (liveFallback && !incremental) onTranscriptionRef.current(liveFallback);
        else if (!liveFallback)
          toast({
            title: "Nenhuma fala reconhecida",
            description: "Fale mais perto do microfone e tente de novo.",
            variant: "destructive",
          });
        return;
      }
      onTranscriptionRef.current(transcription, replace ? { replace } : undefined);
      pendingBlobRef.current = null;
      setHasPendingRetry(false);
    } catch (error: any) {
      console.error("Error processing audio:", error);
      // Nunca perde a fala: guarda o áudio para tentar de novo
      pendingBlobRef.current = blob;
      pendingReplaceRef.current = replace;
      setHasPendingRetry(true);
      if (liveFallback && !incremental) onTranscriptionRef.current(liveFallback);
      toast({
        title: "Não conseguimos transcrever agora",
        description: "Seu áudio ficou guardado. Toque em Tentar de novo.",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar de novo" onClick={() => void retryPending()}>
            Tentar de novo
          </ToastAction>
        ),
      });
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };

  const retryPending = async () => {
    const blob = pendingBlobRef.current;
    if (!blob) return;
    await transcribeBackup(blob, pendingReplaceRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (access === "locked") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" disabled className="h-10 w-10 rounded-full opacity-50 cursor-not-allowed relative">
              <MicOff className="h-4 w-4" />
              <Sparkles className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Reconhecimento de voz • Plano Pro</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const healthLabel: Record<LiveHealth, string> = {
    connecting: "Conectando…",
    live: "Ao vivo",
    reconnecting: "Reconectando…",
    backup: "Gravando cópia",
  };

  const caption = `${liveCommitted}${livePartial ? (liveCommitted ? " " : "") + livePartial : ""}`;

  const recordingPanel =
    isRecording && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pointer-events-none"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            role="region"
            aria-label="Gravando áudio"
          >
            <div className="pointer-events-auto w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative overflow-hidden rounded-2xl border border-destructive/40 bg-background/95 backdrop-blur-xl shadow-2xl shadow-destructive/20">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-destructive/10 via-primary/5 to-destructive/10 animate-pulse" />

                {/* Legenda ao vivo */}
                <div className="relative px-4 pt-3" aria-live="polite">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] uppercase tracking-[0.18em] font-medium ${
                        health === "live" ? "text-primary" : health === "backup" ? "text-muted-foreground" : "text-destructive"
                      }`}
                    >
                      {healthLabel[health]}
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-foreground line-clamp-3 min-h-[2.5rem] flex flex-col justify-end">
                    {caption ? (
                      <span>
                        <span>{liveCommitted}</span>
                        {livePartial && <span className="text-muted-foreground"> {livePartial}</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {health === "backup"
                          ? "Gravando com segurança. O texto aparece quando você tocar em ✓."
                          : "Pode falar — as palavras aparecem aqui."}
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative flex items-center gap-3 p-3 sm:p-4 pt-2 sm:pt-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    aria-label="Cancelar gravação"
                    className="shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="relative inline-flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                      </span>
                      <span className="font-mono text-sm font-medium text-destructive tabular-nums">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-[3px] h-10 overflow-hidden">
                      {waveform.map((v, i) => (
                        <span
                          key={i}
                          className="w-[3px] rounded-full bg-gradient-to-t from-destructive/70 to-primary"
                          style={{
                            height: `${Math.max(4, v * 38)}px`,
                            opacity: 0.55 + v * 0.45,
                            transition: "height 80ms linear, opacity 80ms linear",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void stopRecording()}
                    aria-label="Concluir gravação"
                    className="shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>

                <p className="relative px-4 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 text-center">
                  Toque em ✓ para concluir · ✕ para descartar
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {recordingPanel}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              onClick={isRecording ? () => void stopRecording() : startRecording}
              disabled={isProcessing || disabled}
              aria-label={isRecording ? "Parar gravação" : isProcessing ? "Transcrevendo áudio" : "Gravar áudio"}
              aria-pressed={isRecording}
              className={`relative h-10 w-10 rounded-full transition-all active:scale-95 ${
                isRecording ? "shadow-lg shadow-destructive/40" : "hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-[18px] w-[18px]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isRecording ? "Parar gravação" : isProcessing ? "Transcrevendo..." : "Gravar áudio"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasPendingRetry && !isRecording && !isProcessing && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void retryPending()}
          className="h-8 rounded-full text-xs gap-1.5"
          aria-label="Tentar transcrever o áudio de novo"
        >
          <RotateCcw className="h-3 w-3" />
          Tentar de novo
        </Button>
      )}

      {isProcessing && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full animate-in fade-in">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-xs font-medium text-primary">Transcrevendo...</span>
        </div>
      )}
    </>
  );
}
