-- Tornar patient_id opcional em casos clínicos
ALTER TABLE public.cases 
ALTER COLUMN patient_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.cases.patient_id IS 'ID do paciente (opcional - pode ser NULL para casos sem identificação de paciente)';
