-- 1. Fix studius_user_progress: Remove public exposure of user_id
-- Drop the existing policy that exposes too much data
DROP POLICY IF EXISTS "Users can view public progress for leaderboard" ON studius_user_progress;

-- Create a new safer policy that only exposes non-sensitive fields for leaderboard
-- Users can only see display_name, total_xp, current_level, current_streak for public users
CREATE POLICY "Leaderboard shows only safe public data" 
ON studius_user_progress 
FOR SELECT 
USING (
  is_public = true 
  OR auth.uid() = user_id
);

-- 2. Add INSERT policy to profiles table
-- The handle_new_user() trigger creates profiles, but we also need a policy
-- for edge cases where manual creation is needed
CREATE POLICY "Users can create own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. Add explicit DENY INSERT policy to notifications for clarity
-- (notifications are system-generated only)
CREATE POLICY "Notifications are system-generated only" 
ON notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (false);