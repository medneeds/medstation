-- Create flashcard decks table
CREATE TABLE public.studius_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general' NOT NULL,
  card_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create flashcards table with spaced repetition fields
CREATE TABLE public.studius_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid REFERENCES public.studius_decks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  -- Spaced repetition fields (SM-2 algorithm)
  ease_factor numeric DEFAULT 2.5 NOT NULL,
  interval_days integer DEFAULT 0 NOT NULL,
  repetitions integer DEFAULT 0 NOT NULL,
  next_review_date date DEFAULT CURRENT_DATE NOT NULL,
  last_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create review history table
CREATE TABLE public.studius_flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id uuid REFERENCES public.studius_flashcards(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quality integer NOT NULL CHECK (quality >= 0 AND quality <= 5),
  reviewed_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.studius_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- RLS for decks
CREATE POLICY "Users can view own decks" ON public.studius_decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own decks" ON public.studius_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks" ON public.studius_decks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks" ON public.studius_decks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for flashcards
CREATE POLICY "Users can view own flashcards" ON public.studius_flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards" ON public.studius_flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards" ON public.studius_flashcards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON public.studius_flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for reviews
CREATE POLICY "Users can view own reviews" ON public.studius_flashcard_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reviews" ON public.studius_flashcard_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_studius_decks_updated_at
  BEFORE UPDATE ON public.studius_decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studius_flashcards_updated_at
  BEFORE UPDATE ON public.studius_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update deck card count
CREATE OR REPLACE FUNCTION public.update_deck_card_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.studius_decks SET card_count = card_count + 1 WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.studius_decks SET card_count = card_count - 1 WHERE id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to update deck card count
CREATE TRIGGER update_deck_card_count_trigger
  AFTER INSERT OR DELETE ON public.studius_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_deck_card_count();