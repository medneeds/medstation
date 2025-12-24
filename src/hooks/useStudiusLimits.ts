import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STUDIUS_LIMITS } from "@/lib/subscription-tiers";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface StudiusUsage {
  flashcardsCreated: number;
  quizzesCreated: number;
  chatMessagesSent: number;
  studyDate: string;
}

interface UsageLimits {
  flashcards: { used: number; limit: number; remaining: number };
  quizzes: { used: number; limit: number; remaining: number };
  chatMessages: { used: number; limit: number; remaining: number };
}

export function useStudiusLimits() {
  const { hasStudius } = useSubscription();
  const [usage, setUsage] = useState<StudiusUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const limits = hasStudius ? STUDIUS_LIMITS.PREMIUM : STUDIUS_LIMITS.FREE;

  const fetchUsage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("studius_stats")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("study_date", today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setUsage({
        flashcardsCreated: data?.flashcards_reviewed || 0,
        quizzesCreated: 0, // Will be calculated separately
        chatMessagesSent: data?.messages_sent || 0,
        studyDate: today,
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [hasStudius]);

  const getUsageLimits = (): UsageLimits => {
    const used = usage || { flashcardsCreated: 0, quizzesCreated: 0, chatMessagesSent: 0 };
    
    return {
      flashcards: {
        used: used.flashcardsCreated,
        limit: limits.flashcards,
        remaining: Math.max(0, limits.flashcards - used.flashcardsCreated),
      },
      quizzes: {
        used: used.quizzesCreated,
        limit: limits.quizzes,
        remaining: Math.max(0, limits.quizzes - used.quizzesCreated),
      },
      chatMessages: {
        used: used.chatMessagesSent,
        limit: limits.chatMessages,
        remaining: Math.max(0, limits.chatMessages - used.chatMessagesSent),
      },
    };
  };

  const checkLimit = (type: "flashcards" | "quizzes" | "chatMessages"): boolean => {
    if (hasStudius) return true; // Premium has no limits
    
    const usageLimits = getUsageLimits();
    return usageLimits[type].remaining > 0;
  };

  const showUpgradePrompt = (type: "flashcards" | "quizzes" | "chatMessages") => {
    const typeLabels = {
      flashcards: "flashcards",
      quizzes: "quizzes",
      chatMessages: "mensagens no chat",
    };

    toast({
      title: "Limite atingido",
      description: `Você atingiu o limite de ${typeLabels[type]} gratuitos. Assine o Studius Premium para uso ilimitado!`,
      variant: "destructive",
    });
  };

  return {
    usage,
    loading,
    hasStudius,
    isPremium: hasStudius,
    limits,
    getUsageLimits,
    checkLimit,
    showUpgradePrompt,
    refreshUsage: fetchUsage,
  };
}
