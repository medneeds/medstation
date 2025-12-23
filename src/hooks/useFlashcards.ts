import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGamification } from "./useGamification";

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// SM-2 Algorithm implementation
export function calculateSM2(
  quality: number, // 0-5 (0-2 = fail, 3-5 = success)
  repetitions: number,
  easeFactor: number,
  interval: number
): { repetitions: number; easeFactor: number; interval: number } {
  let newRepetitions = repetitions;
  let newEaseFactor = easeFactor;
  let newInterval = interval;

  if (quality < 3) {
    // Failed - reset
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Success
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
    newRepetitions += 1;
  }

  // Update ease factor
  newEaseFactor = newEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
  };
}

export function useFlashcardDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("studius_decks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDecks(data || []);
    } catch (error) {
      console.error("Error fetching decks:", error);
      toast.error("Erro ao carregar baralhos");
    } finally {
      setLoading(false);
    }
  }, []);

  const createDeck = async (title: string, description?: string, category?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("studius_decks")
      .insert({
        user_id: user.id,
        title,
        description,
        category: category || "general",
      })
      .select()
      .single();

    if (error) throw error;
    setDecks((prev) => [data, ...prev]);
    return data as Deck;
  };

  const updateDeck = async (id: string, updates: Partial<Deck>) => {
    const { error } = await supabase
      .from("studius_decks")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDeck = async (id: string) => {
    const { error } = await supabase
      .from("studius_decks")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return { decks, loading, createDeck, updateDeck, deleteDeck, refetch: fetchDecks };
}

export function useFlashcards(deckId: string | null) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const { addXpAsync, checkAchievements, XP_REWARDS } = useGamification();

  const fetchFlashcards = useCallback(async () => {
    if (!deckId) {
      setFlashcards([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("studius_flashcards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  const createFlashcard = async (front: string, back: string) => {
    if (!deckId) throw new Error("No deck selected");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("studius_flashcards")
      .insert({
        deck_id: deckId,
        user_id: user.id,
        front,
        back,
      })
      .select()
      .single();

    if (error) throw error;
    setFlashcards((prev) => [...prev, data]);
    return data as Flashcard;
  };

  const updateFlashcard = async (id: string, updates: Partial<Flashcard>) => {
    const { error } = await supabase
      .from("studius_flashcards")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    setFlashcards((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteFlashcard = async (id: string) => {
    const { error } = await supabase
      .from("studius_flashcards")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
  };

  const reviewFlashcard = async (id: string, quality: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const card = flashcards.find((f) => f.id === id);
    if (!card) throw new Error("Card not found");

    const { repetitions, easeFactor, interval } = calculateSM2(
      quality,
      card.repetitions,
      card.ease_factor,
      card.interval_days
    );

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // Update flashcard
    const { error: updateError } = await supabase
      .from("studius_flashcards")
      .update({
        repetitions,
        ease_factor: easeFactor,
        interval_days: interval,
        next_review_date: nextReviewDate.toISOString().split("T")[0],
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Record review
    const { error: reviewError } = await supabase
      .from("studius_flashcard_reviews")
      .insert({
        flashcard_id: id,
        user_id: user.id,
        quality,
      });

    if (reviewError) throw reviewError;

    // Update local state
    setFlashcards((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              repetitions,
              ease_factor: easeFactor,
              interval_days: interval,
              next_review_date: nextReviewDate.toISOString().split("T")[0],
              last_reviewed_at: new Date().toISOString(),
            }
          : f
      )
    );

    // Add XP for reviewing
    await addXpAsync({ amount: XP_REWARDS.FLASHCARD_REVIEWED, reason: "Flashcard revisado" });
  };

  const getCardsToReview = () => {
    const today = new Date().toISOString().split("T")[0];
    return flashcards.filter((f) => f.next_review_date <= today);
  };

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  return {
    flashcards,
    loading,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    reviewFlashcard,
    getCardsToReview,
    refetch: fetchFlashcards,
  };
}

export function useAllCardsToReview() {
  const [cards, setCards] = useState<(Flashcard & { deck_title: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCardsToReview = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("studius_flashcards")
        .select("*, deck:studius_decks(title)")
        .eq("user_id", user.id)
        .lte("next_review_date", today)
        .order("next_review_date", { ascending: true });

      if (error) throw error;

      const cardsWithDeckTitle = (data || []).map((card: any) => ({
        ...card,
        deck_title: card.deck?.title || "Sem baralho",
      }));

      setCards(cardsWithDeckTitle);
    } catch (error) {
      console.error("Error fetching cards to review:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCardsToReview();
  }, [fetchCardsToReview]);

  return { cards, loading, refetch: fetchCardsToReview };
}
