CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_hash text NOT NULL,
  label text,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_hash)
);
GRANT SELECT, DELETE ON public.trusted_devices TO authenticated;
GRANT ALL ON public.trusted_devices TO service_role;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own devices" ON public.trusted_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users remove own devices" ON public.trusted_devices FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trusted_devices_updated_at BEFORE UPDATE ON public.trusted_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_hash text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_challenges_user_device_idx ON public.login_challenges (user_id, device_hash, created_at DESC);
GRANT ALL ON public.login_challenges TO service_role;
ALTER TABLE public.login_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.active_sessions (
  user_id uuid PRIMARY KEY,
  device_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own active session" ON public.active_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER active_sessions_updated_at BEFORE UPDATE ON public.active_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();