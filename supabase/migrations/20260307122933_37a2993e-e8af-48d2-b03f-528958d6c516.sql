
-- Table: assigned_items - tracks items assigned to users
CREATE TABLE public.assigned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  serial_number text DEFAULT '',
  date_assigned date NOT NULL DEFAULT CURRENT_DATE,
  current_location text DEFAULT '',
  possession_status text NOT NULL DEFAULT 'With User',
  condition_status text NOT NULL DEFAULT 'Functional',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: item_status_history - audit log for status changes
CREATE TABLE public.item_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_item_id uuid NOT NULL REFERENCES public.assigned_items(id) ON DELETE CASCADE,
  previous_possession_status text,
  new_possession_status text,
  previous_condition_status text,
  new_condition_status text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assigned_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for assigned_items
CREATE POLICY "Admins can manage assigned items" ON public.assigned_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own assigned items" ON public.assigned_items FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for item_status_history
CREATE POLICY "Admins can manage status history" ON public.item_status_history FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own item history" ON public.item_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assigned_items ai WHERE ai.id = assigned_item_id AND ai.user_id = auth.uid())
);
