-- Fix RLS policies for chatbot_content_sources to allow anonymous access for public chatbots

-- First, let's check current policies (run this first to see what exists)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'chatbot_content_sources';

-- Drop existing policies on chatbot_content_sources (if any)
DROP POLICY IF EXISTS "Users can view their own content sources" ON public.chatbot_content_sources;
DROP POLICY IF EXISTS "Users can manage their own content sources" ON public.chatbot_content_sources;
DROP POLICY IF EXISTS "Content sources are visible to chatbot owners" ON public.chatbot_content_sources;

-- Create new policies that allow reading content sources for public/shared chatbots

-- Policy 1: Allow chatbot owners to manage (all operations) their content sources
CREATE POLICY "Chatbot owners can manage their content sources"
ON public.chatbot_content_sources
FOR ALL
USING (
    -- Check if the user owns the chatbot that this content source belongs to
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_content_sources.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
)
WITH CHECK (
    -- Same check for INSERT/UPDATE operations
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_content_sources.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
);

-- Policy 2: Allow anyone (including anonymous users) to READ content sources for public chatbots
CREATE POLICY "Public chatbot content sources are readable by anyone"
ON public.chatbot_content_sources
FOR SELECT
USING (
    -- Allow reading if the chatbot is public or shared (not private)
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_content_sources.chatbot_id 
        AND chatbots.visibility IN ('public', 'shared')
    )
);

-- Policy 3: Allow users with permissions to READ content sources for shared chatbots
CREATE POLICY "Shared chatbot content sources are readable by permitted users"
ON public.chatbot_content_sources
FOR SELECT
USING (
    -- Allow reading if user has permission to access the chatbot
    auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chatbot_permissions 
        WHERE chatbot_permissions.chatbot_id = chatbot_content_sources.chatbot_id 
        AND chatbot_permissions.user_id = auth.uid()
    )
); 