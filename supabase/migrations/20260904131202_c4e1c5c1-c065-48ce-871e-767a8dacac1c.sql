ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.messages.metadata IS
  'Metadados técnicos da mensagem (ex.: mode=radiology_interpreter, radiology_evidence_ids). Nunca contém base64 nem conteúdo clínico.';