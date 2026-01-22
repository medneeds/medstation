import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { SpeakerType } from "@/hooks/useConsultation";

interface AudioVisualizerProps {
  level: number;
  isActive: boolean;
  currentSpeaker?: SpeakerType;
  className?: string;
}

// Get color based on speaker
function getSpeakerColor(speaker?: SpeakerType) {
  switch (speaker) {
    case 'doctor':
      return {
        primary: 'hsl(var(--primary))',
        bg: 'bg-primary/10',
        ring: 'ring-primary/30',
        glow: 'shadow-primary/20',
      };
    case 'patient':
      return {
        primary: 'hsl(210, 100%, 50%)',
        bg: 'bg-blue-500/10',
        ring: 'ring-blue-500/30',
        glow: 'shadow-blue-500/20',
      };
    case 'companion':
      return {
        primary: 'hsl(38, 92%, 50%)',
        bg: 'bg-amber-500/10',
        ring: 'ring-amber-500/30',
        glow: 'shadow-amber-500/20',
      };
    default:
      return {
        primary: 'hsl(var(--primary))',
        bg: 'bg-primary/10',
        ring: 'ring-primary/30',
        glow: 'shadow-primary/20',
      };
  }
}

export function AudioVisualizer({ level, isActive, currentSpeaker, className }: AudioVisualizerProps) {
  const bars = 24;
  const speakerColors = getSpeakerColor(currentSpeaker);
  
  // Memoize bar calculations for performance
  const barData = useMemo(() => {
    return Array.from({ length: bars }).map((_, i) => {
      const waveOffset = Math.sin((i / bars) * Math.PI);
      const secondaryWave = Math.sin((i / bars) * Math.PI * 2) * 0.3;
      const tertiaryWave = Math.sin((i / bars) * Math.PI * 3) * 0.15;
      const combinedOffset = (waveOffset + secondaryWave + tertiaryWave) * 0.5 + 0.5;
      return { combinedOffset, index: i };
    });
  }, [bars]);

  return (
    <div className={cn(
      "flex flex-col items-center gap-4",
      className
    )}>
      {/* Main visualizer container */}
      <div className={cn(
        "relative flex items-center justify-center gap-[3px] h-20 px-8 py-4 rounded-2xl transition-all duration-300",
        isActive ? speakerColors.bg : "bg-muted/30",
        isActive && `ring-2 ${speakerColors.ring}`,
        isActive && level > 0.15 && `shadow-xl ${speakerColors.glow}`
      )}>
        {/* Animated sound wave bars */}
        {barData.map(({ combinedOffset, index }) => {
          // Create organic wave motion using time-based animation
          const randomPhase = Math.sin(Date.now() / 60 + index * 0.8) * 0.15;
          const secondPhase = Math.cos(Date.now() / 100 + index * 0.5) * 0.1;
          const barHeight = isActive 
            ? Math.max(0.1, (level * 2.5 * combinedOffset) + randomPhase + secondPhase)
            : 0.08 + Math.sin(index * 0.3) * 0.02;
          
          return (
            <motion.div
              key={index}
              animate={{ 
                scaleY: barHeight,
                opacity: isActive ? 0.6 + level * 0.4 : 0.25,
              }}
              transition={{
                scaleY: {
                  type: "spring",
                  stiffness: 350,
                  damping: 15,
                },
                opacity: { duration: 0.1 }
              }}
              className="w-1.5 md:w-2 rounded-full origin-center"
              style={{
                height: "100%",
                backgroundColor: isActive ? speakerColors.primary : 'hsl(var(--muted-foreground) / 0.25)',
              }}
            />
          );
        })}
        
        {/* Pulsing ring indicator when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ 
                scale: [1, 1.03, 1],
                opacity: [0.4, 0.2, 0.4]
              }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={cn(
                "absolute inset-0 rounded-2xl border-2 pointer-events-none",
                currentSpeaker === 'doctor' && "border-primary/50",
                currentSpeaker === 'patient' && "border-blue-500/50",
                currentSpeaker === 'companion' && "border-amber-500/50",
                !currentSpeaker && "border-primary/50"
              )}
            />
          )}
        </AnimatePresence>
        
        {/* Glow effect when speaking loudly */}
        <AnimatePresence>
          {isActive && level > 0.3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: level * 0.5 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute inset-0 rounded-2xl blur-xl pointer-events-none -z-10",
                currentSpeaker === 'doctor' && "bg-primary/30",
                currentSpeaker === 'patient' && "bg-blue-500/30",
                currentSpeaker === 'companion' && "bg-amber-500/30",
                !currentSpeaker && "bg-primary/30"
              )}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Speaker indicator label */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={currentSpeaker || 'listening'}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              currentSpeaker === 'doctor' && "bg-primary/15 text-primary",
              currentSpeaker === 'patient' && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
              currentSpeaker === 'companion' && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              !currentSpeaker && "bg-muted text-muted-foreground"
            )}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={cn(
                "w-2 h-2 rounded-full",
                currentSpeaker === 'doctor' && "bg-primary",
                currentSpeaker === 'patient' && "bg-blue-500",
                currentSpeaker === 'companion' && "bg-amber-500",
                !currentSpeaker && "bg-muted-foreground"
              )}
            />
            <span>
              {currentSpeaker === 'doctor' ? 'Médico falando' :
               currentSpeaker === 'patient' ? 'Paciente falando' :
               currentSpeaker === 'companion' ? 'Acompanhante falando' :
               'Ouvindo...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
