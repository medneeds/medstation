CREATE TABLE public.legacy_trial_invites (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  email_sent_at timestamptz,
  claimed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legacy_trial_invites TO authenticated;
GRANT ALL ON public.legacy_trial_invites TO service_role;

ALTER TABLE public.legacy_trial_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own legacy trial invite"
  ON public.legacy_trial_invites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all legacy trial invites"
  ON public.legacy_trial_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER legacy_trial_invites_updated_at
  BEFORE UPDATE ON public.legacy_trial_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: todos os usuários antigos que já receberam a cortesia legacy_trial
INSERT INTO public.legacy_trial_invites (user_id, email)
SELECT ca.user_id, u.email
FROM public.courtesy_access ca
JOIN auth.users u ON u.id = ca.user_id
WHERE ca.source = 'legacy_trial'
ON CONFLICT (user_id) DO NOTHING;

-- A contagem passa a valer a partir da ativação pelo usuário
UPDATE public.courtesy_access
SET expires_at = now()
WHERE source = 'legacy_trial';