-- Studio (Beta): conversas e assistentes próprios salvos na conta do médico.
CREATE TABLE public.studio_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 10000),
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_assistants TO authenticated;
GRANT ALL ON public.studio_assistants TO service_role;
ALTER TABLE public.studio_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own studio assistants" ON public.studio_assistants
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX studio_assistants_user_idx ON public.studio_assistants (user_id, created_at);

CREATE TABLE public.studio_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Nova conversa' CHECK (char_length(title) <= 200),
  model text NOT NULL,
  assistant_id uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(messages) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_threads TO authenticated;
GRANT ALL ON public.studio_threads TO service_role;
ALTER TABLE public.studio_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own studio threads" ON public.studio_threads
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX studio_threads_user_updated_idx ON public.studio_threads (user_id, updated_at DESC);