-- Adicionar coluna fingerprint à tabela rate_limits para identificação multi-camada
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS fingerprint text;

-- Criar índice para busca eficiente por fingerprint
CREATE INDEX IF NOT EXISTS idx_rate_limits_fingerprint ON public.rate_limits(fingerprint);

-- Criar índice composto para busca por user_id + function_name + fingerprint
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_function_fingerprint 
ON public.rate_limits(user_id, function_name, fingerprint);