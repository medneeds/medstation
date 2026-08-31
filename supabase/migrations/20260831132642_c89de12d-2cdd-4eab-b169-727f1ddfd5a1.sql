CREATE TABLE IF NOT EXISTS public.stripe_one_time_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text NOT NULL UNIQUE,
  payment_intent_id text,
  stripe_customer_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  plan text NOT NULL DEFAULT 'pro_completo_yearly',
  amount_cents integer,
  currency text,
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamptz,
  access_start timestamptz,
  access_end timestamptz,
  last_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_one_time_purchases_user_idx ON public.stripe_one_time_purchases(user_id);
CREATE INDEX IF NOT EXISTS stripe_one_time_purchases_email_idx ON public.stripe_one_time_purchases(lower(email));
CREATE INDEX IF NOT EXISTS stripe_one_time_purchases_access_end_idx ON public.stripe_one_time_purchases(access_end);

GRANT SELECT ON public.stripe_one_time_purchases TO authenticated;
GRANT ALL ON public.stripe_one_time_purchases TO service_role;

ALTER TABLE public.stripe_one_time_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own annual purchases" ON public.stripe_one_time_purchases;
CREATE POLICY "Users view their own annual purchases"
ON public.stripe_one_time_purchases FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER stripe_one_time_purchases_updated_at
BEFORE UPDATE ON public.stripe_one_time_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_access ADD COLUMN IF NOT EXISTS paid_access_until timestamptz;