-- Recuperação por WhatsApp (Bird): médicos que fizeram o teste grátis (ou já assinaram) e não pagam hoje.
-- Quem entra e quando recebe cada etapa: regra pura em supabase/functions/_shared/whatsapp-recovery.ts.

-- Uma linha por pessoa: cada conta entra na cadência uma única vez.
CREATE TABLE IF NOT EXISTS public.whatsapp_recovery_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  segment text NOT NULL CHECK (segment IN ('trial_expired', 'ex_subscriber')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'replied', 'converted', 'opted_out', 'finished', 'failed', 'paused')),
  last_step smallint NOT NULL DEFAULT 0 CHECK (last_step BETWEEN 0 AND 3),
  last_sent_at timestamptz,
  last_inbound_at timestamptz,
  last_inbound_text text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  converted_at timestamptz,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_recovery_contacts_status ON public.whatsapp_recovery_contacts (status);
CREATE INDEX IF NOT EXISTS idx_wa_recovery_contacts_phone ON public.whatsapp_recovery_contacts (phone_e164);

-- Uma linha por envio: unique(contact_id, step) impede a mesma etapa duas vezes, mesmo com rodadas sobrepostas.
CREATE TABLE IF NOT EXISTS public.whatsapp_recovery_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.whatsapp_recovery_contacts(id) ON DELETE CASCADE,
  step smallint NOT NULL CHECK (step BETWEEN 1 AND 3),
  template_slug text NOT NULL,
  bird_message_id text UNIQUE,
  status text NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'accepted', 'sent', 'delivered', 'read', 'failed')),
  error_code text,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'auto' CHECK (triggered_by IN ('auto', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  UNIQUE (contact_id, step)
);
CREATE INDEX IF NOT EXISTS idx_wa_recovery_messages_created ON public.whatsapp_recovery_messages (created_at DESC);

-- Quem pediu para sair, por celular (vale para qualquer conta com o mesmo número).
CREATE TABLE IF NOT EXISTS public.whatsapp_opt_outs (
  phone_e164 text PRIMARY KEY,
  source text NOT NULL DEFAULT 'reply' CHECK (source IN ('reply', 'admin', 'bird_suppression')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Eventos do webhook do Bird já processados (o Bird reenvia em caso de falha).
CREATE TABLE IF NOT EXISTS public.bird_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS whatsapp_recovery_contacts_updated_at ON public.whatsapp_recovery_contacts;
CREATE TRIGGER whatsapp_recovery_contacts_updated_at BEFORE UPDATE ON public.whatsapp_recovery_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.whatsapp_recovery_contacts, public.whatsapp_recovery_messages, public.whatsapp_opt_outs TO authenticated;
GRANT ALL ON public.whatsapp_recovery_contacts, public.whatsapp_recovery_messages, public.whatsapp_opt_outs,
  public.bird_webhook_events TO service_role;
ALTER TABLE public.whatsapp_recovery_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_recovery_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bird_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read wa recovery contacts" ON public.whatsapp_recovery_contacts;
CREATE POLICY "Admins read wa recovery contacts" ON public.whatsapp_recovery_contacts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins read wa recovery messages" ON public.whatsapp_recovery_messages;
CREATE POLICY "Admins read wa recovery messages" ON public.whatsapp_recovery_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins read wa opt outs" ON public.whatsapp_opt_outs;
CREATE POLICY "Admins read wa opt outs" ON public.whatsapp_opt_outs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Envio automático desligado até o número e os modelos estarem aprovados (liga no painel).
INSERT INTO public.feature_flags (key, description, enabled_global)
VALUES ('whatsapp_recovery_auto', 'Recuperação por WhatsApp: envio automático de hora em hora (seg–sáb, 9h–20h)', false)
ON CONFLICT (key) DO NOTHING;

-- Agenda de hora em hora (minuto 23). A função sai sozinha com a flag desligada ou fora do horário.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
  PERFORM cron.schedule(
    'whatsapp-recovery-run',
    '23 * * * *',
    $cmd$
    SELECT net.http_post(
      url := 'https://rwiovxyftfbkvzbepfqi.supabase.co/functions/v1/whatsapp-recovery-run',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aW92eHlmdGZia3Z6YmVwZnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTQxMTgsImV4cCI6MjA3NjgzMDExOH0.J0f_RQxS2jKbCN_ZMh-5jyBHGPT7snOfaflHScWVkYg"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
    $cmd$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'whatsapp-recovery-run: agenda não registrada (%)', SQLERRM;
END
$$;
