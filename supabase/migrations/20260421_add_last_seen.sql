-- Add last_seen column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Allow users to update their own last_seen
DROP POLICY IF EXISTS "Users can update own last_seen" ON public.profiles;
CREATE POLICY "Users can update own last_seen"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
