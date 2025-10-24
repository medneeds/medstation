-- Fix search_cases function to include SET search_path for security
CREATE OR REPLACE FUNCTION public.search_cases(search_query text, user_uuid uuid)
 RETURNS TABLE(id uuid, title text, notes text, chief_complaint text, status text, tags text[], patient_name text, created_at timestamp with time zone, updated_at timestamp with time zone, rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
$function$;

-- Create rate_limits table for edge function rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, function_name, window_start)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate_limits
CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_function 
  ON public.rate_limits(user_id, function_name, window_start);

-- Create function to clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '24 hours';
END;
$$;