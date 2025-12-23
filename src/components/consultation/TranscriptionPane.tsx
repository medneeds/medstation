import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpeakerIndicator } from "./SpeakerIndicator";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranscriptionSegment, SpeakerType } from "@/hooks/useConsultation";
import { cn } from "@/lib/utils";

interface TranscriptionPaneProps {
  segments: TranscriptionSegment[];
  isTranscribing: boolean;
  onChangeSpeaker: (segmentId: string, newSpeaker: SpeakerType) => void;
  onDeleteSegment: (segmentId: string) => void;
}

export function TranscriptionPane({ 
  segments, 
  isTranscribing,
  onChangeSpeaker,
  onDeleteSegment,
}: TranscriptionPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Transcrição ao Vivo</h3>
        {isTranscribing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Transcrevendo...</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">A transcrição aparecerá aqui...</p>
            <p className="text-xs mt-1">Inicie a gravação para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {segments.map((segment) => (
              <div 
                key={segment.id} 
                className={cn(
                  "group relative p-3 rounded-lg border transition-colors",
                  segment.isEdited && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <SpeakerIndicator
                    speaker={segment.speaker}
                    confidence={segment.confidence}
                    timestamp={segment.timestamp}
                    onChangeSpeaker={(newSpeaker) => onChangeSpeaker(segment.id, newSpeaker)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => onDeleteSegment(segment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  "{segment.text}"
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
