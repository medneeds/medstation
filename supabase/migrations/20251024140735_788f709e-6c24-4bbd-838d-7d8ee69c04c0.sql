-- Criar tabela para documentos médicos
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN ('laudo', 'relatorio', 'atestado')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  diagnosis TEXT,
  cid_code TEXT,
  validity_days INTEGER,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can create own medical documents"
  ON public.medical_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own medical documents"
  ON public.medical_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own medical documents"
  ON public.medical_documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medical documents"
  ON public.medical_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Função para gerar número de documento
CREATE OR REPLACE FUNCTION public.generate_document_number(doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  new_number TEXT;
  prefix TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Determinar prefixo baseado no tipo
  CASE doc_type
    WHEN 'laudo' THEN prefix := 'LD';
    WHEN 'relatorio' THEN prefix := 'RL';
    WHEN 'atestado' THEN prefix := 'AT';
    ELSE prefix := 'DC';
  END CASE;
  
  -- Obter próximo número da sequência para este ano e tipo
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(document_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.medical_documents
  WHERE document_number LIKE prefix || '-' || current_year || '-%';
  
  -- Formato: XX-YYYY-00001
  new_number := prefix || '-' || current_year || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_medical_documents_updated_at
  BEFORE UPDATE ON public.medical_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_medical_documents_user_id ON public.medical_documents(user_id);
CREATE INDEX idx_medical_documents_patient_id ON public.medical_documents(patient_id);
CREATE INDEX idx_medical_documents_document_type ON public.medical_documents(document_type);
CREATE INDEX idx_medical_documents_status ON public.medical_documents(status);