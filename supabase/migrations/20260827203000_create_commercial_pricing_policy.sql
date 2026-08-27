-- Commercial policy for the unified MedStation subscription.
-- The effective timestamp is the deployment time of this migration.
-- Legacy subscribers are guaranteed full-platform access for 6 months.
-- No future price is encoded here: price review is an explicit admin/business decision.

CREATE TABLE IF NOT EXISTS public.commercial_policy (
  id text PRIMARY KEY,
  effective_at timestamptz NOT NULL,
  legacy_full_access_until timestamptz NOT NULL,
  current_monthly_price_cents integer NOT NULL,
  current_yearly_price_cents integer NOT NULL,
  future_monthly_price_cents integer NULL,
  future_yearly_price_cents integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (legacy_full_access_until > effective_at),
  CHECK (current_monthly_price_cents > 0),
  CHECK (current_yearly_price_cents > 0)
);

ALTER TABLE public.commercial_policy ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.commercial_policy TO authenticated;
GRANT ALL ON public.commercial_policy TO service_role;

DROP POLICY IF EXISTS "Authenticated users can read commercial policy" ON public.commercial_policy;
CREATE POLICY "Authenticated users can read commercial policy"
  ON public.commercial_policy FOR SELECT TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS commercial_policy_updated_at ON public.commercial_policy;
CREATE TRIGGER commercial_policy_updated_at
  BEFORE UPDATE ON public.commercial_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.commercial_policy (
  id,
  effective_at,
  legacy_full_access_until,
  current_monthly_price_cents,
  current_yearly_price_cents,
  future_monthly_price_cents,
  future_yearly_price_cents
)
VALUES (
  'medstation_unified_2026',
  now(),
  now() + interval '6 months',
  4990,
  49990,
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;
