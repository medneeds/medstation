CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  severity text NOT NULL DEFAULT 'info',
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view admin notifications"
ON public.admin_notifications FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications (created_at DESC);

CREATE TABLE public.admin_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.admin_notification_reads TO authenticated;
GRANT ALL ON public.admin_notification_reads TO service_role;
ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own reads"
ON public.admin_notification_reads FOR ALL TO authenticated
USING (user_id = auth.uid() AND public.is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type text, p_title text, p_message text DEFAULT NULL,
  p_link text DEFAULT NULL, p_severity text DEFAULT 'info',
  p_reference_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid;
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, link, severity, reference_id, metadata)
  VALUES (p_type, p_title, p_message, p_link, p_severity, p_reference_id, p_metadata)
  RETURNING id INTO nid;
  RETURN nid;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admin_support_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_admin_notification(
    'support_ticket',
    'Novo ticket de suporte',
    NEW.subject,
    '/admin/suporte?ticket=' || NEW.id::text,
    CASE WHEN NEW.priority IN ('high','urgent') THEN 'critical' ELSE 'info' END,
    NEW.id,
    jsonb_build_object('priority', NEW.priority, 'user_id', NEW.user_id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_admin_support_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_support_ticket();

CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total int;
BEGIN
  PERFORM public.create_admin_notification(
    'new_user',
    'Novo usuário cadastrado',
    COALESCE(NEW.full_name, 'Usuário sem nome'),
    '/admin/usuarios?u=' || NEW.id::text,
    'success',
    NEW.id,
    '{}'::jsonb
  );

  SELECT count(*) INTO total FROM public.profiles;
  IF total > 0 AND total % 25 = 0 THEN
    PERFORM public.create_admin_notification(
      'milestone',
      'Marco alcançado: ' || total || ' usuários',
      'A plataforma acaba de atingir ' || total || ' usuários cadastrados.',
      '/admin/usuarios',
      'milestone',
      NULL,
      jsonb_build_object('total_users', total)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_admin_new_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

CREATE OR REPLACE FUNCTION public.notify_admin_referral_converted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'converted' AND (OLD.status IS DISTINCT FROM 'converted') THEN
    PERFORM public.create_admin_notification(
      'sale',
      'Nova venda por indicação',
      'Indicação ' || NEW.code || ' foi convertida em assinatura.',
      '/admin/indicacoes',
      'success',
      NEW.id,
      jsonb_build_object('code', NEW.code)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_admin_referral_converted
AFTER UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_referral_converted();

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;