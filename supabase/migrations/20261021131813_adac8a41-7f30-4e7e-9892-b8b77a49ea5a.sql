ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_status text NOT NULL DEFAULT 'medico',
  ADD COLUMN IF NOT EXISTS medical_school text,
  ADD COLUMN IF NOT EXISTS current_period text;

CREATE TABLE public.intern_campaign_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign text NOT NULL DEFAULT 'internos-30',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  medical_school text NOT NULL,
  current_period text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  graduation_year integer NOT NULL,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  converted_user_id uuid,
  courtesy_granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign, email)
);
CREATE INDEX intern_signups_created_idx ON public.intern_campaign_signups (campaign, created_at);

GRANT SELECT, UPDATE ON public.intern_campaign_signups TO authenticated;
GRANT ALL ON public.intern_campaign_signups TO service_role;
ALTER TABLE public.intern_campaign_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read intern signups" ON public.intern_campaign_signups
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins update intern signups" ON public.intern_campaign_signups
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.submit_intern_signup(
  p_full_name text, p_email text, p_phone text, p_medical_school text,
  p_current_period text, p_city text, p_state text, p_graduation_year integer,
  p_utm jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(queue_position bigint, already boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_id uuid; v_created timestamptz; v_already boolean := false; v_user uuid;
BEGIN
  IF length(trim(coalesce(p_full_name,''))) < 3 OR length(p_full_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 255 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) NOT BETWEEN 10 AND 11 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF length(trim(coalesce(p_medical_school,''))) < 2 OR length(p_medical_school) > 160 THEN RAISE EXCEPTION 'invalid_school'; END IF;
  IF length(trim(coalesce(p_current_period,''))) < 1 OR length(p_current_period) > 40 THEN RAISE EXCEPTION 'invalid_period'; END IF;
  IF length(trim(coalesce(p_city,''))) < 2 OR length(p_city) > 100 THEN RAISE EXCEPTION 'invalid_city'; END IF;
  IF p_state !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'invalid_state'; END IF;
  IF p_graduation_year NOT BETWEEN 2024 AND 2040 THEN RAISE EXCEPTION 'invalid_year'; END IF;

  SELECT s.id, s.created_at INTO v_id, v_created FROM public.intern_campaign_signups s
   WHERE s.campaign = 'internos-30' AND s.email = v_email;
  IF v_id IS NOT NULL THEN
    v_already := true;
  ELSE
    SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = v_email LIMIT 1;
    INSERT INTO public.intern_campaign_signups (full_name, email, phone, medical_school, current_period, city, state, graduation_year, utm, converted_user_id)
    VALUES (trim(p_full_name), v_email, regexp_replace(p_phone, '\D', '', 'g'), trim(p_medical_school), trim(p_current_period), trim(p_city), p_state, p_graduation_year, coalesce(p_utm,'{}'::jsonb), v_user)
    RETURNING id, created_at INTO v_id, v_created;
    IF v_user IS NOT NULL THEN
      UPDATE public.profiles p SET professional_status = 'interno', medical_school = trim(p_medical_school),
        current_period = trim(p_current_period), city = trim(p_city), state = p_state,
        graduation_year = p_graduation_year,
        full_name = coalesce(nullif(p.full_name,''), trim(p_full_name)),
        phone = coalesce(nullif(p.phone,''), regexp_replace(p_phone, '\D', '', 'g'))
       WHERE p.id = v_user AND (p.crm IS NULL OR p.crm = '');
    END IF;
  END IF;
  RETURN QUERY SELECT (SELECT count(*) FROM public.intern_campaign_signups s
                        WHERE s.campaign = 'internos-30' AND (s.created_at, s.id) <= (v_created, v_id)), v_already;
END $$;
REVOKE ALL ON FUNCTION public.submit_intern_signup(text,text,text,text,text,text,text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_intern_signup(text,text,text,text,text,text,text,integer,jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.intern_spots_taken()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.intern_campaign_signups WHERE campaign = 'internos-30';
$$;
GRANT EXECUTE ON FUNCTION public.intern_spots_taken() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_intern_signup_to_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; r record;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.intern_campaign_signups WHERE email = v_email ORDER BY created_at LIMIT 1;
  IF r.id IS NULL THEN RETURN NEW; END IF;
  NEW.professional_status := 'interno';
  NEW.medical_school := r.medical_school;
  NEW.current_period := r.current_period;
  NEW.city := r.city; NEW.state := r.state; NEW.graduation_year := r.graduation_year;
  NEW.full_name := coalesce(nullif(NEW.full_name,''), r.full_name);
  NEW.phone := coalesce(nullif(NEW.phone,''), r.phone);
  UPDATE public.intern_campaign_signups SET converted_user_id = NEW.id WHERE id = r.id AND converted_user_id IS NULL;
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.apply_intern_signup_to_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_apply_intern_signup BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.apply_intern_signup_to_profile();