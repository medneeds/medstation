CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  stripe_subscription_id text PRIMARY KEY,
  stripe_customer_id text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL,
  price_id text NULL,
  product_id text NULL,
  current_period_end timestamptz NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  past_due_since timestamptz NULL,
  last_payment_failed_at timestamptz NULL,
  last_payment_succeeded_at timestamptz NULL,
  last_event_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stripe_subscriptions TO service_role;
GRANT SELECT ON public.stripe_subscriptions TO authenticated;
DROP POLICY IF EXISTS "Users can view own Stripe subscription state" ON public.stripe_subscriptions;
CREATE POLICY "Users can view own Stripe subscription state" ON public.stripe_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS stripe_subscriptions_updated_at ON public.stripe_subscriptions;
CREATE TRIGGER stripe_subscriptions_updated_at BEFORE UPDATE ON public.stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_id ON public.stripe_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON public.stripe_subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON public.stripe_subscriptions (status);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'processed', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text NULL,
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stripe_webhook_events TO service_role;
GRANT SELECT ON public.stripe_webhook_events TO authenticated;
DROP POLICY IF EXISTS "Admins can view Stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins can view Stripe webhook events" ON public.stripe_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS stripe_webhook_events_updated_at ON public.stripe_webhook_events;
CREATE TRIGGER stripe_webhook_events_updated_at BEFORE UPDATE ON public.stripe_webhook_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON public.stripe_webhook_events (status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events (event_type);