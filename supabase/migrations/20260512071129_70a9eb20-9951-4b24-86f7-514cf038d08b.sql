CREATE TABLE public.prescription_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  indication TEXT,
  cid_code TEXT,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  source TEXT DEFAULT 'manual',
  source_assistant TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prescription_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prescription library"
  ON public.prescription_library FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own prescription library"
  ON public.prescription_library FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own prescription library"
  ON public.prescription_library FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own prescription library"
  ON public.prescription_library FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_prescription_library_updated_at
  BEFORE UPDATE ON public.prescription_library
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_prescription_library_user ON public.prescription_library(user_id, updated_at DESC);
CREATE INDEX idx_prescription_library_tags ON public.prescription_library USING GIN(tags);