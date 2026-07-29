CREATE TABLE public.admin_notification_prefs (
  user_id uuid PRIMARY KEY,
  support_ticket boolean NOT NULL DEFAULT true,
  new_user boolean NOT NULL DEFAULT true,
  sale boolean NOT NULL DEFAULT true,
  milestone boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_prefs TO authenticated;
GRANT ALL ON public.admin_notification_prefs TO service_role;

ALTER TABLE public.admin_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own notification prefs"
ON public.admin_notification_prefs
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND public.is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

CREATE TRIGGER admin_notification_prefs_updated_at
BEFORE UPDATE ON public.admin_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();