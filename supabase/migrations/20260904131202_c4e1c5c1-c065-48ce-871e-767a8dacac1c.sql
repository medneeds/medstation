-- Examinus · Modo Interpretador V1
-- Persiste apenas referências estruturadas às evidências radiológicas.
-- Imagens permanecem no bucket privado `evidences`; base64 nunca é gravado em messages.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.messages.metadata IS
  'Metadata estruturada da mensagem (ex.: mode e radiology_evidence_ids); não armazenar imagem/base64.';
