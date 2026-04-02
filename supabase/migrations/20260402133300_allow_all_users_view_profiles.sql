-- Drop the old policy that restricted profiles view to admins only
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policy to allow all authenticated users to view profiles
CREATE POLICY "Authenticated users can view all profiles for chat"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
