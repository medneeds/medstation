import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StudiusPreferences {
  id: string;
  user_id: string;
  specialty: string | null;
  goals: string[];
  study_level: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudiusConversation {
  id: string;
  user_id: string;
  title: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudiusMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface StudiusStats {
  id: string;
  user_id: string;
  study_date: string;
  study_time_minutes: number;
  messages_sent: number;
  flashcards_reviewed: number;
  articles_read: number;
}

export function useStudiusPreferences() {
  const [preferences, setPreferences] = useState<StudiusPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("studius_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreferences = async (data: {
    specialty: string;
    goals: string[];
    study_level?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("studius_preferences")
        .upsert({
          user_id: user.id,
          specialty: data.specialty,
          goals: data.goals,
          study_level: data.study_level || "graduation",
          onboarding_completed: true,
        }, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      setPreferences(result);
      return result;
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Erro ao salvar preferências");
      throw error;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return { preferences, loading, savePreferences, refetch: fetchPreferences };
}

export function useStudiusConversations() {
  const [conversations, setConversations] = useState<StudiusConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("studius_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = async (title?: string): Promise<StudiusConversation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("studius_conversations")
      .insert({
        user_id: user.id,
        title: title || "Nova conversa",
      })
      .select()
      .single();

    if (error) throw error;
    setConversations((prev) => [data, ...prev]);
    return data;
  };

  const updateConversation = async (id: string, updates: Partial<StudiusConversation>) => {
    const { error } = await supabase
      .from("studius_conversations")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from("studius_conversations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    createConversation,
    updateConversation,
    deleteConversation,
    refetch: fetchConversations,
  };
}

export function useStudiusMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<StudiusMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("studius_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const typedMessages = (data || []).map((m) => ({
        ...m,
        role: m.role as "user" | "assistant",
      }));
      setMessages(typedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const addMessage = async (role: "user" | "assistant", content: string): Promise<StudiusMessage> => {
    if (!conversationId) throw new Error("No conversation selected");

    const { data, error } = await supabase
      .from("studius_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    const typedMessage: StudiusMessage = {
      ...data,
      role: data.role as "user" | "assistant",
    };
    setMessages((prev) => [...prev, typedMessage]);
    return typedMessage;
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, addMessage, setMessages, refetch: fetchMessages };
}

export function useStudiusStats() {
  const [stats, setStats] = useState<StudiusStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<StudiusStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("studius_stats")
        .select("*")
        .eq("user_id", user.id)
        .eq("study_date", today)
        .maybeSingle();

      if (error) throw error;
      setStats(data);

      // Fetch weekly stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: weekly, error: weeklyError } = await supabase
        .from("studius_stats")
        .select("*")
        .eq("user_id", user.id)
        .gte("study_date", weekAgo.toISOString().split("T")[0])
        .order("study_date", { ascending: true });

      if (weeklyError) throw weeklyError;
      setWeeklyStats(weekly || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const incrementStat = async (field: "messages_sent" | "flashcards_reviewed" | "articles_read") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // Use upsert with increment
      const { data: current } = await supabase
        .from("studius_stats")
        .select("*")
        .eq("user_id", user.id)
        .eq("study_date", today)
        .maybeSingle();

      if (current) {
        const { data, error } = await supabase
          .from("studius_stats")
          .update({ [field]: (current[field] || 0) + 1 })
          .eq("id", current.id)
          .select()
          .single();

        if (error) throw error;
        setStats(data);
      } else {
        const { data, error } = await supabase
          .from("studius_stats")
          .insert({
            user_id: user.id,
            study_date: today,
            [field]: 1,
          })
          .select()
          .single();

        if (error) throw error;
        setStats(data);
      }
    } catch (error) {
      console.error("Error incrementing stat:", error);
    }
  };

  const calculateStreak = (): number => {
    if (weeklyStats.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      
      const hasActivity = weeklyStats.some(
        (s) => s.study_date === dateStr && (s.messages_sent > 0 || s.flashcards_reviewed > 0)
      );
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);

  return {
    stats,
    weeklyStats,
    loading,
    incrementStat,
    calculateStreak,
    refetch: fetchTodayStats,
  };
}
