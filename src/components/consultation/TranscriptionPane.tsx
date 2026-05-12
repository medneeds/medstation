import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpeakerIndicator } from "./SpeakerIndicator";
import { Loader2, Trash2, Sparkles, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { TranscriptionSegment, SpeakerType } from "@/hooks/useConsultation";
import { cn } from "@/lib/utils";

interface TranscriptionPaneProps {
  segments: TranscriptionSegment[];
  isTranscribing: boolean;
  isRecording?: boolean;
  onChangeSpeaker: (segmentId: string, newSpeaker: SpeakerType) => void;
  onDeleteSegment: (segmentId: string) => void;
  unifiedMode?: boolean;
}

// Typing animation component for new text
function TypingText({ text, isNew }: { text: string; isNew: boolean }) {
  const [displayedText, setDisplayedText] = useState(isNew ? "" : text);
  const [isTyping, setIsTyping] = useState(isNew);

  useEffect(() => {
    if (!isNew) {
      setDisplayedText(text);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 25); // Fast typing speed

    return () => clearInterval(interval);
  }, [text, isNew]);

  return (
    <span className="relative">
      "{displayedText}"
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

export function TranscriptionPane({ 
  segments, 
  isTranscribing,
  isRecording = false,
  onChangeSpeaker,
  onDeleteSegment,
  unifiedMode = false,
}: TranscriptionPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [newSegmentIds, setNewSegmentIds] = useState<Set<string>>(new Set());

  // Track new segments for typing animation
  useEffect(() => {
    if (segments.length > 0) {
      const latestSegment = segments[segments.length - 1];
      setNewSegmentIds(prev => new Set(prev).add(latestSegment.id));
      
      // Remove from "new" after animation completes
      const timer = setTimeout(() => {
        setNewSegmentIds(prev => {
          const next = new Set(prev);
          next.delete(latestSegment.id);
          return next;
        });
      }, latestSegment.text.length * 25 + 500);
      
      return () => clearTimeout(timer);
    }
  }, [segments.length]);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  const getSpeakerBorderColor = (speaker: SpeakerType) => {
    switch (speaker) {
      case 'doctor': return 'border-l-primary';
      case 'patient': return 'border-l-blue-500';
      case 'companion': return 'border-l-amber-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b bg-gradient-to-r from-muted/50 to-transparent">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs md:text-sm">Transcrição ao Vivo</h3>
          {isRecording && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
          )}
        </div>
        <AnimatePresence>
          {isTranscribing && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="flex items-center gap-1.5 md:gap-2 px-2 py-1 rounded-full bg-primary/10 border border-primary/20"
            >
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] md:text-xs font-medium text-primary">Transcrevendo...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <ScrollArea className="flex-1 p-2 md:p-4" ref={scrollRef}>
        <AnimatePresence mode="popLayout">
          {segments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-muted-foreground py-8"
            >
              <motion.div
                animate={{ 
                  scale: isRecording ? [1, 1.1, 1] : 1,
                  opacity: isRecording ? [0.5, 1, 0.5] : 0.5
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  "p-4 rounded-full mb-4",
                  isRecording ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Mic className={cn(
                  "h-8 w-8",
                  isRecording ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
              <p className="text-xs md:text-sm">
                {isRecording ? "Ouvindo..." : "A transcrição aparecerá aqui..."}
              </p>
              <p className="text-[10px] md:text-xs mt-1">
                {isRecording ? "Fale próximo ao microfone" : "Inicie a gravação para começar"}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {segments.map((segment, index) => {
                const isNew = newSegmentIds.has(segment.id);
                const isLatest = index === segments.length - 1;
                const cycleSpeaker = (dir: 1 | -1) => {
                  const order: SpeakerType[] = ['doctor', 'patient', 'companion'];
                  const i = order.indexOf(segment.speaker);
                  const next = order[(i + dir + order.length) % order.length];
                  onChangeSpeaker(segment.id, next);
                  if (navigator.vibrate) navigator.vibrate(10);
                };

                return (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                    drag={unifiedMode ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.25}
                    onDragEnd={(_, info) => {
                      if (unifiedMode) return;
                      if (info.offset.x > 60) cycleSpeaker(1);
                      else if (info.offset.x < -60) cycleSpeaker(-1);
                    }}
                    className={cn(
                      "group relative p-2 md:p-3 rounded-lg bg-card transition-all duration-200",
                      unifiedMode
                        ? "border border-border/50"
                        : "border-l-4 touch-pan-y cursor-grab active:cursor-grabbing",
                      !unifiedMode && getSpeakerBorderColor(segment.speaker),
                      segment.isEdited && "ring-1 ring-primary/30",
                      isLatest && isRecording && "shadow-md"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {unifiedMode ? (
                        <span className="text-[10px] md:text-xs text-muted-foreground font-mono tabular-nums">
                          {segment.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      ) : (
                        <SpeakerIndicator
                          speaker={segment.speaker}
                          confidence={segment.confidence}
                          timestamp={segment.timestamp}
                          onChangeSpeaker={(newSpeaker) => onChangeSpeaker(segment.id, newSpeaker)}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteSegment(segment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className={cn("mt-1.5 md:mt-2 leading-relaxed text-foreground/90", unifiedMode ? "text-sm md:text-base" : "text-xs md:text-sm")}>
                      <TypingText text={segment.text} isNew={isNew} />
                    </p>
                  </motion.div>
                );
              })}
              
              {/* Floating transcribing indicator at bottom */}
              <AnimatePresence>
                {isTranscribing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="flex items-center justify-center gap-2 py-3 px-4 mt-2 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            scaleY: [1, 1.8, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity,
                            delay: i * 0.15
                          }}
                          className="w-1 h-3 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-primary">
                      Transcrevendo áudio...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div ref={endRef} />
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
