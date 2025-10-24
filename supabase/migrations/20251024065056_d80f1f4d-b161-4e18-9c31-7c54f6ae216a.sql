-- Create exam_requests table
CREATE TABLE public.exam_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  request_number TEXT NOT NULL UNIQUE,
  exams JSONB NOT NULL DEFAULT '[]'::jsonb,
  clinical_indication TEXT,
  cid_code TEXT,
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  results_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own exam requests"
  ON public.exam_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exam requests"
  ON public.exam_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam requests"
  ON public.exam_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exam requests"
  ON public.exam_requests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_exam_requests_user_id ON public.exam_requests(user_id);
CREATE INDEX idx_exam_requests_patient_id ON public.exam_requests(patient_id);
CREATE INDEX idx_exam_requests_status ON public.exam_requests(status);
CREATE INDEX idx_exam_requests_priority ON public.exam_requests(priority);
CREATE INDEX idx_exam_requests_requested_date ON public.exam_requests(requested_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_exam_requests_updated_at
  BEFORE UPDATE ON public.exam_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate exam request number
CREATE OR REPLACE FUNCTION public.generate_exam_request_number()
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
    CAST(SUBSTRING(request_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.exam_requests
  WHERE request_number LIKE 'EX-' || current_year || '-%';
  
  -- Format: EX-YYYY-00001
  new_number := 'EX-' || current_year || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$;