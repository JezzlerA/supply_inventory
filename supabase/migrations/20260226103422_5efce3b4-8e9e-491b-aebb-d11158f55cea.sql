
-- Fix overly permissive policy - restrict to authenticated users
DROP POLICY IF EXISTS "Authenticated can insert inventory history" ON public.inventory_history;
CREATE POLICY "Authenticated can insert inventory history"
  ON public.inventory_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view inventory history" ON public.inventory_history;
CREATE POLICY "Authenticated can view inventory history"
  ON public.inventory_history FOR SELECT
  TO authenticated
  USING (true);
