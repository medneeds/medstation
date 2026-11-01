-- Lembretes da Black para quem começou a compra e não concluiu (black-recovery-reminders).
-- Uma linha por e-mail + etapa: garante que ninguém recebe a mesma etapa duas vezes.
CREATE TABLE IF NOT EXISTS public.black_recovery_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  step text NOT NULL CHECK (step IN ('1h', '24h')),
  purchase_id uuid,
  outcome text NOT NULL DEFAULT 'sending' CHECK (outcome IN ('sending', 'sent', 'suppressed')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, step)
);
GRANT SELECT ON public.black_recovery_emails TO authenticated;
GRANT ALL ON public.black_recovery_emails TO service_role;
ALTER TABLE public.black_recovery_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read black recovery emails" ON public.black_recovery_emails;
CREATE POLICY "Admins read black recovery emails" ON public.black_recovery_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Agenda de hora em hora (minuto 17), como o boleto-reminders. A função sai sozinha fora da oferta.
-- Se pg_cron/pg_net não puderem ser ativados aqui, a tabela fica criada e o aviso aparece no log.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
  PERFORM cron.schedule(
    'black-recovery-reminders',
    '17 * * * *',
    $cmd$
    SELECT net.http_post(
      url := 'https://rwiovxyftfbkvzbepfqi.supabase.co/functions/v1/black-recovery-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aW92eHlmdGZia3Z6YmVwZnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTQxMTgsImV4cCI6MjA3NjgzMDExOH0.J0f_RQxS2jKbCN_ZMh-5jyBHGPT7snOfaflHScWVkYg"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
    $cmd$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'black-recovery-reminders: agenda não registrada (%)', SQLERRM;
END
$$;
