CREATE TABLE public.ward_round_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  unit_id uuid REFERENCES public.ward_units(id) ON DELETE SET NULL,
  unit_name text,
  round_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'recording',
  transcript text NOT NULL DEFAULT '',
  part_transcripts jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_paths text[] NOT NULL DEFAULT '{}',
  consent_confirmed_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_round_sessions TO authenticated;
GRANT ALL ON public.ward_round_sessions TO service_role;
ALTER TABLE public.ward_round_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages round sessions" ON public.ward_round_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX ward_round_sessions_user_unit_idx ON public.ward_round_sessions (user_id, unit_id, started_at DESC);
CREATE TRIGGER ward_round_sessions_updated_at BEFORE UPDATE ON public.ward_round_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ward_round_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.ward_round_sessions(id) ON DELETE CASCADE,
  admission_id uuid REFERENCES public.ward_admissions(id) ON DELETE CASCADE,
  bed_label text,
  patient_label text,
  round_date date NOT NULL DEFAULT CURRENT_DATE,
  topics jsonb NOT NULL DEFAULT '{}'::jsonb,
  content text NOT NULL DEFAULT '',
  applied_to_round_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_round_items TO authenticated;
GRANT ALL ON public.ward_round_items TO service_role;
ALTER TABLE public.ward_round_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages round items" ON public.ward_round_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX ward_round_items_admission_idx ON public.ward_round_items (admission_id, round_date DESC);
CREATE INDEX ward_round_items_session_idx ON public.ward_round_items (session_id);
CREATE TRIGGER ward_round_items_updated_at BEFORE UPDATE ON public.ward_round_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Owner reads own round audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'round-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner uploads own round audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'round-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner deletes own round audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'round-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
