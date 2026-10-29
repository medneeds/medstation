ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_sex_check CHECK (sex IS NULL OR sex IN ('F', 'M'));