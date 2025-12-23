import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProgress {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  is_public: boolean;
  display_name: string | null;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  category: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  total_xp: number;
  current_level: number;
  current_streak: number;
}

// XP rewards for different actions
const XP_REWARDS = {
  MESSAGE_SENT: 5,
  STUDY_MINUTE: 1,
  FLASHCARD_REVIEWED: 3,
  ARTICLE_READ: 10,
  STREAK_BONUS: 10,
};

// Calculate level from XP (matches DB function)
export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

// Calculate XP needed for next level
export function xpForLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

export function useGamification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user progress
  const { data: userProgress, isLoading: loadingProgress } = useQuery({
    queryKey: ["studius-user-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("studius_user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Create progress if doesn't exist
      if (!data) {
        const { data: newProgress, error: insertError } = await supabase
          .from("studius_user_progress")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newProgress as UserProgress;
      }

      return data as UserProgress;
    },
  });

  // Fetch all achievements
  const { data: achievements } = useQuery({
    queryKey: ["studius-achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studius_achievements")
        .select("*")
        .order("requirement_value", { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Fetch user achievements
  const { data: userAchievements } = useQuery({
    queryKey: ["studius-user-achievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("studius_user_achievements")
        .select("*, achievement:studius_achievements(*)")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as (UserAchievement & { achievement: Achievement })[];
    },
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["studius-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studius_user_progress")
        .select("user_id, display_name, total_xp, current_level, current_streak")
        .eq("is_public", true)
        .order("total_xp", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LeaderboardEntry[];
    },
  });

  // Add XP mutation
  const addXpMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      // Get current progress
      let progress = userProgress;
      if (!progress) {
        const { data } = await supabase
          .from("studius_user_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        progress = data as UserProgress;
      }

      // Calculate streak
      let newStreak = 1;
      let longestStreak = progress?.longest_streak || 0;

      if (progress?.last_activity_date) {
        const lastDate = new Date(progress.last_activity_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          newStreak = progress.current_streak;
        } else if (diffDays === 1) {
          newStreak = progress.current_streak + 1;
        }
      }

      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }

      const newTotalXp = (progress?.total_xp || 0) + amount;
      const newLevel = calculateLevel(newTotalXp);

      const { data, error } = await supabase
        .from("studius_user_progress")
        .upsert({
          user_id: user.id,
          total_xp: newTotalXp,
          current_level: newLevel,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      // Check for level up
      const oldLevel = progress?.current_level || 1;
      if (newLevel > oldLevel) {
        toast({
          title: `🎉 Level Up! Nível ${newLevel}`,
          description: "Parabéns pelo seu progresso!",
        });
      }

      return { progress: data, xpGained: amount, reason };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studius-user-progress"] });
      queryClient.invalidateQueries({ queryKey: ["studius-leaderboard"] });
    },
  });

  // Check and unlock achievements
  const checkAchievementsMutation = useMutation({
    mutationFn: async (stats: { messages_sent?: number; study_time?: number; streak_days?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !achievements) return [];

      const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);
      const newlyUnlocked: Achievement[] = [];

      for (const achievement of achievements) {
        if (unlockedIds.has(achievement.id)) continue;

        let qualified = false;
        switch (achievement.requirement_type) {
          case "messages_sent":
            qualified = (stats.messages_sent || 0) >= achievement.requirement_value;
            break;
          case "study_time":
            qualified = (stats.study_time || 0) >= achievement.requirement_value;
            break;
          case "streak_days":
            qualified = (stats.streak_days || 0) >= achievement.requirement_value;
            break;
        }

        if (qualified) {
          const { error } = await supabase
            .from("studius_user_achievements")
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
            });

          if (!error) {
            newlyUnlocked.push(achievement);
            // Award XP for achievement
            await addXpMutation.mutateAsync({
              amount: achievement.xp_reward,
              reason: `Conquista: ${achievement.name}`,
            });
          }
        }
      }

      return newlyUnlocked;
    },
    onSuccess: (newlyUnlocked) => {
      if (newlyUnlocked.length > 0) {
        for (const achievement of newlyUnlocked) {
          toast({
            title: `🏆 Nova Conquista!`,
            description: achievement.name,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["studius-user-achievements"] });
      }
    },
  });

  // Toggle public visibility
  const togglePublicMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("studius_user_progress")
        .update({ is_public: isPublic })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studius-user-progress"] });
      toast({
        title: "Preferência atualizada",
        description: "Sua visibilidade no ranking foi alterada.",
      });
    },
  });

  // Update display name
  const updateDisplayNameMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("studius_user_progress")
        .update({ display_name: displayName })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studius-user-progress"] });
      queryClient.invalidateQueries({ queryKey: ["studius-leaderboard"] });
    },
  });

  return {
    userProgress,
    achievements,
    userAchievements,
    leaderboard,
    loadingProgress,
    addXp: addXpMutation.mutate,
    addXpAsync: addXpMutation.mutateAsync,
    checkAchievements: checkAchievementsMutation.mutate,
    togglePublic: togglePublicMutation.mutate,
    updateDisplayName: updateDisplayNameMutation.mutate,
    XP_REWARDS,
    calculateLevel,
    xpForLevel,
  };
}
