-- Create offices table
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default offices
INSERT INTO public.offices (office_name) VALUES
('Supply Office'),
('HR Office'),
('Finance Office'),
('Registrar Office'),
('Faculty Office'),
('Dean''s Office'),
('College of Education'),
('Accounting Office'),
('Cashier''s Office'),
('College of Arts & Science'),
('Library'),
('ICT Office'),
('Student Affairs Office')
ON CONFLICT (office_name) DO NOTHING;

-- Add Unassigned office for users without one
INSERT INTO public.offices (office_name) VALUES ('Unassigned Office') 
ON CONFLICT (office_name) DO NOTHING;

-- Create office_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.office_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_office TEXT,
    new_office TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add office_location to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS office_location TEXT;

-- Update existing admins and users
-- Set admins to Supply Office
UPDATE public.profiles
SET office_location = 'Supply Office'
FROM public.user_roles
WHERE public.profiles.id = public.user_roles.user_id AND public.user_roles.role = 'admin'
  AND (public.profiles.office_location IS NULL OR public.profiles.office_location = '');

-- Set standard users to Unassigned Office
UPDATE public.profiles
SET office_location = 'Unassigned Office'
FROM public.user_roles
WHERE public.profiles.id = public.user_roles.user_id AND public.user_roles.role = 'user'
  AND (public.profiles.office_location IS NULL OR public.profiles.office_location = '');

-- Handle any remaining profiles without a role just in case
UPDATE public.profiles
SET office_location = 'Unassigned Office'
WHERE office_location IS NULL OR office_location = '';

-- Enable RLS and add policies
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow everyone to read offices" ON public.offices;
CREATE POLICY "Allow everyone to read offices" 
ON public.offices FOR SELECT 
USING (true);

ALTER TABLE public.office_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read logs" ON public.office_logs;
CREATE POLICY "Allow authenticated users to read logs" 
ON public.office_logs FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.office_logs;
CREATE POLICY "Allow authenticated users to insert logs" 
ON public.office_logs FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = changed_by);
