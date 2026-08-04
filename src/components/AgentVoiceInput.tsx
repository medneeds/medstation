import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, MicOff, Sparkles, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentVoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  context?: string;
}

const WAVEFORM_BARS = 28;
const MAX_RECORDING_SECONDS = 180; // 3 minutes hard cap

const vibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* no-op */
  }
};

export function AgentVoiceInput({ onTranscription, disabled = false, context }: AgentVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(() => Array(WAVEFORM_BARS).fill(0));

  const isRecordingRef = useRef(false);
  const cancelledRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toast } = useToast();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Continuous waveform update — driven by ref, not state, to avoid stale closure
  const tickWaveform = useCallback(() => {
    if (!isRecordingRef.current || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buffer);

    // Sample evenly across spectrum into WAVEFORM_BARS buckets
    const step = Math.floor(buffer.length / WAVEFORM_BARS);
    const next: number[] = [];
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += buffer[i * step + j] || 0;
      const avg = sum / step / 255; // 0..1
      // Light easing for prettier motion
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

  const startRecording = async () => {
    if (!subscribed && !subscriptionLoading) {
      toast({
        title: "Recurso Pro",
        description: "Reconhecimento de voz disponível apenas no plano Pro.",
        action: (
          <Button size="sm" onClick={() => navigate("/pricing")} className="ml-2">
            Ver Planos
          </Button>
        ),
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Audio analysis
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioContextRef.current = new Ctx();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      // mimeType detection (Safari/iOS friendly)
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "",
      ];
      const mimeType =
        candidates.find((t) => t === "" || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t))) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const actualMimeType = recorder.mimeType || "audio/webm";
      chunksRef.current = [];
      cancelledRef.current = false;

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
        await processAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);

      vibrate(15);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            // Auto-stop on cap
            stopRecording();
          }
          return next;
        });
      }, 1000);

      animationFrameRef.current = requestAnimationFrame(tickWaveform);
    } catch (error: any) {
      console.error("Error starting recording:", error);
      cleanupStream();
      isRecordingRef.current = false;
      setIsRecording(false);
      if (error?.name === "NotAllowedError") {
        toast({
          title: "Permissão negada",
          description: "Permita o acesso ao microfone nas configurações do navegador.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao iniciar gravação",
          description: error?.message || "Verifique as permissões do microfone",
          variant: "destructive",
        });
      }
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    vibrate([10, 40, 10]);
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
      mediaRecorderRef.current.stop();
    } catch {
      /* no-op */
    }
    toast({ title: "Gravação descartada" });
  };

  const processAudio = async (audioBlob: Blob) => {
    if (audioBlob.size < 2000) {
      toast({
        title: "Gravação muito curta",
        description: "Fale por alguns segundos antes de parar a gravação.",
        variant: "destructive",
      });
      setRecordingTime(0);
      return;
    }
    setIsProcessing(true);
    try {

      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("agent-transcribe", {
        body: { audio: base64Audio, language: "pt", context, mimeType: audioBlob.type },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) throw new Error(error.message || "Erro na transcrição");

      if (data?.requiresPro) {
        toast({
          title: "Recurso Pro",
          description: data.error,
          action: (
            <Button size="sm" onClick={() => navigate("/pricing")} className="ml-2">
              Ver Planos
            </Button>
          ),
        });
        return;
      }
      if (!data?.success) throw new Error(data?.error || "Erro ao processar áudio");

      const transcription = data.transcription?.trim();
      if (!transcription) {
        toast({
          title: "Áudio não reconhecido",
          description: "Não foi possível identificar fala no áudio. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
      onTranscription(transcription);
    } catch (error: any) {
      console.error("Error processing audio:", error);
      let msg = error?.message || "Erro desconhecido";
      if (msg.includes("rate limit") || msg.includes("429")) {
        msg = "Muitas requisições. Aguarde alguns segundos e tente novamente";
      }
      toast({ title: "Erro na transcrição", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  // Locked state for non-subscribers
  if (!subscribed && !subscriptionLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled
              className="h-10 w-10 rounded-full opacity-50 cursor-not-allowed relative"
            >
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

  // Recording panel — fixed at the bottom of the viewport so it shines on mobile
  // and never gets clipped by the chat input row.
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
                {/* Halo glow */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-destructive/10 via-primary/5 to-destructive/10 animate-pulse" />

                <div className="relative flex items-center gap-3 p-3 sm:p-4">
                  {/* Cancel */}
                  <button
                    type="button"
                    onClick={cancelRecording}
                    aria-label="Cancelar gravação"
                    className="shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Live indicator + waveform + timer */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="relative inline-flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                      </span>
                      <span className="font-mono text-sm font-medium text-destructive tabular-nums">
                        {formatTime(recordingTime)}
                      </span>
                    </div>

                    {/* Waveform — centered, mirrored feel */}
                    <div className="flex-1 flex items-center justify-center gap-[3px] h-10 overflow-hidden">
                      {waveform.map((v, i) => {
                        const h = Math.max(4, v * 38);
                        return (
                          <span
                            key={i}
                            className="w-[3px] rounded-full bg-gradient-to-t from-destructive/70 to-primary"
                            style={{
                              height: `${h}px`,
                              opacity: 0.55 + v * 0.45,
                              transition: "height 80ms linear, opacity 80ms linear",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Confirm / send */}
                  <button
                    type="button"
                    onClick={stopRecording}
                    aria-label="Concluir gravação e transcrever"
                    className="shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>

                <p className="relative px-4 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 text-center">
                  Toque em ✓ para enviar · ✕ para descartar
                </p>
              </div>
            </div>
          </div>,
          document.body
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
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || disabled}
              aria-label={
                isRecording ? "Parar gravação" : isProcessing ? "Transcrevendo áudio" : "Gravar áudio"
              }
              aria-pressed={isRecording}
              className={`relative h-10 w-10 rounded-full transition-all active:scale-95 ${
                isRecording
                  ? "shadow-lg shadow-destructive/40"
                  : "hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {/* Idle pulse halo to invite tapping */}
              {!isRecording && !isProcessing && (
                <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/0 group-hover:bg-primary/10 transition-colors" />
              )}
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
            <p className="text-xs">
              {isRecording ? "Parar gravação" : isProcessing ? "Transcrevendo..." : "Gravar áudio"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Compact processing chip (shown after stop, before transcription returns) */}
      {isProcessing && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full animate-in fade-in">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-xs font-medium text-primary">Transcrevendo...</span>
        </div>
      )}
    </>
  );
}
