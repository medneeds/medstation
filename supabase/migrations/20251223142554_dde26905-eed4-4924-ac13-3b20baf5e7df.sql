-- Drop existing restrictive policies on patients table
DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;

-- Create proper PERMISSIVE policies (default) that require authentication
CREATE POLICY "Users can view own patients" 
ON public.patients 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own patients" 
ON public.patients 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients" 
ON public.patients 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients" 
ON public.patients 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);