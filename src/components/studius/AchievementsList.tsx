import { motion } from "framer-motion";
import { 
  MessageCircle, MessageSquare, GraduationCap, Trophy, 
  Flame, Zap, Crown, Clock, Timer, Rocket, Lock
} from "lucide-react";
import { useGamification, Achievement } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  MessageSquare,
  GraduationCap,
  Trophy,
  Flame,
  Zap,
  Crown,
  Clock,
  Timer,
  Rocket,
};

interface AchievementsListProps {
  showLocked?: boolean;
  compact?: boolean;
  className?: string;
}

export function AchievementsList({ showLocked = true, compact = false, className }: AchievementsListProps) {
  const { achievements, userAchievements } = useGamification();

  const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);

  const displayAchievements = showLocked
    ? achievements
    : achievements?.filter((a) => unlockedIds.has(a.id));

  if (!displayAchievements?.length) {
    return (
      <div className={cn("text-center text-muted-foreground py-8", className)}>
        {showLocked ? "Carregando conquistas..." : "Nenhuma conquista desbloqueada ainda"}
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    chat: "Chat",
    streak: "Streaks",
    time: "Tempo de Estudo",
    general: "Geral",
  };

  const groupedAchievements = displayAchievements.reduce((acc, achievement) => {
    const category = achievement.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  if (compact) {
    const unlocked = displayAchievements.filter((a) => unlockedIds.has(a.id));
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {unlocked.slice(0, 6).map((achievement) => {
          const Icon = iconMap[achievement.icon] || Trophy;
          return (
            <TooltipProvider key={achievement.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {unlocked.length > 6 && (
          <div className="p-2 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">+{unlocked.length - 6}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categoryAchievements.map((achievement, index) => {
              const isUnlocked = unlockedIds.has(achievement.id);
              const Icon = iconMap[achievement.icon] || Trophy;

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "relative p-4 rounded-xl border text-center transition-all",
                    isUnlocked
                      ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30"
                      : "bg-muted/30 border-muted opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2",
                      isUnlocked ? "bg-primary/20" : "bg-muted"
                    )}
                  >
                    {isUnlocked ? (
                      <Icon className="h-6 w-6 text-primary" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className={cn(
                    "text-sm font-medium mb-1",
                    !isUnlocked && "text-muted-foreground"
                  )}>
                    {achievement.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {achievement.description}
                  </p>
                  <div className="mt-2 text-xs font-medium text-primary">
                    +{achievement.xp_reward} XP
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
