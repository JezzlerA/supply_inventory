-- Add advanced messaging columns
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Enable users to update their own messages (for the unsend feature)
DROP POLICY IF EXISTS "Enable update for message senders" ON public.chat_messages;
CREATE POLICY "Enable update for message senders"
ON public.chat_messages FOR UPDATE
TO authenticated USING (auth.uid() = sender_id);

-- Create Chat Reactions Table
CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- RLS for Chat Reactions
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.chat_reactions;
CREATE POLICY "Enable read access for all authenticated users"
ON public.chat_reactions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.chat_reactions;
CREATE POLICY "Enable insert for authenticated users"
ON public.chat_reactions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for message owners" ON public.chat_reactions;
CREATE POLICY "Enable delete for message owners"
ON public.chat_reactions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Add Chat Reactions to Realtime safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
    END IF;
END
$$;

-- Storage Bucket setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for chat_attachments bucket
DROP POLICY IF EXISTS "Public Read chat_attachments" ON storage.objects;
CREATE POLICY "Public Read chat_attachments"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'chat_attachments');

DROP POLICY IF EXISTS "Authenticated users can upload to chat_attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload to chat_attachments"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'chat_attachments');
