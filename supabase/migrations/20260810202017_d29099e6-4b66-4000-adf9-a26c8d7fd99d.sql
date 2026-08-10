-- feature_flags: restrict reads to authenticated users
DROP POLICY IF EXISTS "flags readable by all" ON public.feature_flags;
CREATE POLICY "Authenticated can read flags"
  ON public.feature_flags FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.feature_flags FROM anon;

-- referral_settings: remove broad authenticated read; admins keep full access
DROP POLICY IF EXISTS "Authenticated can read referral settings" ON public.referral_settings;

CREATE OR REPLACE FUNCTION public.get_public_referral_settings()
RETURNS TABLE(active boolean, referred_discount_percent integer, referrer_reward_days integer, max_rewards_per_referrer integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.active, s.referred_discount_percent, s.referrer_reward_days, s.max_rewards_per_referrer
  FROM public.referral_settings s
  WHERE s.id = 1 AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.get_public_referral_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_referral_settings() TO authenticated;

-- profiles: allow owners to delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);