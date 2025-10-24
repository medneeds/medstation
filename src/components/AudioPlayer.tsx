import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  audioBlob: Blob;
  audioUrl: string;
  onTranscription?: (text: string) => void;
  messageId: string;
  transcription?: string;
}

export function AudioPlayer({ 
  audioBlob, 
  audioUrl, 
  onTranscription,
  messageId,
  transcription: initialTranscription 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(initialTranscription || "");
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Upload audio to Supabase storage
      const fileName = `audio_${messageId}_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidences')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create evidence record
      const { data: evidence, error: evidenceError } = await supabase
        .from('evidences')
        .insert({
          title: 'Áudio gravado',
          type: 'audio',
          file_path: uploadData.path,
          file_size: audioBlob.size,
          origin: 'chat',
          user_id: user.id
        })
        .select()
        .single();

      if (evidenceError) throw evidenceError;

      // Call transcription function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { evidenceId: evidence.id }
      });

      if (error) throw error;

      toast({
        title: "Áudio transcrito!",
        description: "A transcrição foi concluída com sucesso.",
      });

      // Fetch the transcription
      const { data: updatedEvidence, error: fetchError } = await supabase
        .from('evidences')
        .select('content')
        .eq('id', evidence.id)
        .single();

      if (fetchError) throw fetchError;

      const transcriptionText = updatedEvidence.content || "";
      setTranscription(transcriptionText);
      
      if (onTranscription) {
        onTranscription(transcriptionText);
      }

    } catch (error) {
      console.error("Erro ao transcrever:", error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayPause}
          className="h-8 w-8 shrink-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {playbackRate}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handlePlaybackRateChange(1)}>
              1x
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlaybackRateChange(1.5)}>
              1.5x
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlaybackRateChange(2)}>
              2x
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlaybackRateChange(2.5)}>
              2.5x
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePlaybackRateChange(3)}>
              3x
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTranscribe}
          disabled={isTranscribing || !!transcription}
          className="h-8"
        >
          <FileText className="h-3 w-3 mr-1" />
          {isTranscribing ? "Transcrevendo..." : transcription ? "Transcrito" : "Transcrever"}
        </Button>
      </div>

      {transcription && (
        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="font-medium text-xs text-muted-foreground mb-1">Transcrição:</p>
          <p className="whitespace-pre-wrap">{transcription}</p>
        </div>
      )}
    </div>
  );
}
