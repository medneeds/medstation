CREATE TABLE public.user_lifecycle_email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_lifecycle_email_events_unique UNIQUE (user_id, event_type)
);

GRANT ALL ON public.user_lifecycle_email_events TO service_role;

ALTER TABLE public.user_lifecycle_email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lifecycle email events"
ON public.user_lifecycle_email_events
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER user_lifecycle_email_events_updated_at
BEFORE UPDATE ON public.user_lifecycle_email_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();