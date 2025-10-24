-- Atualizar função de busca para lidar com casos sem paciente identificado
CREATE OR REPLACE FUNCTION public.search_cases(search_query text, user_uuid uuid)
 RETURNS TABLE(id uuid, title text, notes text, chief_complaint text, status text, tags text[], patient_name text, created_at timestamp with time zone, updated_at timestamp with time zone, rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.notes,
    c.chief_complaint,
    c.status,
    c.tags,
    COALESCE(p.name, 'Não identificado') as patient_name,
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
$function$;
