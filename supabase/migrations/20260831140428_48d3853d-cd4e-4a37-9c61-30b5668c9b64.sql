ALTER TABLE public.stripe_one_time_purchases
  ADD COLUMN IF NOT EXISTS payment_category text NOT NULL DEFAULT 'annual_one_time',
  ADD COLUMN IF NOT EXISTS access_period text,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS checkout_status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS acquisition_source text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS recovery_status text NOT NULL DEFAULT 'not_needed',
  ADD COLUMN IF NOT EXISTS recovery_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_updated_by uuid,
  ADD COLUMN IF NOT EXISTS recovered_from_purchase_id uuid REFERENCES public.stripe_one_time_purchases(id) ON DELETE SET NULL;

UPDATE public.stripe_one_time_purchases
SET access_period = COALESCE(access_period, 'annual_12m'),
    payment_category = 'annual_one_time',
    checkout_status = CASE WHEN status = 'paid' THEN 'completed'
                           WHEN status = 'expired' THEN 'expired'
                           ELSE 'completed' END,
    recovery_status = CASE WHEN status IN ('failed','expired') THEN 'eligible' ELSE 'not_needed' END
WHERE access_period IS NULL OR payment_category IS NULL;

ALTER TABLE public.stripe_one_time_purchases
  DROP CONSTRAINT IF EXISTS stripe_one_time_purchases_payment_category_check,
  DROP CONSTRAINT IF EXISTS stripe_one_time_purchases_access_period_check,
  DROP CONSTRAINT IF EXISTS stripe_one_time_purchases_payment_method_check,
  DROP CONSTRAINT IF EXISTS stripe_one_time_purchases_checkout_status_check,
  DROP CONSTRAINT IF EXISTS stripe_one_time_purchases_recovery_status_check;

ALTER TABLE public.stripe_one_time_purchases
  ADD CONSTRAINT stripe_one_time_purchases_payment_category_check
    CHECK (payment_category IN ('recurring_card_monthly','pix_monthly_one_time','annual_one_time')),
  ADD CONSTRAINT stripe_one_time_purchases_access_period_check
    CHECK (access_period IS NULL OR access_period IN ('monthly_30d','annual_12m')),
  ADD CONSTRAINT stripe_one_time_purchases_payment_method_check
    CHECK (payment_method IN ('card','pix','unknown')),
  ADD CONSTRAINT stripe_one_time_purchases_checkout_status_check
    CHECK (checkout_status IN ('started','completed','expired')),
  ADD CONSTRAINT stripe_one_time_purchases_recovery_status_check
    CHECK (recovery_status IN ('not_needed','eligible','contacted','recovered','dismissed'));

CREATE INDEX IF NOT EXISTS stripe_one_time_purchases_category_idx
  ON public.stripe_one_time_purchases (payment_category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS stripe_one_time_purchases_recovery_idx
  ON public.stripe_one_time_purchases (recovery_status, created_at DESC);

GRANT SELECT, UPDATE ON public.stripe_one_time_purchases TO authenticated;
GRANT ALL ON public.stripe_one_time_purchases TO service_role;

DROP POLICY IF EXISTS "Staff can read one-time purchases" ON public.stripe_one_time_purchases;
CREATE POLICY "Staff can read one-time purchases"
ON public.stripe_one_time_purchases
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update recovery status" ON public.stripe_one_time_purchases;
CREATE POLICY "Staff can update recovery status"
ON public.stripe_one_time_purchases
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));