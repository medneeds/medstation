CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz,
  primary_path text CHECK (primary_path IN ('documentation','copilot','workflow')),
  recommended_tools text[] NOT NULL DEFAULT '{}',
  routine_pain text,
  work_setting text,
  primary_goal text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages onboarding" ON public.user_onboarding;
CREATE POLICY "Service role manages onboarding"
  ON public.user_onboarding FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: usuários existentes não são obrigados ao onboarding
INSERT INTO public.user_onboarding (user_id, completed_at)
SELECT u.id, now()
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Novos usuários entram pendentes, reutilizando o trigger existente de criação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, crm, crm_state)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    NULLIF(new.raw_user_meta_data->>'phone', ''),
    NULLIF(new.raw_user_meta_data->>'crm', ''),
    NULLIF(new.raw_user_meta_data->>'crm_state', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_onboarding (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$function$;