
DROP POLICY "Authenticated can insert receipts" ON public.receipts;
CREATE POLICY "Authenticated can insert own receipts" ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
