-- P0: explicit, persistent signup-trial entitlement.
-- Existing accounts are backfilled using their original auth.users.created_at,
-- so this migration never grants a fresh 7-day trial to an old account.

CREATE TABLE IF NOT EXISTS public.user_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_started_at timestamptz NOT NULL,
  trial_ends_at timestamptz NOT NULL,
  trial_source text NOT NULL DEFAULT 'signup' CHECK (trial_source IN ('signup', 'migration')),
  trial_consumed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (trial_ends_at > trial_started_at)
);

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.user_access TO authenticated;
GRANT ALL ON public.user_access TO service_role;

DROP POLICY IF EXISTS "Users can view own access" ON public.user_access;
CREATE POLICY "Users can view own access"
  ON public.user_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all access" ON public.user_access;
CREATE POLICY "Admins can view all access"
  ON public.user_access FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS user_access_updated_at ON public.user_access;
CREATE TRIGGER user_access_updated_at
  BEFORE UPDATE ON public.user_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.initialize_signup_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  started_at timestamptz;
BEGIN
  started_at := COALESCE(new.created_at, now());

  INSERT INTO public.user_access (
    user_id,
    trial_started_at,
    trial_ends_at,
    trial_source,
    trial_consumed_at
  )
  VALUES (
    new.id,
    started_at,
    started_at + interval '7 days',
    'signup',
    started_at
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_initialize_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_initialize_trial
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.initialize_signup_trial();

-- Backfill without resetting anyone's clock.
INSERT INTO public.user_access (
  user_id,
  trial_started_at,
  trial_ends_at,
  trial_source,
  trial_consumed_at
)
SELECT
  u.id,
  u.created_at,
  u.created_at + interval '7 days',
  'migration',
  u.created_at
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_access_trial_ends_at
  ON public.user_access (trial_ends_at);
