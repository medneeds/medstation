ALTER TABLE public.courtesy_access
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS referral_id uuid;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS reward_type text;

ALTER TABLE public.referral_settings
  ADD COLUMN IF NOT EXISTS lead_reward_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS block_existing_referrers boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_courtesy_access_source ON public.courtesy_access(source);