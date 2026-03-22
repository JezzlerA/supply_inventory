
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trigger to create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (name) VALUES ('Office Supplies'), ('Computer Supplies'), ('Electrical Supplies'), ('Janitorial Supplies'), ('Furniture'), ('Other');

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES public.categories(id),
  unit_of_measure TEXT NOT NULL DEFAULT 'piece',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'In Stock',
  condition TEXT NOT NULL DEFAULT 'Functional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view inventory" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage inventory" ON public.inventory_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Receiving records
CREATE TABLE public.receiving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id UUID REFERENCES public.categories(id),
  unit_of_measure TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_received DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT NOT NULL,
  reference_number TEXT DEFAULT '',
  received_by UUID REFERENCES auth.users(id),
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receiving_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view receiving" ON public.receiving_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage receiving" ON public.receiving_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Supply requests
CREATE TABLE public.supply_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  requesting_office TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  date_requested DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view requests" ON public.supply_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert requests" ON public.supply_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage requests" ON public.supply_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Distributions
CREATE TABLE public.distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  receiving_office TEXT NOT NULL,
  date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
  supply_officer TEXT NOT NULL DEFAULT '',
  remarks TEXT DEFAULT '',
  issued_by UUID REFERENCES auth.users(id),
  request_id UUID REFERENCES public.supply_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view distributions" ON public.distributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage distributions" ON public.distributions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Damaged returns
CREATE TABLE public.damaged_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_code TEXT DEFAULT '',
  quantity INTEGER NOT NULL,
  returning_office TEXT NOT NULL,
  date_returned DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL DEFAULT 'Other',
  status TEXT NOT NULL DEFAULT 'Damaged',
  photo_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  reported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.damaged_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view returns" ON public.damaged_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage returns" ON public.damaged_returns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
