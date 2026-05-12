CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  ip_address TEXT NULL,
  fingerprint TEXT NULL,
  function_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'prompt_extraction_attempt',
  pattern_matched TEXT NULL,
  excerpt TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_user_id ON public.security_events (user_id);
CREATE INDEX idx_security_events_function_name ON public.security_events (function_name);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete security events"
  ON public.security_events
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));