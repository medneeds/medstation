-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.calculate_level(xp integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(xp / 100.0))::integer + 1)
$$;