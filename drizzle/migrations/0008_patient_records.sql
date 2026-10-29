CREATE TABLE public.patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 50000),
  source_assistant text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_records_patient_idx ON public.patient_records (patient_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.patient_records TO authenticated;
GRANT ALL ON public.patient_records TO service_role;
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own records select" ON public.patient_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own records insert" ON public.patient_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));
CREATE POLICY "Own records delete" ON public.patient_records FOR DELETE TO authenticated USING (auth.uid() = user_id);