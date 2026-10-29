ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clinic_name text,
  ADD COLUMN IF NOT EXISTS clinic_phone text,
  ADD COLUMN IF NOT EXISTS letterhead_logo_url text;