-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS crm_state TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS rqe TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add check constraint for graduation year (must be reasonable)
ALTER TABLE public.profiles
  ADD CONSTRAINT check_graduation_year 
  CHECK (graduation_year IS NULL OR (graduation_year >= 1950 AND graduation_year <= EXTRACT(YEAR FROM CURRENT_DATE)));

-- Add check constraint for CRM state (must be valid Brazilian state)
ALTER TABLE public.profiles
  ADD CONSTRAINT check_crm_state
  CHECK (crm_state IS NULL OR crm_state IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'));