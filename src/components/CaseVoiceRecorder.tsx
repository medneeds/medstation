import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Radio, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { cn } from "@/lib/utils";

interface CaseVoiceRecorderProps {
  onTranscriptionComplete: (data: {
    title: string;
    chief_complaint?: string;
    notes?: string;
    tags?: string[];
  }) => void;
}

type Mode = "batch" | "realtime";

export default function CaseVoiceRecorder({ onTranscriptionComplete }: CaseVoiceRecorderProps) {
  const [mode, setMode] = useState<Mode>("batch");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveText, setLiveText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const committedRef = useRef<string>("");
  const { toast } = useToast();

  // ===== Realtime via ElevenLabs Scribe =====
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (d: any) => setLiveText(committedRef.current + " " + (d?.text ?? "")),
    onCommittedTranscript: (d: any) => {
      committedRef.current = (committedRef.current + " " + (d?.text ?? "")).trim();
      setLiveText(committedRef.current);
    },
  });

  const startBatch = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: "Gravação iniciada", description: "Descreva o caso clínico." });
    } catch {
      toast({ title: "Erro ao iniciar gravação", description: "Verifique as permissões do microfone", variant: "destructive" });
    }
  };

  const stopBatch = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startRealtime = useCallback(async () => {
    try {
      committedRef.current = "";
      setLiveText("");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) throw new Error(error?.message || "Falha ao obter token");
      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setIsRecording(true);
      toast({ title: "Ditado ao vivo iniciado", description: "Fale livremente — o texto aparece abaixo." });
    } catch (e: any) {
      toast({ title: "Erro no ditado ao vivo", description: e.message, variant: "destructive" });
    }
  }, [scribe, toast]);

  const stopRealtime = useCallback(async () => {
    try { await scribe.disconnect(); } catch {}
    setIsRecording(false);
    const fullText = committedRef.current.trim();
    if (!fullText) {
      toast({ title: "Nada capturado", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-case", {
        body: { transcript: fullText },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao processar");
      toast({ title: "✓ Caso reconhecido", description: "Campos preenchidos pela IA" });
      onTranscriptionComplete(data.data);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [scribe, onTranscriptionComplete, toast]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(",")[1];
            toast({ title: "Processando áudio", description: "Transcrevendo com IA..." });
            const { data, error } = await supabase.functions.invoke("transcribe-case", { body: { audio: base64Audio } });
            if (error) throw new Error(error.message);
            if (!data.success) throw new Error(data.error);
            toast({ title: "✓ Caso reconhecido", description: "Campos preenchidos pela IA" });
            onTranscriptionComplete(data.data);
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error("Erro ao ler áudio"));
      });
    } catch (error: any) {
      let msg = error.message || "Erro desconhecido";
      if (msg.includes("rate limit") || msg.includes("429")) msg = "Aguarde alguns segundos e tente novamente";
      else if (msg.includes("402") || msg.includes("créditos")) msg = "Créditos esgotados.";
      toast({ title: "Erro ao processar", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      mode === "batch" ? stopBatch() : stopRealtime();
    } else {
      mode === "batch" ? startBatch() : startRealtime();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-1 p-0.5 rounded-full bg-muted ring-1 ring-border/60">
        <button
          type="button"
          disabled={isRecording || isProcessing}
          onClick={() => setMode("batch")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
            mode === "batch" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mic className="h-3 w-3" /> Gravar e processar
        </button>
        <button
          type="button"
          disabled={isRecording || isProcessing}
          onClick={() => setMode("realtime")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
            mode === "realtime" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-3 w-3" /> Ditado ao vivo
        </button>
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium">
          {isRecording ? (mode === "realtime" ? "🔴 Ditando ao vivo…" : "🔴 Gravando…")
            : isProcessing ? "⚙️ Processando…"
            : mode === "realtime" ? "Ditado em tempo real" : "Reconhecimento de voz"}
        </p>
        <p className="text-xs text-muted-foreground">
          {mode === "realtime"
            ? "Texto aparece enquanto você fala. Ao parar, a IA estrutura o caso."
            : "Grave a descrição completa; a IA estrutura ao final."}
        </p>
      </div>

      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        onClick={handleClick}
        disabled={isProcessing}
        className="rounded-full h-16 w-16"
      >
        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" />
          : isRecording ? <Square className="h-6 w-6" />
          : mode === "realtime" ? <Radio className="h-6 w-6" />
          : <Mic className="h-6 w-6" />}
      </Button>

      {mode === "realtime" && (isRecording || liveText) && (
        <div className="w-full max-h-32 overflow-y-auto rounded-md border bg-background/60 p-2 text-xs text-foreground/90 whitespace-pre-wrap">
          {liveText || <span className="text-muted-foreground italic">Aguardando fala…</span>}
        </div>
      )}
    </div>
  );
}
