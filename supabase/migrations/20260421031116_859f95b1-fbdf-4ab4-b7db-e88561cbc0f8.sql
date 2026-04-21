-- Create courtesy_access table for manual premium access grants
CREATE TABLE public.courtesy_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  granted_by UUID NOT NULL,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.courtesy_access ENABLE ROW LEVEL SECURITY;

-- Only admins can view courtesy access records
CREATE POLICY "Admins can view all courtesy access"
ON public.courtesy_access
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can grant courtesy access
CREATE POLICY "Admins can grant courtesy access"
ON public.courtesy_access
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = granted_by);

-- Only admins can update courtesy access
CREATE POLICY "Admins can update courtesy access"
ON public.courtesy_access
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can revoke courtesy access
CREATE POLICY "Admins can revoke courtesy access"
ON public.courtesy_access
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_courtesy_access_updated_at
BEFORE UPDATE ON public.courtesy_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check if a user has active courtesy access
CREATE OR REPLACE FUNCTION public.has_active_courtesy(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courtesy_access
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Index for performance
CREATE INDEX idx_courtesy_access_user_id ON public.courtesy_access(user_id);
CREATE INDEX idx_courtesy_access_expires_at ON public.courtesy_access(expires_at) WHERE expires_at IS NOT NULL;