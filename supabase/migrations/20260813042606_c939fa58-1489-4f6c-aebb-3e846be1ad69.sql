CREATE TABLE IF NOT EXISTS public.case_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_folders TO authenticated;
GRANT ALL ON public.case_folders TO service_role;

ALTER TABLE public.case_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own case folders"
ON public.case_folders FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.case_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consultation_date date NOT NULL DEFAULT current_date;

CREATE INDEX IF NOT EXISTS cases_folder_id_idx ON public.cases(folder_id);
CREATE INDEX IF NOT EXISTS cases_consultation_date_idx ON public.cases(consultation_date DESC);