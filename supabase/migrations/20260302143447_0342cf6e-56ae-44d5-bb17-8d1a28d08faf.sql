
-- Allow admins to see ALL chat messages
CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
