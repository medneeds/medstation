-- Create a secure view for leaderboard that doesn't expose user_id
CREATE OR REPLACE VIEW public.studius_leaderboard AS
SELECT 
  id,
  display_name,
  total_xp,
  current_level,
  current_streak,
  longest_streak
FROM studius_user_progress
WHERE is_public = true;

-- Grant access to the view for authenticated and anon users
GRANT SELECT ON public.studius_leaderboard TO authenticated, anon;

-- Drop the problematic policy that exposes user_id
DROP POLICY IF EXISTS "Leaderboard shows only safe public data" ON studius_user_progress;

-- Create a policy that only allows users to see their own progress
CREATE POLICY "Users can only view own progress" 
ON studius_user_progress 
FOR SELECT 
USING (auth.uid() = user_id);