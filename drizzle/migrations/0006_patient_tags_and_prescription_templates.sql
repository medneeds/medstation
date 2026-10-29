ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinical_tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS allergies text;

CREATE TABLE public.prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations text,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_templates TO authenticated;
GRANT ALL ON public.prescription_templates TO service_role;

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own templates select" ON public.prescription_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own templates insert" ON public.prescription_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own templates update" ON public.prescription_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own templates delete" ON public.prescription_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX prescription_templates_user_idx ON public.prescription_templates (user_id, use_count DESC);