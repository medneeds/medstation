ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, last_message_at DESC);

DROP POLICY IF EXISTS "users update own tickets" ON public.support_tickets;
CREATE POLICY "users update own tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);