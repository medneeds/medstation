CREATE TABLE public.referral_settings (
  id integer PRIMARY KEY DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  referred_discount_percent integer NOT NULL DEFAULT 50,
  referred_stripe_coupon text NOT NULL DEFAULT 'XzP9db0s',
  referrer_reward_days integer NOT NULL DEFAULT 30,
  require_crm boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT referral_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.referral_settings TO authenticated;
GRANT ALL ON public.referral_settings TO service_role;

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral settings"
  ON public.referral_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read referral settings"
  ON public.referral_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER referral_settings_updated_at
  BEFORE UPDATE ON public.referral_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.referral_settings (id) VALUES (1) ON CONFLICT DO NOTHING;