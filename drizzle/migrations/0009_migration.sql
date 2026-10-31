ALTER TABLE public.stripe_one_time_purchases
  ADD COLUMN IF NOT EXISTS recovery_url text,
  ADD COLUMN IF NOT EXISTS boleto_voucher_url text,
  ADD COLUMN IF NOT EXISTS boleto_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS boleto_reminders_sent text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS replaced_subscription_ids text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS stripe_one_time_purchases_boleto_pending_idx
  ON public.stripe_one_time_purchases (boleto_expires_at)
  WHERE status = 'pending' AND payment_method = 'boleto';