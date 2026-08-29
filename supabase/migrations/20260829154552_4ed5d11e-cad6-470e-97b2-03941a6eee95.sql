ALTER TABLE public.stripe_subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS canceled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS monthly_amount_cents integer,
  ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone;