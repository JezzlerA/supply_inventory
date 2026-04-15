-- 1. Ensure existing admins are correctly assigned (Migration/One-time)
UPDATE public.profiles
SET office_location = 'Supply Office'
WHERE id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'
);

-- 2. Consolidate handle_new_user to be the master for initial profile creation
-- This function runs AFTER INSERT ON auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_role public.app_role;
    target_office TEXT;
BEGIN
    -- Extract role from metadata, default to 'user'
    target_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user');
    
    -- Logic for initial office:
    -- If admin, forced to 'Supply Office'
    -- If user, extract from metadata, default to 'Unassigned Office'
    IF target_role = 'admin' THEN
        target_office := 'Supply Office';
    ELSE
        target_office := COALESCE(NEW.raw_user_meta_data->>'office_location', 'Unassigned Office');
        -- Double check for empty string
        IF target_office = '' THEN
            target_office := 'Unassigned Office';
        END IF;
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (id, full_name, email, office_location)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
        NEW.email,
        target_office
    );
    
    -- Insert user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, target_role);
    
    RETURN NEW;
END;
$$;

-- 3. Update the enforcement function to be smarter about 'New User' insertions
-- This function runs BEFORE UPDATE/INSERT on public.profiles
CREATE OR REPLACE FUNCTION public.enforce_admin_office_rule()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Try to find the role in user_roles
    SELECT role::text INTO user_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;

    -- If the role is found and it is admin, force the office
    IF user_role = 'admin' THEN
        NEW.office_location := 'Supply Office';
    END IF;

    -- Note: If user_role is NULL (as in a new insertion by handle_new_user), 
    -- we allow the value passed by the INSERT statement to stand.
    -- handle_new_user handles the admin logic for the initial insert.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure triggers are correctly attached
DROP TRIGGER IF EXISTS tr_enforce_admin_office_on_profile ON public.profiles;
CREATE TRIGGER tr_enforce_admin_office_on_profile
BEFORE INSERT OR UPDATE OF office_location ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_admin_office_rule();

-- 5. Updated role sync trigger logic
CREATE OR REPLACE FUNCTION public.sync_office_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If switching TO admin, force profile to Supply Office
    IF NEW.role = 'admin' THEN
        UPDATE public.profiles 
        SET office_location = 'Supply Office' 
        WHERE id = NEW.user_id;
    -- If switching FROM admin TO user, clear office (for safety)
    ELSIF OLD.role = 'admin' AND NEW.role = 'user' THEN
        UPDATE public.profiles 
        SET office_location = 'Unassigned Office' 
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_office_on_role_change ON public.user_roles;
CREATE TRIGGER tr_sync_office_on_role_change
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_office_on_role_change();
