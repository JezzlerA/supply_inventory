-- Add index on serial_number column in inventory_items for optimized search performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial_number ON public.inventory_items USING btree (serial_number);

-- Add index on serial_number column in assigned_items for optimized search performance
CREATE INDEX IF NOT EXISTS idx_assigned_items_serial_number ON public.assigned_items USING btree (serial_number);

-- Create search_logs table for audit trail of serial number searches
CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  search_term TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'general', -- 'serial_number', 'item_name', 'general', etc.
  page_context TEXT NOT NULL, -- 'inventory', 'dashboard', 'item_monitoring', etc.
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on search_logs
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all search logs
CREATE POLICY "Admins can view all search logs" ON public.search_logs 
  FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own search logs
CREATE POLICY "Users can view own search logs" ON public.search_logs 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

-- Authenticated users can insert search logs
CREATE POLICY "Authenticated can insert search logs" ON public.search_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.search_logs IS 'Audit trail for all search operations including serial number searches';
COMMENT ON COLUMN public.search_logs.search_type IS 'Type of search performed: serial_number, item_name, general, etc.';
COMMENT ON COLUMN public.search_logs.page_context IS 'Page where search was performed: inventory, dashboard, item_monitoring, etc.';
