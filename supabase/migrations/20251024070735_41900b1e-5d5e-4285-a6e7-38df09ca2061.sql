-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  reference_type TEXT,
  reference_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    reference_type,
    reference_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_reference_type,
    p_reference_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger: Notify when prescription created with pending_signature status
CREATE OR REPLACE FUNCTION public.notify_prescription_pending_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending_signature' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Prescrição aguardando assinatura',
      'A prescrição ' || NEW.prescription_number || ' está aguardando sua assinatura digital.',
      'warning',
      'prescription',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_prescription_pending_signature
  AFTER INSERT ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_prescription_pending_signature();

-- Trigger: Notify when exam request is created
CREATE OR REPLACE FUNCTION public.notify_exam_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'Nova solicitação de exame',
    'Solicitação de exame ' || NEW.request_number || ' criada com sucesso.',
    'info',
    'exam_request',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_exam_request_created
  AFTER INSERT ON public.exam_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_exam_request_created();

-- Trigger: Notify when exam request is completed
CREATE OR REPLACE FUNCTION public.notify_exam_request_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Exame concluído',
      'A solicitação de exame ' || NEW.request_number || ' foi marcada como concluída.',
      'success',
      'exam_request',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_exam_request_completed
  AFTER UPDATE ON public.exam_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_exam_request_completed();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);