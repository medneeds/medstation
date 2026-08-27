-- Security hardening: SECURITY DEFINER RPC must never trust a caller-supplied user UUID.
CREATE OR REPLACE FUNCTION public.search_cases(search_query text, user_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  notes text,
  chief_complaint text,
  status text,
  tags text[],
  patient_name text,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_uuid uuid;
BEGIN
  caller_uuid := auth.uid();

  IF caller_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF user_uuid IS DISTINCT FROM caller_uuid THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.notes,
    c.chief_complaint,
    c.status,
    c.tags,
    p.name AS patient_name,
    c.created_at,
    c.updated_at,
    ts_rank(
      to_tsvector('portuguese', coalesce(c.title, '') || ' ' || coalesce(c.notes, '') || ' ' || coalesce(c.chief_complaint, '') || ' ' || coalesce(p.name, '')),
      plainto_tsquery('portuguese', search_query)
    ) AS rank
  FROM public.cases c
  LEFT JOIN public.patients p ON p.id = c.patient_id
  WHERE c.user_id = caller_uuid
    AND (
      to_tsvector('portuguese', coalesce(c.title, '') || ' ' || coalesce(c.notes, '') || ' ' || coalesce(c.chief_complaint, '') || ' ' || coalesce(p.name, ''))
      @@ plainto_tsquery('portuguese', search_query)
      OR search_query = ''
    )
  ORDER BY rank DESC, c.updated_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_cases(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_cases(text, uuid) TO authenticated, service_role;

-- Trigger-only function: no client needs direct EXECUTE privileges.
REVOKE ALL ON FUNCTION public.initialize_signup_trial() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_signup_trial() TO service_role;
