import { motion } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGamification, xpForLevel } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

interface XPProgressProps {
  compact?: boolean;
  className?: string;
}

export function XPProgress({ compact = false, className }: XPProgressProps) {
  const { userProgress, loadingProgress } = useGamification();

  if (loadingProgress || !userProgress) {
    return (
      <div className={cn("animate-pulse bg-muted rounded-lg h-16", className)} />
    );
  }

  const currentXp = userProgress.total_xp;
  const currentLevel = userProgress.current_level;
  const xpForCurrentLevel = xpForLevel(currentLevel - 1);
  const xpForNextLevel = xpForLevel(currentLevel);
  const xpInCurrentLevel = currentXp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium">{currentXp} XP</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-full">
          <TrendingUp className="h-3 w-3 text-secondary-foreground" />
          <span className="text-xs font-medium">Nível {currentLevel}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Nível {currentLevel}</p>
            <p className="text-xs text-muted-foreground">
              {currentXp.toLocaleString()} XP total
            </p>
          </div>
        </div>
        {userProgress.current_streak > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-orange-500/10 rounded-full">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {userProgress.current_streak} dias
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso para Nível {currentLevel + 1}</span>
          <span>
            {xpInCurrentLevel} / {xpNeededForLevel} XP
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
    </motion.div>
  );
}
