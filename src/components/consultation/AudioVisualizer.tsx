import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  level: number;
  isActive: boolean;
  className?: string;
}

export function AudioVisualizer({ level, isActive, className }: AudioVisualizerProps) {
  const bars = 16;
  
  return (
    <div className={cn(
      "flex items-center justify-center gap-[3px] h-12 px-4 py-2 rounded-full",
      isActive ? "bg-primary/10" : "bg-muted/50",
      className
    )}>
      {Array.from({ length: bars }).map((_, i) => {
        // Create organic wave effect with multiple sine waves
        const waveOffset = Math.sin((i / bars) * Math.PI);
        const secondaryWave = Math.sin((i / bars) * Math.PI * 2) * 0.3;
        const combinedOffset = (waveOffset + secondaryWave) * 0.5 + 0.5;
        
        // Add some randomness for organic feel, scaled by audio level
        const randomFactor = isActive ? (Math.sin(Date.now() / 100 + i * 0.5) * 0.15 + 0.15) : 0;
        const barHeight = isActive 
          ? Math.max(0.15, (level * 1.5 * combinedOffset) + randomFactor)
          : 0.12;
        
        // Stagger the animation delay for wave effect
        const delay = i * 0.03;
        
        return (
          <motion.div
            key={i}
            initial={{ scaleY: 0.12 }}
            animate={{ 
              scaleY: barHeight,
              backgroundColor: isActive 
                ? `hsl(var(--primary) / ${0.6 + level * 0.4})`
                : "hsl(var(--muted-foreground) / 0.25)"
            }}
            transition={{
              scaleY: {
                type: "spring",
                stiffness: 300,
                damping: 15,
                delay,
              },
              backgroundColor: {
                duration: 0.1,
              }
            }}
            className={cn(
              "w-1.5 rounded-full origin-center",
              isActive && level > 0.3 && "shadow-sm shadow-primary/30"
            )}
            style={{
              height: "100%",
            }}
          />
        );
      })}
      
      {/* Pulsing ring indicator when active */}
      {isActive && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.2, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-full border-2 border-primary/30 pointer-events-none"
        />
      )}
    </div>
  );
}
