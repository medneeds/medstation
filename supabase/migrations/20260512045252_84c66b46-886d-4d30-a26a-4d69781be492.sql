CREATE POLICY "Users can view own courtesy access"
  ON public.courtesy_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);