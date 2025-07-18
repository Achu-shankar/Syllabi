-- Fix RLS policies to allow chatbot owners to view analytics for all users
-- This allows analytics to show data from all users (registered + anonymous) for chatbots they own

-- ================================================
-- CHAT SESSIONS: Add policy for chatbot owners to view all sessions
-- ================================================

CREATE POLICY "Chatbot owners can view all sessions for their chatbots"
ON public.chat_sessions
FOR SELECT
USING (
    -- Allow if the user owns the chatbot that this session belongs to
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chat_sessions.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
);

-- ================================================
-- MESSAGES: Add policy for chatbot owners to view all messages
-- ================================================

CREATE POLICY "Chatbot owners can view all messages for their chatbots"
ON public.messages
FOR SELECT
USING (
    -- Allow if the user owns the chatbot that this message's session belongs to
    EXISTS (
        SELECT 1 FROM public.chatbots 
        JOIN public.chat_sessions ON chatbots.id = chat_sessions.chatbot_id
        WHERE chat_sessions.id = messages.chat_session_id 
        AND chatbots.user_id = auth.uid()
    )
);

-- ================================================
-- VERIFICATION QUERIES (Optional - run these to test)
-- ================================================

-- Check current policies on chat_sessions
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'chat_sessions';

-- Check current policies on messages  
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'messages';

-- ================================================
-- NOTES
-- ================================================
-- These policies work alongside existing policies:
-- 1. Users can still view their own sessions/messages (existing policy)
-- 2. Anonymous users can still create sessions/messages (existing policy)  
-- 3. NOW: Chatbot owners can view ALL sessions/messages for their chatbots (new policy)
-- 
-- This enables proper analytics while maintaining security for other operations. 