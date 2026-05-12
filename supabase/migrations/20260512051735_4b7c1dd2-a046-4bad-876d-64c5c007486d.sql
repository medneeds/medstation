
-- Tabela de códigos de indicação
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral codes"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de indicações
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID,
  referred_email TEXT,
  referred_crm TEXT,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | qualified | rewarded | blocked
  reward_credit_days INTEGER DEFAULT 30,
  reward_applied_at TIMESTAMPTZ,
  blocked_reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_referrals_referred_user ON public.referrals(referred_user_id) WHERE referred_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_referrals_referred_crm ON public.referrals(referred_crm) WHERE referred_crm IS NOT NULL;
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals (as referrer)"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
