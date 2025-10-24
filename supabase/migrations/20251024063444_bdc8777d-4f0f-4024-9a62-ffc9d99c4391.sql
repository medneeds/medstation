-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  prescription_number TEXT NOT NULL UNIQUE,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  cid_code TEXT,
  diagnosis TEXT,
  validity_days INTEGER NOT NULL DEFAULT 30,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'cancelled')),
  pdf_url TEXT,
  signed_pdf_url TEXT,
  signature_id TEXT,
  signature_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own prescriptions"
  ON public.prescriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own prescriptions"
  ON public.prescriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prescriptions"
  ON public.prescriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prescriptions"
  ON public.prescriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_prescriptions_user_id ON public.prescriptions(user_id);
CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX idx_prescriptions_created_at ON public.prescriptions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate prescription number
CREATE OR REPLACE FUNCTION public.generate_prescription_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(prescription_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.prescriptions
  WHERE prescription_number LIKE 'RX-' || current_year || '-%';
  
  -- Format: RX-YYYY-00001
  new_number := 'RX-' || current_year || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$;