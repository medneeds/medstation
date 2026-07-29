ALTER TABLE public.referral_settings ADD COLUMN IF NOT EXISTS max_rewards_per_referrer integer NOT NULL DEFAULT 3;
UPDATE public.referral_settings SET max_rewards_per_referrer = 3 WHERE id = 1;