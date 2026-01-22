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

// Convert audio level (0-1) to approximate decibels (-60 to 0 dB range)
function levelToDecibels(level: number): number {
  if (level <= 0) return -60;
  // Map 0-1 to -60 to 0 dB (logarithmic scale approximation)
  const dB = 20 * Math.log10(Math.max(level, 0.001));
  return Math.max(-60, Math.min(0, dB));
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
  const bars = 20;
  const decibels = levelToDecibels(level);
  const speakerColors = getSpeakerColor(currentSpeaker);
  
  // Memoize bar calculations for performance
  const barData = useMemo(() => {
    return Array.from({ length: bars }).map((_, i) => {
      const waveOffset = Math.sin((i / bars) * Math.PI);
      const secondaryWave = Math.sin((i / bars) * Math.PI * 2) * 0.25;
      const tertiaryWave = Math.sin((i / bars) * Math.PI * 3) * 0.1;
      const combinedOffset = (waveOffset + secondaryWave + tertiaryWave) * 0.5 + 0.5;
      return { combinedOffset, index: i };
    });
  }, [bars]);

  return (
    <div className={cn(
      "flex flex-col items-center gap-3",
      className
    )}>
      {/* Main visualizer container */}
      <div className={cn(
        "relative flex items-center justify-center gap-[2px] h-16 px-6 py-3 rounded-2xl transition-all duration-300",
        isActive ? speakerColors.bg : "bg-muted/30",
        isActive && `ring-2 ${speakerColors.ring}`,
        isActive && level > 0.2 && `shadow-lg ${speakerColors.glow}`
      )}>
        {/* Animated bars */}
        {barData.map(({ combinedOffset, index }) => {
          const randomPhase = Math.sin(Date.now() / 80 + index * 0.7) * 0.1;
          const barHeight = isActive 
            ? Math.max(0.08, (level * 2 * combinedOffset) + randomPhase)
            : 0.06;
          
          return (
            <motion.div
              key={index}
              animate={{ 
                scaleY: barHeight,
                opacity: isActive ? 0.7 + level * 0.3 : 0.3,
              }}
              transition={{
                scaleY: {
                  type: "spring",
                  stiffness: 400,
                  damping: 20,
                },
                opacity: { duration: 0.15 }
              }}
              className="w-1.5 rounded-full origin-center"
              style={{
                height: "100%",
                backgroundColor: isActive ? speakerColors.primary : 'hsl(var(--muted-foreground) / 0.3)',
              }}
            />
          );
        })}
        
        {/* Active indicator pulse */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.15, 0.3]
              }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={cn(
                "absolute inset-0 rounded-2xl border-2 pointer-events-none",
                currentSpeaker === 'doctor' && "border-primary/40",
                currentSpeaker === 'patient' && "border-blue-500/40",
                currentSpeaker === 'companion' && "border-amber-500/40",
                !currentSpeaker && "border-primary/40"
              )}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Decibel indicator */}
      <div className="flex items-center gap-3">
        {/* dB meter bar */}
        <div className="relative w-32 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            animate={{
              width: `${Math.max(0, ((decibels + 60) / 60) * 100)}%`
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              decibels > -10 ? "bg-red-500" :
              decibels > -25 ? "bg-yellow-500" :
              "bg-green-500"
            )}
          />
          {/* Peak markers */}
          <div className="absolute top-0 bottom-0 left-[83%] w-px bg-yellow-500/50" />
          <div className="absolute top-0 bottom-0 left-[92%] w-px bg-red-500/50" />
        </div>

        {/* dB value */}
        <motion.div
          animate={{ 
            scale: isActive && level > 0.3 ? [1, 1.05, 1] : 1 
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "min-w-[4rem] px-2 py-1 rounded-lg text-center font-mono text-sm font-medium transition-colors",
            isActive ? speakerColors.bg : "bg-muted/50",
            decibels > -10 ? "text-red-500" :
            decibels > -25 ? "text-yellow-600 dark:text-yellow-400" :
            "text-green-600 dark:text-green-400"
          )}
        >
          {isActive ? `${Math.round(decibels)} dB` : "-- dB"}
        </motion.div>
      </div>

      {/* Speaker indicator label */}
      <AnimatePresence mode="wait">
        {isActive && currentSpeaker && (
          <motion.div
            key={currentSpeaker}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              currentSpeaker === 'doctor' && "bg-primary/20 text-primary",
              currentSpeaker === 'patient' && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
              currentSpeaker === 'companion' && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            )}
          >
            {currentSpeaker === 'doctor' ? '🩺 Médico falando' :
             currentSpeaker === 'patient' ? '👤 Paciente falando' :
             '👥 Acompanhante falando'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
