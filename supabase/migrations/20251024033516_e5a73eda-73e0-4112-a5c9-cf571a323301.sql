-- Add tags column to cases table
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tags text[];

-- Add search indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_title_search ON public.cases USING gin(to_tsvector('portuguese', title));
CREATE INDEX IF NOT EXISTS idx_cases_notes_search ON public.cases USING gin(to_tsvector('portuguese', notes));
CREATE INDEX IF NOT EXISTS idx_patients_name_search ON public.patients USING gin(to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_evidences_content_search ON public.evidences USING gin(to_tsvector('portuguese', content));

-- Function for full text search across cases
CREATE OR REPLACE FUNCTION search_cases(search_query text, user_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  notes text,
  chief_complaint text,
  status text,
  tags text[],
  patient_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.notes,
    c.chief_complaint,
    c.status,
    c.tags,
    p.name as patient_name,
    c.created_at,
    c.updated_at,
    ts_rank(
      to_tsvector('portuguese', coalesce(c.title, '') || ' ' || coalesce(c.notes, '') || ' ' || coalesce(c.chief_complaint, '') || ' ' || coalesce(p.name, '')),
      plainto_tsquery('portuguese', search_query)
    ) as rank
  FROM public.cases c
  LEFT JOIN public.patients p ON p.id = c.patient_id
  WHERE c.user_id = user_uuid
    AND (
      to_tsvector('portuguese', coalesce(c.title, '') || ' ' || coalesce(c.notes, '') || ' ' || coalesce(c.chief_complaint, '') || ' ' || coalesce(p.name, ''))
      @@ plainto_tsquery('portuguese', search_query)
      OR search_query = ''
    )
  ORDER BY rank DESC, c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;