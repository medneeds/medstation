-- Drop the view with SECURITY DEFINER issue and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.studius_leaderboard;

-- Create view with SECURITY INVOKER (default, but explicit for clarity)
CREATE VIEW public.studius_leaderboard 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  total_xp,
  current_level,
  current_streak,
  longest_streak
FROM studius_user_progress
WHERE is_public = true;

-- Grant access to the view
GRANT SELECT ON public.studius_leaderboard TO authenticated, anon;