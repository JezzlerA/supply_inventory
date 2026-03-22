
-- Add size column to receiving_records and inventory_items
ALTER TABLE public.receiving_records ADD COLUMN IF NOT EXISTS size text DEFAULT '';
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS size text DEFAULT '';

-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  message text NOT NULL,
  is_admin_message boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated can insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages read status"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Create inventory_history table for logging actions
CREATE TABLE public.inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES public.inventory_items(id),
  action text NOT NULL,
  quantity_change integer NOT NULL DEFAULT 0,
  previous_quantity integer,
  new_quantity integer,
  performed_by uuid,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inventory history"
  ON public.inventory_history FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view inventory history"
  ON public.inventory_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert inventory history"
  ON public.inventory_history FOR INSERT
  WITH CHECK (true);

-- Allow admins to view all profiles for chat
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
