
-- Add broadcast column to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN is_broadcast boolean NOT NULL DEFAULT false;

-- Allow all authenticated users to see broadcast messages
CREATE POLICY "Users can view broadcast messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (is_broadcast = true);
