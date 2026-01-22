import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, MicOff, Sparkles } from "lucide-react";
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

export function AgentVoiceInput({ onTranscription, disabled = false, context }: AgentVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average level
    const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
    setAudioLevel(average / 255);
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const startRecording = async () => {
    // Check subscription first
    if (!subscribed && !subscriptionLoading) {
      toast({
        title: "Recurso Pro",
        description: "Reconhecimento de voz disponível apenas no plano Pro.",
        action: (
          <Button size="sm" onClick={() => navigate('/pricing')} className="ml-2">
            Ver Planos
          </Button>
        ),
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Setup audio analysis for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Determine supported mimeType with fallback for Safari/iOS
      const getSupportedMimeType = () => {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          ''  // Empty string = browser default
        ];
        for (const type of types) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) {
            console.log(`[VoiceInput] Using mimeType: ${type || 'default'}`);
            return type;
          }
        }
        return '';
      };

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
      console.log(`[VoiceInput] MediaRecorder created with mimeType: ${actualMimeType}`);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType });
        console.log(`[VoiceInput] Recording stopped. Blob size: ${audioBlob.size}, type: ${audioBlob.type}`);
        await processAudio(audioBlob);
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms for smoother visualization
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start audio level visualization
      updateAudioLevel();

      toast({
        title: "🎤 Gravando",
        description: "Fale sua mensagem...",
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permissão negada",
          description: "Permita o acesso ao microfone nas configurações do navegador.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao iniciar gravação",
          description: error.message || "Verifique as permissões do microfone",
          variant: "destructive",
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      console.log(`[VoiceInput] Audio size: ${audioBlob.size} bytes, type: ${audioBlob.type}, Duration: ${recordingTime}s`);

      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('agent-transcribe', {
        body: { 
          audio: base64Audio,
          language: 'pt',
          context,
          mimeType: audioBlob.type // Send the actual mimeType to backend
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) {
        console.error('Transcription error:', error);
        throw new Error(error.message || 'Erro na transcrição');
      }

      if (data.requiresPro) {
        toast({
          title: "Recurso Pro",
          description: data.error,
          action: (
            <Button size="sm" onClick={() => navigate('/pricing')} className="ml-2">
              Ver Planos
            </Button>
          ),
        });
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar áudio');
      }

      const transcription = data.transcription?.trim();
      
      if (!transcription) {
        toast({
          title: "Áudio não reconhecido",
          description: "Não foi possível identificar fala no áudio. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[VoiceInput] Transcription: ${transcription.substring(0, 100)}...`);
      console.log(`[VoiceInput] Processing time: ${data.processingTime}ms`);

      toast({
        title: "✓ Áudio transcrito",
        description: `${data.duration?.toFixed(1) || recordingTime}s de áudio processado`,
      });

      onTranscription(transcription);

    } catch (error: any) {
      console.error('Error processing audio:', error);
      
      let errorMessage = error.message || "Erro desconhecido";
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Muitas requisições. Aguarde alguns segundos e tente novamente';
      }
      
      toast({
        title: "Erro na transcrição",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If not subscribed, show locked state
  if (!subscribed && !subscriptionLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled
              className="h-9 w-9 rounded-full opacity-50 cursor-not-allowed relative"
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

  return (
    <div className="relative flex items-center gap-2">
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-full animate-in fade-in slide-in-from-right-2">
          <div 
            className="h-2 w-2 rounded-full bg-destructive animate-pulse"
            style={{
              transform: `scale(${1 + audioLevel * 0.5})`,
              transition: 'transform 50ms ease-out'
            }}
          />
          <span className="text-xs font-medium text-destructive">
            {formatTime(recordingTime)}
          </span>
          
          {/* Audio level bars */}
          <div className="flex items-end gap-0.5 h-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-destructive rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, (audioLevel > i * 0.2 ? (audioLevel - i * 0.2) * 5 : 0.2) * 16)}px`,
                  opacity: audioLevel > i * 0.2 ? 1 : 0.3
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full animate-in fade-in">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-xs font-medium text-primary">Transcrevendo...</span>
        </div>
      )}

      {/* Main button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || disabled}
              className={`h-9 w-9 rounded-full transition-all ${
                isRecording 
                  ? 'animate-pulse shadow-lg shadow-destructive/30' 
                  : 'hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">
              {isRecording 
                ? "Parar gravação" 
                : isProcessing 
                  ? "Processando..." 
                  : "Gravar áudio (Pro)"
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
