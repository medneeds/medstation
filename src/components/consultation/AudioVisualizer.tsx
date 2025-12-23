import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  level: number;
  isActive: boolean;
  className?: string;
}

export function AudioVisualizer({ level, isActive, className }: AudioVisualizerProps) {
  const bars = 12;
  
  return (
    <div className={cn("flex items-center justify-center gap-0.5 h-8", className)}>
      {Array.from({ length: bars }).map((_, i) => {
        // Create wave effect
        const offset = Math.sin((i / bars) * Math.PI) * 0.5 + 0.5;
        const barHeight = isActive ? Math.max(0.2, level * offset + Math.random() * 0.2) : 0.15;
        
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-75",
              isActive ? "bg-primary" : "bg-muted-foreground/30"
            )}
            style={{
              height: `${barHeight * 100}%`,
              minHeight: '4px',
            }}
          />
        );
      })}
    </div>
  );
}
