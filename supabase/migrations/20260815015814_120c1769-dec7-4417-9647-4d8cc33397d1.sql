-- UNITS
CREATE TABLE public.ward_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'enfermaria',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_units TO authenticated;
GRANT ALL ON public.ward_units TO service_role;
ALTER TABLE public.ward_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ward_units" ON public.ward_units FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ward_units_updated_at BEFORE UPDATE ON public.ward_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BEDS
CREATE TABLE public.ward_beds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.ward_units(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_beds TO authenticated;
GRANT ALL ON public.ward_beds TO service_role;
ALTER TABLE public.ward_beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ward_beds" ON public.ward_beds FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ward_beds_updated_at BEFORE UPDATE ON public.ward_beds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ward_beds_unit_idx ON public.ward_beds(unit_id);

-- ADMISSIONS
CREATE TABLE public.ward_admissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bed_id UUID REFERENCES public.ward_beds(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.ward_units(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  date_of_birth DATE,
  record_number TEXT,
  admitted_on DATE NOT NULL DEFAULT CURRENT_DATE,
  main_diagnosis TEXT,
  comorbidities TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  discharged_on DATE,
  discharge_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_admissions TO authenticated;
GRANT ALL ON public.ward_admissions TO service_role;
ALTER TABLE public.ward_admissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ward_admissions" ON public.ward_admissions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ward_admissions_updated_at BEFORE UPDATE ON public.ward_admissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX ward_admissions_active_bed_idx ON public.ward_admissions(bed_id)
  WHERE status = 'active' AND bed_id IS NOT NULL;
CREATE INDEX ward_admissions_user_status_idx ON public.ward_admissions(user_id, status);

-- ROUNDS
CREATE TABLE public.ward_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admission_id UUID NOT NULL REFERENCES public.ward_admissions(id) ON DELETE CASCADE,
  round_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  origin TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_rounds TO authenticated;
GRANT ALL ON public.ward_rounds TO service_role;
ALTER TABLE public.ward_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ward_rounds" ON public.ward_rounds FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ward_rounds_updated_at BEFORE UPDATE ON public.ward_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX ward_rounds_admission_date_idx ON public.ward_rounds(admission_id, round_date);

-- MOVEMENTS
CREATE TABLE public.ward_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admission_id UUID NOT NULL REFERENCES public.ward_admissions(id) ON DELETE CASCADE,
  from_bed_id UUID,
  to_bed_id UUID,
  from_label TEXT,
  to_label TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_movements TO authenticated;
GRANT ALL ON public.ward_movements TO service_role;
ALTER TABLE public.ward_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ward_movements" ON public.ward_movements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ward_movements_admission_idx ON public.ward_movements(admission_id);