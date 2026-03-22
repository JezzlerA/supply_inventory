
CREATE TABLE public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number text NOT NULL UNIQUE,
  transaction_id uuid REFERENCES public.user_transactions(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.supply_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  item_name text NOT NULL,
  category text DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  unit_value numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Approved',
  approved_by uuid,
  approved_by_name text DEFAULT '',
  date_approved timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipts" ON public.receipts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage receipts" ON public.receipts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert receipts" ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (true);
