import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  onTranscriptionComplete: (data: {
    patient_name?: string;
    diagnosis: string;
    cid_code?: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
    observations?: string;
    validity_days?: number;
  }) => void;
}

export default function VoiceRecorder({ onTranscriptionComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Gravação iniciada",
        description: "Dite a prescrição médica completa...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Gravação finalizada",
        description: "Processando áudio...",
      });
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];

            toast({
              title: "Processando áudio",
              description: "Transcrevendo e extraindo dados da prescrição...",
            });

            const { data, error } = await supabase.functions.invoke('transcribe-prescription', {
              body: { audio: base64Audio }
            });

            if (error) throw error;

            if (data.error) {
              throw new Error(data.error);
            }

            toast({
              title: "✓ Prescrição reconhecida",
              description: "Campos preenchidos automaticamente pela IA",
            });

            onTranscriptionComplete(data.data);
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
      });
    } catch (error: any) {
      console.error('Error processing audio:', error);
      toast({
        title: "Erro ao processar áudio",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isRecording 
            ? "🔴 Gravando... Dite: paciente, diagnóstico, medicamentos e dosagens"
            : isProcessing
            ? "⚙️ Processando e preenchendo campos..."
            : "🎤 Clique para começar a ditar"}
        </p>
      </div>

      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className="rounded-full h-16 w-16"
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isRecording ? (
          <Square className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {isRecording && (
        <div className="flex items-center gap-2 text-destructive animate-pulse">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-sm font-medium">Gravando</span>
        </div>
      )}
    </div>
  );
}
