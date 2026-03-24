-- Add policy to allow admins to update other profiles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);
